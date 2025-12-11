from fastapi import FastAPI, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
import uvicorn
import os
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timedelta
import jwt
import bcrypt
from fastapi.responses import FileResponse


# ---------- Config ----------
JWT_SECRET = os.environ.get("JWT_SECRET", "change_this_secret_in_prod")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 10

# ---------- Pydantic model ----------
class SignupModel(BaseModel):
    firstName: str = Field(..., min_length=2, max_length=30)
    lastName: str = Field(..., min_length=1, max_length=30)
    age: int = Field(..., ge=1, le=120)
    email: EmailStr
    password: str = Field(..., min_length=6)
    mobileNo: str = Field(..., min_length=10, max_length=15)
    profilePic: str  # we will store file path as string

# ---------- App & CORS ----------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Serve React build folder
app.mount("/", StaticFiles(directory="client/build", html=True), name="client")

# ---------- MongoDB ----------
mongo_client = AsyncIOMotorClient(
    "mongodb+srv://manjunadhb:manjunadhb@python1.onzt6el.mongodb.net/?appName=python1"
)
db = mongo_client["brn_students"]
users_coll = db["users"]

# ---------- Upload folder ----------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse("client/build/index.html")



# ---------- Signup endpoint ----------
@app.post("/signup")
async def signup(request: Request):
    """
    Accepts:
    - application/json
    - application/x-www-form-urlencoded
    - multipart/form-data (can include files)
    Saves any files to 'uploads/' and stores file path in MongoDB.
    """
    content_type = request.headers.get("content-type", "")

    # 1) Read body according to content type
    if "application/json" in content_type:
        data = await request.json()

    elif "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        data = {}

        for key, value in form.items():
            # If it's a file (image, zip, audio, video, etc.)
            print(key, type(value), value)   # DEBUG
            if hasattr(value, "filename") and hasattr(value, "file"):
                # treat as file
                file_path = os.path.join(UPLOAD_DIR, value.filename)
                file_bytes = await value.read()
                with open(file_path, "wb") as f:
                    f.write(file_bytes)

                data[key] = file_path
            else:
                # Normal text field
                data[key] = value

    else:
        return {"error": "Unsupported content type"}

    # 2) Validate with Pydantic
    try:
        valid = SignupModel(**data)
    except ValidationError as ve:
        # VERY IMPORTANT: use ve.errors() (with parentheses)
        return {"error": "Validation failed", "details": ve.errors()}
    
     # 3) Hash the password before saving
    hashed_pw = bcrypt.hashpw(valid.password.encode("utf-8"), bcrypt.gensalt())


    # 4) Insert into MongoDB
    doc = valid.model_dump()  # VERY IMPORTANT: use dict() (with parentheses)
    doc["password"] = hashed_pw.decode("utf-8")  # store hash as string

    result = await users_coll.insert_one(doc)

    return {"msg": "Signup successful", "inserted_id": str(result.inserted_id)}



# ---------- Login endpoint (form-data as client uses FormData) ----------
@app.post("/login")
async def login(request: Request):
    """
    Expects form-data only (your client sends FormData):
      - email
      - password

    Success response:
    {
      "status": "success",
      "data": {
         "token": "<jwt>",
         "user": { ... user document without password ... }
      }
    }

    Failure response:
    { "status": "failure", "msg": "invalid username or password" }
    """
    content_type = request.headers.get("content-type", "") or ""

    # Accept form-data or urlencoded (client uses multipart/form-data via FormData)
    #This condition satisfies as client is sending login details in form-data
    if not ("multipart/form-data" in content_type):
        return {"status": "failure", "msg": "invalid content-type"}

    form = await request.form()
    email = form.get("email")
    # Get password from form, typed by user
    password = form.get("password")

    if not email or not password:
        return {"status": "failure", "msg": "No email or password provided"}

    # Find user by email
    user = await users_coll.find_one({"email": email})
    

    if not user:
        return {"status": "failure", "msg": "invalid username"}


    # Passord stored in DB
    stored_hash = user.get("password")
    if not stored_hash:
        return {"status": "failure", "msg": "invalid password"}

    # bcrypt expects bytes
    password_bytes = password.encode("utf-8")
    stored_hash_bytes = stored_hash.encode("utf-8")

    if not bcrypt.checkpw(password_bytes, stored_hash_bytes):
        return {"status": "failure", "msg": "invalid password"}



    # Prepare user object for response (remove password)
    user_id = str(user.get("_id"))
    # Remove password before sending user object to client
    user.pop("password", None)
    user["_id"] = user_id

    # Create JWT token
    payload = {
        "user_id": user_id,
        "email": user.get("email"),
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

    return {"status": "success", "data": {"token": token, "user": user}}


# ---------- Update Profile endpoint ----------
@app.put("/updateProfile")
async def update_profile(request: Request):
    """
    Expects multipart/form-data (your client sends FormData):
      - firstName
      - lastName
      - email   (used to find the user)
      - age
      - password
      - mobileNo
      - profilePic (optional file)

    Response:
      { "status": "success", "msg": "Profile updated successfully" }
      or
      { "status": "failure", "msg": "..." }
    """
    content_type = request.headers.get("content-type", "") or ""

    if "multipart/form-data" not in content_type:
        return {"status": "failure", "msg": "invalid content-type"}

    form = await request.form()
    data = {}

    # Read form fields + handle file upload (similar to /signup)
    for key, value in form.items():
        # If it's a file-like object (UploadFile)
        if hasattr(value, "filename") and hasattr(value, "file"):
            if value.filename:  # file actually selected
                file_path = os.path.join(UPLOAD_DIR, value.filename)
                file_bytes = await value.read()
                with open(file_path, "wb") as f:
                    f.write(file_bytes)

                data[key] = file_path
            else:
                # No new file selected; just ignore this field
                continue
        else:
            data[key] = value

    # Email is mandatory to find the existing user
    email = data.get("email")
    if not email:
        return {"status": "failure", "msg": "email is required to update profile"}

    # Fetch existing user
    existing_user = await users_coll.find_one({"email": email})
    if not existing_user:
        return {"status": "failure", "msg": "user not found"}

    # If profilePic is not in data (no new upload), keep old one
    if "profilePic" not in data and "profilePic" in existing_user:
        data["profilePic"] = existing_user["profilePic"]

    # If password is not provided / empty, keep old password
    # (your client always sends password, but this makes it safer)
    if not data.get("password"):
        data["password"] = existing_user.get("password", "")
        # If we kept the old hash as-is, skip hashing again
        skip_hash = True
    else:
        skip_hash = False

    # Validate with Pydantic (reusing SignupModel)
    try:
        valid = SignupModel(**data)
    except ValidationError as ve:
        return {"status": "failure", "msg": "Validation failed", "details": ve.errors()}

    # Prepare update document
    update_doc = valid.model_dump()

    # Hash password only if user typed a new one
    if skip_hash:
        # existing_user already has hashed password
        update_doc["password"] = existing_user.get("password", "")
    else:
        hashed_pw = bcrypt.hashpw(valid.password.encode("utf-8"), bcrypt.gensalt())
        update_doc["password"] = hashed_pw.decode("utf-8")

    # Update user in MongoDB
    result = await users_coll.update_one(
        {"email": email},
        {"$set": update_doc}
    )

    if result.matched_count == 0:
        return {"status": "failure", "msg": "user not found for update"}

    return {"status": "success", "msg": "Profile updated successfully"}




@app.delete("/deleteProfile")
async def delete_profile(email: str):
    """
    DELETE /deleteProfile?email=someone@example.com

    Response (success):
      {
        "status": "success",
        "msg": "Profile deleted successfully"
      }

    Response (failure):
      {
        "status": "failure",
        "msg": "user not found"
      }
    """

    if not email:
        return {"status": "failure", "msg": "email is required"}

    # Find user first (optional, but useful if you later want to delete profilePic file)
    existing_user = await users_coll.find_one({"email": email})
    if not existing_user:
        return {"status": "failure", "msg": "user not found"}

    # OPTIONAL: delete profilePic file from disk if you want
    # profile_pic_path = existing_user.get("profilePic")
    # if profile_pic_path and os.path.exists(profile_pic_path):
    #     try:
    #         os.remove(profile_pic_path)
    #     except Exception as e:
    #         # you can log this error if needed, but don't block delete on it
    #         print("Error deleting file:", e)

    # Delete user from MongoDB
    result = await users_coll.delete_one({"email": email})

    if result.deleted_count == 0:
        return {"status": "failure", "msg": "user not found"}

    return {"status": "success", "msg": "Profile deleted successfully"}



# ---------- Main ----------
def main():
    uvicorn.run(app, host="localhost", port=8000)

if __name__ == "__main__":
    main()

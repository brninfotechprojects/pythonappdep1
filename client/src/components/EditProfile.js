import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopNavigation from "./TopNavigation";
import { useSelector } from "react-redux";

function EditProfile() {
  let firstNameInputRef = useRef();
  let lastNameInputRef = useRef();
  let ageInputRef = useRef();
  let emailInputRef = useRef();
  let passwordInputRef = useRef();
  let mobileNoInputRef = useRef();
  let profilePicInputRef = useRef();
  let [profilePicPath, setProfilePicPath] = useState("./images/nopic.png");

  let storeObj = useSelector((store) => {
    return store.loginReducer;
  });

  useEffect(() => {
    firstNameInputRef.current.value = storeObj.loginDetails.user.firstName;
    lastNameInputRef.current.value = storeObj.loginDetails.user.lastName;
    ageInputRef.current.value = storeObj.loginDetails.user.age;
    emailInputRef.current.value = storeObj.loginDetails.user.email;
    mobileNoInputRef.current.value = storeObj.loginDetails.user.mobileNo;
    setProfilePicPath(`/${storeObj.loginDetails.user.profilePic}`);
    //ageInputRef.current.value = storeObj.loginDetails.age;
  }, []);

  let onSubmitUsingFormData = async () => {
    let dataToSend = new FormData();
    dataToSend.append("firstName", firstNameInputRef.current.value);
    dataToSend.append("lastName", lastNameInputRef.current.value);
    dataToSend.append("email", emailInputRef.current.value);
    dataToSend.append("age", ageInputRef.current.value);
    dataToSend.append("password", passwordInputRef.current.value);
    dataToSend.append("mobileNo", mobileNoInputRef.current.value);

    for (let i = 0; i < profilePicInputRef.current.files.length; i++) {
      dataToSend.append("profilePic", profilePicInputRef.current.files[i]);
    }

    let reqOptions = {
      method: "PUT",
      body: dataToSend,
    };

    let JSONData = await fetch("/updateProfile", reqOptions);

    let JSOData = await JSONData.json();

    console.log(JSOData);

    alert(JSOData.msg);
  };

  return (
    <div className="App">
      <TopNavigation />
      <form>
        <h2>Edit Profile</h2>
        <div>
          <label>First Name</label>
          <input ref={firstNameInputRef}></input>
        </div>
        <div>
          <label>Last Name</label>
          <input ref={lastNameInputRef}></input>
        </div>
        <div>
          <label>Age</label>
          <input ref={ageInputRef}></input>
        </div>
        <div>
          <label>Email</label>
          <input ref={emailInputRef} readOnly></input>
        </div>
        <div>
          <label>Password</label>
          <input ref={passwordInputRef}></input>
        </div>
        <div>
          <label>MobileNo</label>
          <input ref={mobileNoInputRef}></input>
        </div>
        <div>
          <label>Profile Pic</label>
          <input
            ref={profilePicInputRef}
            type="file"
            onChange={(event) => {
              let selectedPicPath = URL.createObjectURL(event.target.files[0]);

              setProfilePicPath(selectedPicPath);
            }}
          ></input>
        </div>
        <div>
          <img className="profiePicPreview" src={profilePicPath}></img>
        </div>
        <div>
          <br></br>
          <button
            type="button"
            onClick={() => {
              onSubmitUsingFormData();
            }}
          >
            Update Profile
          </button>
        </div>
      </form>
      <div>
        <Link to="/">Login</Link>
      </div>
    </div>
  );
}

export default EditProfile;

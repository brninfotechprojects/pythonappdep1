import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

function Signup() {
  let firstNameInputRef = useRef();
  let lastNameInputRef = useRef();
  let ageInputRef = useRef();
  let emailInputRef = useRef();
  let passwordInputRef = useRef();
  let mobileNoInputRef = useRef();
  let profilePicInputRef = useRef();
  let [profilePicPath, setProfilePicPath] = useState("./images/nopic.png");

  let onSubmitUsingJSON = async () => {
    let dataToSend = {
      firstName: firstNameInputRef.current.value,
      lastName: lastNameInputRef.current.value,
      age: ageInputRef.current.value,
      email: emailInputRef.current.value,
      password: passwordInputRef.current.value,
      mobileNo: mobileNoInputRef.current.value,
      profilePic: profilePicInputRef.current.value,
    };

    let dataToSendJSON = JSON.stringify(dataToSend);

    let myHeader = new Headers();
    myHeader.append("content-type", "application/json");

    let reqOptions = {
      method: "POST",
      body: dataToSendJSON,
      headers: myHeader,
    };

    let JSONData = await fetch("http://localhost:8000/signup", reqOptions);

    let JSOData = await JSONData.json();

    console.log(JSOData);
    alert(JSOData.msg);
  };

  let onSubmitUsingURLEncoded = async () => {
    let dataToSend = new URLSearchParams();
    dataToSend.append("firstName", firstNameInputRef.current.value);
    dataToSend.append("lastName", lastNameInputRef.current.value);
    dataToSend.append("age", ageInputRef.current.value);
    dataToSend.append("email", emailInputRef.current.value);
    dataToSend.append("password", passwordInputRef.current.value);
    dataToSend.append("mobileNo", mobileNoInputRef.current.value);
    dataToSend.append("profilePic", profilePicInputRef.current.value);

    let myHeader = new Headers();
    myHeader.append("content-type", "application/x-www-form-urlencoded");

    let reqOptions = {
      method: "POST",
      body: dataToSend,
      headers: myHeader,
    };

    let JSONData = await fetch("http://localhost:8000/signup", reqOptions);

    let JSOData = await JSONData.json();

    console.log(JSOData);

    alert(JSOData.msg);
  };

  let onSubmitUsingFormData = async () => {
    let dataToSend = new FormData();
    dataToSend.append("firstName", firstNameInputRef.current.value);
    dataToSend.append("lastName", lastNameInputRef.current.value);
    dataToSend.append("age", ageInputRef.current.value);
    dataToSend.append("email", emailInputRef.current.value);
    dataToSend.append("password", passwordInputRef.current.value);
    dataToSend.append("mobileNo", mobileNoInputRef.current.value);

    for (let i = 0; i < profilePicInputRef.current.files.length; i++) {
      dataToSend.append("profilePic", profilePicInputRef.current.files[i]);
    }

    let reqOptions = {
      method: "POST",
      body: dataToSend,
    };

    let JSONData = await fetch("http://localhost:8000/signup", reqOptions);

    let JSOData = await JSONData.json();

    console.log(JSOData);

    alert(JSOData.msg);
  };

  return (
    <div className="App">
      <form>
        <h2>Signup</h2>
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
          <input ref={emailInputRef}></input>
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
          <button
            type="button"
            onClick={() => {
              onSubmitUsingJSON();
            }}
          >
            Submit Using JSON
          </button>
          <br></br>
          <button
            type="button"
            onClick={() => {
              onSubmitUsingURLEncoded();
            }}
          >
            Submit Using URLEncoded
          </button>

          <br></br>
          <button
            type="button"
            onClick={() => {
              onSubmitUsingFormData();
            }}
          >
            Submit Using FormData
          </button>
        </div>
      </form>
      <div>
        <Link to="/">Login</Link>
      </div>
    </div>
  );
}

export default Signup;

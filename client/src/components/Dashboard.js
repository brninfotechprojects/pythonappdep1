import React from "react";
import { useDispatch, useSelector } from "react-redux";
import TopNavigation from "./TopNavigation";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  let navigate = useNavigate();
  let dispatch = useDispatch();

  let storeObj = useSelector((store) => {
    console.log(store);
    return store.loginReducer;
  });

  let deleteProfile = async () => {
    let reqOptions = {
      method: "DELETE",
    };

    let url = `http://localhost:8000/deleteProfile?email=${storeObj.loginDetails.user.email}`;

    let JSONData = await fetch(url, reqOptions);

    let JSOData = await JSONData.json();

    console.log(JSOData.msg);
    alert(JSOData.msg);

    if (JSOData.status == "success") {
      navigate("/");
    }
  };

  return (
    <div>
      <TopNavigation />
      <h2>Dashboard</h2>
      <h3>
        {storeObj.loginDetails.user.firstName}
        {storeObj.loginDetails.user.lastName}
        <button
          onClick={() => {
            deleteProfile();
          }}
        >
          Delete Profile
        </button>
      </h3>
      <br></br>
      <button
        onClick={() => {
          dispatch({ type: "applyLeave", data: 1 });
        }}
      >
        Apply Leave
      </button>
      <button
        onClick={() => {
          dispatch({ type: "cancelLeave", data: 2 });
        }}
      >
        Cancel Leave
      </button>
      <button
        onClick={() => {
          dispatch({ type: "addTask", data: 3 });
        }}
      >
        Add Task
      </button>
      <button
        onClick={() => {
          dispatch({ type: "submitTask", data: 4 });
        }}
      >
        Submit Task
      </button>
      <button
        onClick={() => {
          dispatch({ type: "hireEmployee", data: 5 });
        }}
      >
        Hire Employee
      </button>
      <button
        onClick={() => {
          dispatch({ type: "fireEmployee", data: 6 });
        }}
      >
        Fire Employee
      </button>
      <img
        src={`http://localhost:8000/${storeObj.loginDetails.user.profilePic}`}
      ></img>
    </div>
  );
}

export default Dashboard;

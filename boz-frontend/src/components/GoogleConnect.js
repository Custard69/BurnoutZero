import React from "react";

import { getAuth } from "firebase/auth";

const GoogleConnect = () => {
  const connectGoogle = () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert("Please log in first");
      return;
    }
    window.location.href = `http://localhost:5000/auth/google?user_id=${userId}`;
  };

  return (
    <button
      onClick={connectGoogle}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
    >
      Connect Google Calendar
    </button>
  );
};


export default GoogleConnect;

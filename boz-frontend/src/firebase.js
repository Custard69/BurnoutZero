import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZ9xDCJF2GW-Hd5gctkLCL4VZr-Pb_HPY",
  authDomain: "burnoutzero-fa51b.firebaseapp.com",
  projectId: "burnoutzero-fa51b",
  storageBucket: "burnoutzero-fa51b.firebasestorage.app",
  messagingSenderId: "739058799652",
  appId: "1:739058799652:web:e61855df758148a891b4b1",
  measurementId: "G-0GRSWQZ8M4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

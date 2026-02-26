// firebase/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // <--- Add this import
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEpz1vDRpe6JXonyQMpLZQunsvV7DLaK0",
  authDomain: "campusflow-372c6.firebaseapp.com",
  projectId: "campusflow-372c6",
  storageBucket: "campusflow-372c6.appspot.com",
  messagingSenderId: "962317562696",
  appId: "1:962317562696:web:4c9b245bb2c51d3512397d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Auth
const auth = getAuth(app);

export { app, auth, db };

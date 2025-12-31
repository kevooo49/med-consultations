// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCOBUTHY9Fgq8b-hj8u0kN5w7EUytGiB14",
  authDomain: "med-consultations.firebaseapp.com",
  projectId: "med-consultations",
  storageBucket: "med-consultations.firebasestorage.app",
  messagingSenderId: "742435994386",
  appId: "1:742435994386:web:0e9345e5ebf537a54051cb",
  measurementId: "G-D2X7H66ZW7",
  databaseURL: "https://med-consultations-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDBVlm47vdBVr9lpTkLlA2T_rJL1IBXaxM",
    authDomain: "khoa-e07d9.firebaseapp.com",
    projectId: "khoa-e07d9",
    storageBucket: "khoa-e07d9.appspot.com",
    messagingSenderId: "118227246992",
    appId: "1:118227246992:web:b62dbc30ac633f09171d15",
    measurementId: "G-GDK0J2NB6J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

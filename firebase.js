import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyA2Hio3_rDDLpeW9M81KYflmOJoP6kj7lg",
    authDomain: "courseonline-6050b.firebaseapp.com",
    projectId: "courseonline-6050b",
    storageBucket: "courseonline-6050b.appspot.com",
    messagingSenderId: "143441589699",
    appId: "1:143441589699:web:a09a3753cda3c53ebb7976",
    measurementId: "G-YSZG9SZQ1L"
  };

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore và Authentication
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
export { db, auth, storage };
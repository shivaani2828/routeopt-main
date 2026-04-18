import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCJG2KckYwDkxCvQN4WNlcbfB-mSVPUoL4",
  authDomain: "routeopt-991c5.firebaseapp.com",
  projectId: "routeopt-991c5",
  storageBucket: "routeopt-991c5.firebasestorage.app",
  messagingSenderId: "912616627828",
  appId: "1:912616627828:web:89a689d8a2d86843d1bb21",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
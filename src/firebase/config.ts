import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBDROX8FiIGlJAE4NQlseqTmTlTgTUjjGw",
    authDomain: "campus3d-c9386.firebaseapp.com",
    projectId: "campus3d-c9386"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyASSSem5YOxfprl0mDag6tVnvsW_YEHiEY",
    authDomain: "dev-deakin-d2.firebaseapp.com",
    projectId: "dev-deakin-d2",
    storageBucket: "dev-deakin-d2.firebasestorage.app",
    messagingSenderId: "360936985259",
    appId: "1:360936985259:web:0e8148f616b19027949dee",
    measurementId: "G-8MWNQRDVT4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

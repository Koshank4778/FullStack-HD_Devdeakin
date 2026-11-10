import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBNqYBbuQVSxz2b8djAhVIobi1zhpb-4OA",
    authDomain: "dev-deakin-hd.firebaseapp.com",
    projectId: "dev-deakin-hd",
    storageBucket: "dev-deakin-hd.firebasestorage.app",
    messagingSenderId: "15577926815",
    appId: "1:15577926815:web:1417bf9a0a68364c3726aa",
    measurementId: "G-1NFNXTL7HP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

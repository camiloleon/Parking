import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqpifk6obChJRn62d7OU9nI-xYNl08UeM",
  authDomain: "parksanjoseph.firebaseapp.com",
  projectId: "parksanjoseph",
  storageBucket: "parksanjoseph.firebasestorage.app",
  messagingSenderId: "143939796752",
  appId: "1:143939796752:web:4734e45a168a6c19bfaf95"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

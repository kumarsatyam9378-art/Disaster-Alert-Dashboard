// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

//web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMPT3gmJj1doOxgjH_dhUw6E_pYAvWTXw",
  authDomain: "disaster-alert-dashboard-05.firebaseapp.com",
  projectId: "disaster-alert-dashboard-05",
  storageBucket: "disaster-alert-dashboard-05.firebasestorage.app",
  messagingSenderId: "724658185867",
  appId: "1:724658185867:web:45ed4758720f116ad0d68e",
  measurementId: "G-28W6KS2W6Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics
const analytics = getAnalytics(app);

// Firestore
const db = getFirestore(app);

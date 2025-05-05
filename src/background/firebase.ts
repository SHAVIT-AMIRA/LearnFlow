import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Explicitly define the Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_KEY || "test-api-key",
  authDomain: import.meta.env.VITE_FB_DOMAIN || "test-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT || "test-project",
  storageBucket: import.meta.env.VITE_FB_BUCKET || "test-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FB_SENDER || "1234567890",
  appId: import.meta.env.VITE_FB_APPID || "1:1234567890:web:abc123def456"
};

// Initialize Firebase with explicit config
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const fs = getFirestore(app);
import {
  initializeApp, FirebaseApp, getApps
} from "firebase/app";
import { 
  User,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  onAuthStateChanged
} from "firebase/auth";
import { initializeAuth, Auth } from "firebase/auth/web-extension";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { bus } from "./broadcast";

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _fns: Functions | null = null;

export function initFirebase(): void {
  // Exit early if already initialized
  if (_app) return;

  try {
    if (getApps().length) {
      _app = getApps()[0];
    } else {
      _app = initializeApp({
        apiKey: import.meta.env.VITE_FB_KEY,
        authDomain: import.meta.env.VITE_FB_AUTH,
        projectId: import.meta.env.VITE_FB_PROJECT,
        storageBucket: import.meta.env.VITE_FB_BUCKET,
        messagingSenderId: import.meta.env.VITE_FB_SENDER,
        appId: import.meta.env.VITE_FB_APPID,
        // Remove measurementId to avoid initializing analytics
      });
    }

    // Initialize auth with persistence
    _auth = initializeAuth(_app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence]
    });
    
    // Listen for auth state changes and broadcast to all contexts
    onAuthStateChanged(_auth, (user: User | null) => {
      console.log("[Firebase] Auth state changed:", user?.email || "No user");
      bus.emit("AUTH_STATE_CHANGED", { 
        isAuthenticated: !!user,
        email: user?.email || null 
      });
    });
    
    // Initialize other services
    _db = getFirestore(_app);
    _fns = getFunctions(_app, "europe-west1");
    
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Don't set _app, _auth, etc. if initialization fails
  }
}

// Add null checks to all service accessors
export const auth = (): Auth | null => _auth;
export const db = (): Firestore | null => _db;
export const fns = (): Functions | null => _fns;

/**
 * Authentication helpers for Chrome extension
 * Using chrome.identity API with Firebase
 */
import { 
  signInWithCredential, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * Sign in using Chrome's identity API (silent if possible)
 */
export async function signInWithChrome(): Promise<void> {
  const authInstance = auth;
  if (!authInstance) {
    throw new Error("Firebase auth not initialized");
  }

  try {
    // First try to get a token silently (no UI)
    const token = await getChromeAuthToken(false);
    
    if (token) {
      console.log("[Auth] Got silent token, signing in");
      const credential = GoogleAuthProvider.credential(null, token);
      await signInWithCredential(authInstance, credential);
      return;
    }
    
    // If silent token failed, try interactive
    console.log("[Auth] No silent token, trying interactive");
    const interactiveToken = await getChromeAuthToken(true);
    
    if (interactiveToken) {
      const credential = GoogleAuthProvider.credential(null, interactiveToken);
      await signInWithCredential(authInstance, credential);
      console.log("[Auth] Signed in with interactive token");
    } else {
      throw new Error("Failed to get token even with interactive mode");
    }
  } catch (error) {
    console.error("[Auth] Chrome identity error:", error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const authInstance = auth;
  if (!authInstance) {
    throw new Error("Firebase auth not initialized");
  }
  
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
    console.log("[Auth] Email/password sign-in successful");
  } catch (error) {
    console.error("[Auth] Email sign-in error:", error);
    throw error;
  }
}

/**
 * Create a new account with email and password
 */
export async function createUserWithEmail(email: string, password: string): Promise<void> {
  const authInstance = auth;
  if (!authInstance) {
    throw new Error("Firebase auth not initialized");
  }
  
  try {
    await createUserWithEmailAndPassword(authInstance, email, password);
    console.log("[Auth] User account created successfully");
  } catch (error) {
    console.error("[Auth] User account creation error:", error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  const authInstance = auth;
  if (!authInstance) {
    throw new Error("Firebase auth not initialized");
  }
  
  try {
    await signOut(authInstance);
    console.log("[Auth] Sign-out successful");
  } catch (error) {
    console.error("[Auth] Sign-out error:", error);
    throw error;
  }
}

/**
 * Helper to get Chrome authentication token
 */
async function getChromeAuthToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.warn("[Auth] Chrome identity error:", chrome.runtime.lastError.message);
        resolve(null); // Don't reject on error, resolve with null
      } else {
        // Ensure token is a string and not undefined
        resolve(typeof token === 'string' ? token : null);
      }
    });
  });
} 
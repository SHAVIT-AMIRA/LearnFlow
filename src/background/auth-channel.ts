import { BroadcastChannel } from 'broadcast-channel';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// יצירת ערוץ ברודקאסט להפצת שינויי אימות
export const authChannel = new BroadcastChannel('auth');

// מבנה מצב האימות להפצה
export interface AuthState {
  isAuth: boolean;
  uid: string | null;
  email: string | null;
  displayName: string | null;
}

// פונקציה להפעלת האזנה לשינויי אימות והפצתם
export function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    // מצב האימות העדכני
    const authState: AuthState = {
      isAuth: !!user,
      uid: user?.uid ?? null,
      email: user?.email ?? null,
      displayName: user?.displayName ?? null
    };
    
    // 1. שמירה ב-storage המקומי לזיהוי מיידי בטעינה
    chrome.storage.local.set({ authState });
    
    // 2. שידור לכל הקונטקסטים
    authChannel.postMessage(authState);
    
    console.log('Auth state changed:', authState.isAuth ? 'Authenticated' : 'Not authenticated');
  });
}

// פונקציה להרצה בקונטקסט של content-script או popup 
// כדי לקרוא את מצב האימות הנוכחי מה-storage
export async function getAuthStateFromStorage(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get('authState');
  return result.authState || null;
} 
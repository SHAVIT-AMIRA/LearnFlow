import { useState, useEffect } from 'react';
import { BroadcastChannel } from 'broadcast-channel';
import { AuthState, getAuthStateFromStorage } from '../../background/auth-channel';

/**
 * הוק להאזנה לשינויים במצב האימות מה-service-worker
 * 
 * מאזין לשינויים דרך BroadcastChannel ו-chrome.storage.onChanged
 */
export function useAuthListener() {
  // מצב ראשוני - לא מאומת
  const [authState, setAuthState] = useState<AuthState>({
    isAuth: false,
    uid: null,
    email: null,
    displayName: null
  });
  
  useEffect(() => {
    // יצירת ערוץ האזנה
    const authChannel = new BroadcastChannel('auth');
    
    // פונקציה לעדכון מצב האימות
    const updateAuthState = (newState: AuthState) => {
      console.log('Auth state updated:', newState.isAuth ? 'Authenticated' : 'Not authenticated');
      setAuthState(newState);
    };
    
    // האזנה לשינויים בערוץ
    authChannel.onmessage = (message) => {
      updateAuthState(message as AuthState);
    };
    
    // האזנה לשינויים ב-chrome.storage
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.authState?.newValue) {
        updateAuthState(changes.authState.newValue);
      }
    };
    
    chrome.storage.onChanged.addListener(storageListener);
    
    // קריאה ראשונית של מצב האימות מה-storage
    getAuthStateFromStorage().then(state => {
      if (state) {
        updateAuthState(state);
      }
    });
    
    // ניקוי המאזינים בעת unmount
    return () => {
      authChannel.close();
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);
  
  return authState;
} 
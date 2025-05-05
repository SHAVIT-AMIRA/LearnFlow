import { useLiveQuery } from 'dexie-react-hooks';
import { Word, Note, ChatMessage, db } from '../../background/db';
import { v4 as uuidv4 } from 'uuid';
import { BroadcastChannel } from 'broadcast-channel';
import { useEffect } from 'react';

// ערוץ להאזנה לעדכוני DB משותפים
const dbSyncChannel = new BroadcastChannel('db-sync');

/**
 * הוק לקבלת מילים של משתמש מסוים בזמן אמת
 */
export function useWords(userId: string | null) {
  if (!userId) return [];
  
  // liveQuery - מקשיב לשינויים ב-IndexedDB באופן אוטומטי
  return useLiveQuery(
    // שולף את כל המילים של המשתמש הנוכחי ממויינות לפי תאריך יצירה יורד
    () => db.words.where('userId').equals(userId).reverse().sortBy('ts'),
    // תלויות - אם uid משתנה, רץ מחדש
    [userId],
    // ערך ברירת מחדל עד שמגיע החיפוש
    []
  );
}

/**
 * הוק לקבלת הערות של משתמש מסוים בזמן אמת
 */
export function useNotes(userId: string | null) {
  if (!userId) return [];
  
  return useLiveQuery(
    () => db.notes.where('userId').equals(userId).reverse().sortBy('ts'),
    [userId],
    []
  );
}

/**
 * הוק לקבלת הודעות צ'אט של משתמש מסוים בזמן אמת
 */
export function useChatMessages(userId: string | null) {
  if (!userId) return [];
  
  return useLiveQuery(
    () => db.chatMessages.where('userId').equals(userId).reverse().sortBy('ts'),
    [userId],
    []
  );
}

/**
 * הוק לקבלת סטטיסטיקות של משתמש מסוים בזמן אמת
 */
export function useStats(userId: string | null) {
  if (!userId) return null;
  
  return useLiveQuery(
    () => db.userStats.get(userId),
    [userId],
    null
  );
}

/**
 * הוק עזר להוספת מילה חדשה באמצעות service-worker
 */
export function useAddWord() {
  return (userId: string | null, term: string, definition?: string) => {
    if (!userId) return Promise.reject(new Error('No user ID provided'));
    
    const id = uuidv4();
    
    // שליחת הבקשה ל-service-worker
    return chrome.runtime.sendMessage({
      type: 'ADD_WORD',
      payload: { id, term, definition }
    });
  };
}

/**
 * הוק עזר להוספת הערה חדשה באמצעות service-worker
 */
export function useAddNote() {
  return (userId: string | null, content: string) => {
    if (!userId) return Promise.reject(new Error('No user ID provided'));
    
    const id = uuidv4();
    
    return chrome.runtime.sendMessage({
      type: 'ADD_NOTE',
      payload: { id, content }
    });
  };
}

/**
 * הוק עזר להוספת הודעת צ'אט חדשה באמצעות service-worker
 */
export function useAddChatMessage() {
  return (userId: string | null, content: string, role: 'user' | 'assistant' = 'user') => {
    if (!userId) return Promise.reject(new Error('No user ID provided'));
    
    const id = uuidv4();
    
    return chrome.runtime.sendMessage({
      type: 'ADD_CHAT',
      payload: { id, content, role }
    });
  };
}

/**
 * הוק לבקשת סנכרון מיידי מ-service-worker
 */
export function useSyncRequest() {
  return () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'SYNC_REQ' },
        (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  };
}

/**
 * הוק עזר להאזנה לשינויים ב-DB מרחוק
 */
export function useDbSyncListener() {
  useEffect(() => {
    const handleDbSync = (event: any) => {
      console.log('DB sync event received:', event.type, event.data);
      // אפשר לבצע פעולות נוספות כאן לפי סוג העדכון
    };
    
    dbSyncChannel.onmessage = handleDbSync;
    
    return () => {
      dbSyncChannel.close();
    };
  }, []);
} 
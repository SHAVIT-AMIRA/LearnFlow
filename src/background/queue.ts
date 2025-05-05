import { v4 as uuidv4 } from 'uuid';
import { auth } from './firebase';
import { db, QueueItem } from './db';
import { ActionType } from './bus';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

// גישה לפיירסטור
const firestore = getFirestore();

// מערך התור לפעולות בזיכרון
const queue: QueueItem[] = [];

// זמן המתנה בין ניסיונות חוזרים (מילישניות)
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // עד 1 דקה

/**
 * מוסיף פעולה לתור עם אחסון באינדקסד-די-בי ושידור מיידי לפיירבייס
 */
export function queueWrite(actionType: ActionType, payload: unknown) {
  // וידוא שהמשתמש מחובר
  if (!auth.currentUser) {
    throw new Error('User must be authenticated');
  }

  const userId = auth.currentUser.uid;
  const id = uuidv4();
  const ts = Date.now();

  // יצירת פריט התור
  const queueItem: QueueItem = {
    id,
    userId,
    action: actionType,
    payload,
    attempts: 0,
    ts
  };

  // 1. שמירה ב-IndexedDB
  db.queue.put(queueItem).then(() => {
    console.log(`Added ${actionType} to queue with id ${id}`);
  });

  // 2. הוספה לתור בזיכרון
  queue.push(queueItem);

  // 3. ניסיון שידור מיידי (אם מחובר)
  flush();
}

/**
 * מנקה את התור - מנסה לשלוח את הפריטים לפיירבייס
 */
export async function flush() {
  // אם אין חיבור לאינטרנט או אין פריטים בתור - לא עושים כלום
  if (!navigator.onLine || queue.length === 0) {
    return;
  }

  // לוקחים את הפריט הראשון מהתור
  const item = queue.shift();
  if (!item) return;

  try {
    await processQueueItem(item);
    
    // מחיקה מהתור ב-DB לאחר שידור מוצלח
    await db.queue.delete(item.id);
    
    // המשך עם הפריט הבא
    flush();
  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);
    
    // הגדלת מונה הניסיונות
    item.attempts++;
    
    // אם עדיין יש ניסיונות, מחזירים לתור עם השהייה
    if (item.attempts < RETRY_DELAYS.length) {
      // עדכון הרשומה ב-IndexedDB
      await db.queue.update(item.id, { attempts: item.attempts });
      
      // דחיית הניסיון הבא
      const delay = RETRY_DELAYS[item.attempts - 1];
      console.log(`Will retry item ${item.id} in ${delay}ms (attempt ${item.attempts})`);
      
      // דחיפה בחזרה לתור לאחר השהייה
      setTimeout(() => {
        queue.push(item);
        flush();
      }, delay);
    } else {
      console.error(`Max retries reached for item ${item.id}, removing from queue`);
      
      // מחיקה מהתור לאחר מיצוי ניסיונות
      await db.queue.delete(item.id);
      
      // המשך לפריט הבא
      flush();
    }
  }
}

/**
 * מעבד פריט בודד מהתור - שולח לפיירבייס לפי סוג הפעולה
 */
async function processQueueItem(item: QueueItem): Promise<void> {
  const { action, payload, userId } = item;
  
  switch (action) {
    case 'ADD_WORD': {
      const word = payload as { id: string; term: string; definition?: string };
      // שימוש ב-setDoc עם ID קבוע + merge: true למניעת כפילויות
      await setDoc(
        doc(firestore, 'users', userId, 'words', word.id),
        { ...word, userId, ts: Date.now() },
        { merge: true }
      );
      break;
    }
    
    case 'DELETE_WORD': {
      const { id } = payload as { id: string };
      await deleteDoc(doc(firestore, 'users', userId, 'words', id));
      break;
    }
    
    case 'ADD_NOTE': {
      const note = payload as { id: string; content: string };
      await setDoc(
        doc(firestore, 'users', userId, 'notes', note.id),
        { ...note, userId, ts: Date.now() },
        { merge: true }
      );
      break;
    }
    
    case 'DELETE_NOTE': {
      const { id } = payload as { id: string };
      await deleteDoc(doc(firestore, 'users', userId, 'notes', id));
      break;
    }
    
    case 'ADD_CHAT': {
      const message = payload as { id: string; content: string; role: 'user' | 'assistant' };
      await setDoc(
        doc(firestore, 'users', userId, 'chats', message.id),
        { ...message, userId, ts: Date.now() },
        { merge: true }
      );
      break;
    }
    
    case 'DELETE_CHAT': {
      const { id } = payload as { id: string };
      await deleteDoc(doc(firestore, 'users', userId, 'chats', id));
      break;
    }
    
    default:
      throw new Error(`Unknown action type: ${action}`);
  }
}

/**
 * שולח את תוכן המטמון לטאב מבקש (לסנכרון מיידי)
 */
export async function dumpCacheToTab(sendResponse: (response: any) => void) {
  try {
    if (!auth.currentUser) {
      sendResponse({ cache: [] });
      return;
    }
    
    const userId = auth.currentUser.uid;
    
    // שליפת כל הנתונים של המשתמש הנוכחי
    const [words, notes, chats] = await Promise.all([
      db.words.where('userId').equals(userId).toArray(),
      db.notes.where('userId').equals(userId).toArray(),
      db.chatMessages.where('userId').equals(userId).toArray()
    ]);
    
    // שליחת התוצאות חזרה לטאב
    sendResponse({
      cache: {
        words,
        notes,
        chats
      }
    });
  } catch (error) {
    console.error('Error dumping cache:', error);
    sendResponse({ error: String(error) });
  }
}

// האזנה לאירועי חיבור לאינטרנט כדי לנקות את התור
export function setupQueueListeners() {
  // בדיקה אם יש פריטים בתור כשחוזרים לאונליין
  window.addEventListener('online', () => {
    console.log('Back online, flushing queue');
    flush();
  });
  
  // טעינת פריטי תור קיימים מה-IndexedDB בעת אתחול
  db.queue.toArray().then(items => {
    console.log(`Loaded ${items.length} items from queue`);
    
    // דחיפה לתור הגלובלי
    items.forEach(item => queue.push(item));
    
    // ניסיון לשדר אם מחוברים
    if (navigator.onLine) {
      flush();
    }
  });
} 
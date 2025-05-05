import { auth } from './firebase';
import { db } from './db';
import { getFirestore, collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { broadcastDbUpdate } from './bus';

// גישה לפיירסטור
const firestore = getFirestore();

// מעקב אחרי הרשמות פעילות
let unsubscribeWords: (() => void) | null = null;
let unsubscribeNotes: (() => void) | null = null;
let unsubscribeChats: (() => void) | null = null;

/**
 * סנכרון נתוני Firestore למסד הנתונים המקומי
 * מופעל בעת התחברות משתמש
 */
export function setupFirestoreSync() {
  onAuthStateChanged(auth, (user) => {
    // בטל את כל ההרשמות הקודמות
    cleanupSubscriptions();
    
    if (!user) {
      console.log('User logged out, stopping Firestore sync');
      return;
    }
    
    const userId = user.uid;
    console.log(`Setting up Firestore sync for user ${userId}`);
    
    // סנכרון מילים
    unsubscribeWords = onSnapshot(
      collection(firestore, 'users', userId, 'words'),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          
          if (change.type === 'added' || change.type === 'modified') {
            // עדכון ב-IndexedDB
            await db.words.put({
              ...data,
              id: change.doc.id,
              userId,
              ts: data.ts || Date.now()
            });
            
            // שידור לכל הקונטקסטים
            broadcastDbUpdate('word_updated', {
              id: change.doc.id,
              type: change.type
            });
          } else if (change.type === 'removed') {
            // מחיקה מ-IndexedDB
            await db.words.delete(change.doc.id);
            
            // שידור לכל הקונטקסטים
            broadcastDbUpdate('word_deleted', {
              id: change.doc.id
            });
          }
        });
      },
      (error) => {
        console.error('Error syncing words:', error);
      }
    );
    
    // סנכרון הערות
    unsubscribeNotes = onSnapshot(
      collection(firestore, 'users', userId, 'notes'),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          
          if (change.type === 'added' || change.type === 'modified') {
            await db.notes.put({
              ...data,
              id: change.doc.id,
              userId,
              ts: data.ts || Date.now()
            });
            
            broadcastDbUpdate('note_updated', {
              id: change.doc.id,
              type: change.type
            });
          } else if (change.type === 'removed') {
            await db.notes.delete(change.doc.id);
            
            broadcastDbUpdate('note_deleted', {
              id: change.doc.id
            });
          }
        });
      },
      (error) => {
        console.error('Error syncing notes:', error);
      }
    );
    
    // סנכרון צ'אטים
    unsubscribeChats = onSnapshot(
      collection(firestore, 'users', userId, 'chats'),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          
          if (change.type === 'added' || change.type === 'modified') {
            await db.chatMessages.put({
              ...data,
              id: change.doc.id,
              userId,
              ts: data.ts || Date.now(),
              role: data.role || 'user'
            });
            
            broadcastDbUpdate('chat_updated', {
              id: change.doc.id,
              type: change.type
            });
          } else if (change.type === 'removed') {
            await db.chatMessages.delete(change.doc.id);
            
            broadcastDbUpdate('chat_deleted', {
              id: change.doc.id
            });
          }
        });
      },
      (error) => {
        console.error('Error syncing chats:', error);
      }
    );
  });
}

/**
 * נקה את כל המנויים לסנכרון
 * נקרא בעת התנתקות או התחברות מחדש
 */
function cleanupSubscriptions() {
  if (unsubscribeWords) {
    unsubscribeWords();
    unsubscribeWords = null;
  }
  
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }
  
  if (unsubscribeChats) {
    unsubscribeChats();
    unsubscribeChats = null;
  }
} 
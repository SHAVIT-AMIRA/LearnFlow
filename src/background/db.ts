import Dexie, { Table } from 'dexie';
import 'dexie-multitab';

// הגדרת טיפוסים בסיסיים למודל הנתונים
export interface Word {
  id: string;
  userId: string;
  term: string;
  definition?: string;
  ts: number;
}

export interface Note {
  id: string;
  userId: string;
  content: string;
  ts: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  ts: number;
}

// הגדרת טיפוס לפריט תור (לטיפול בפעולות לא מסונכרנות)
export interface QueueItem {
  id: string;
  userId: string;
  action: 'ADD_WORD' | 'DELETE_WORD' | 'ADD_NOTE' | 'DELETE_NOTE' | 'ADD_CHAT' | 'DELETE_CHAT';
  payload: unknown; // יש להחליף ב-unknown במקום any
  attempts: number;
  ts: number;
}

// הגדרת סטטיסטיקה שתאוחסן ב-Dexie במקום ב-chrome.storage
export interface UserStats {
  userId: string;
  wordsLearned: number;
  notesCreated: number;
  lastActive: number;
}

class LearnFlowDb extends Dexie {
  words!: Table<Word, [string, string]>; // [userId+id] as composite key
  notes!: Table<Note, [string, string]>; // [userId+id] as composite key
  chatMessages!: Table<ChatMessage, [string, string]>; // [userId+id] as composite key
  queue!: Table<QueueItem, string>; // id as primary key
  userStats!: Table<UserStats, string>; // userId as primary key

  constructor() {
    super('learnflow');
    
    // הפעלת תוסף ה-multiTab
    this.use(Dexie.multiTab());
    
    // הגדרת הסכמה עם מפתחות מורכבים שכוללים userId
    this.version(1).stores({
      words: 'id, [userId+id], userId, ts',
      notes: 'id, [userId+id], userId, ts',
      chatMessages: 'id, [userId+id], userId, ts, role',
      queue: 'id, userId, action, ts',
      userStats: 'userId'
    });
  }
}

// יצירת מופע יחיד של מסד הנתונים
export const db = new LearnFlowDb(); 
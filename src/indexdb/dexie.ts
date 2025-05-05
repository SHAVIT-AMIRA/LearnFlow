import Dexie, { Table } from "dexie";

export interface WordRow {
  id?: string;
  original: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  ts: string; // ISO
}
export interface NoteRow { id?: string; videoId: string; text: string; ts: string; }
export interface ChatRow {
  id?: string; videoId: string; role: "user" | "assistant"; text: string; ts: string;
}
export interface SummaryRow {
  videoId: string; summary: string[]; terms: { term: string; def: string }[];
}
export interface QueueItem { id?: number; type: string; payload: any; }

class LearnFlowDB extends Dexie {
  words!: Table<WordRow, string>;
  notes!: Table<NoteRow, string>;
  chats!: Table<ChatRow, string>;
  summaries!: Table<SummaryRow, string>;
  queue!: Table<QueueItem, number>;

  constructor() {
    super("learnflow");
    this.version(1).stores({
      words: "++id, ts",
      notes: "++id, videoId, ts",
      chats: "++id, videoId, ts",
      summaries: "videoId",
      queue: "++id, type"
    });
  }
}
export const dbIDB = new LearnFlowDB();

export function enqueueWrite(type: string, payload: any) {
  return dbIDB.queue.add({ type, payload });
}

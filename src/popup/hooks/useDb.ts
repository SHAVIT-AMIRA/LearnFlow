import { liveQuery } from "dexie";
import { useObservable } from "react-use";
import { db, type Word } from "../../background/db";

export const useWords = (uid?: string) =>
  useObservable(
    liveQuery(() => {
      if (!uid) return [] as Word[]; // Return empty array of correct type
      return db.words.where("userId").equals(uid).toArray();
    }), 
    [] // Initial value
  ); 
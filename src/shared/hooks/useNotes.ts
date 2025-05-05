// ---------- src/shared/hooks/useNotes.ts ----------
import { liveQuery } from "dexie";
import { useObservable } from "react-use";
import { db, type Note } from "../../background/db"; // Adjust path as needed

// Assuming you have a 'notes' table similar to 'words' in your db.ts
// You'll need to add it to db.ts if it's not there
// export interface Note { userId: string; id: string; videoId: string; text: string; ts: number }
// And update WSDB class and stores definition

export function useNotes(userId?: string, videoId?: string) {
  const notes = useObservable(
    liveQuery(() => {
      if (!userId || !videoId) return [] as Note[]; // Return empty array of correct type
      // Query using the [userId+videoId] index
      return db.notes.where({ userId, videoId }).toArray();
    }), 
    [] // Initial value
  );

  const add = (text: string) => {
    if (!userId || !videoId) {
      console.error("Cannot add note: userId or videoId missing");
      return;
    }
    const id = crypto.randomUUID(); // Generate a client-side ID
    // Ensure the payload matches the ADD_NOTE type expected by bus-handler.ts
    // You might need to add ADD_NOTE to src/background/bus.ts and handle it in src/background/bus-handler.ts
    const payload = { id, userId, videoId, text }; 
    chrome.runtime.sendMessage({ type: "ADD_NOTE", payload });
  };

  return { notes: notes || [], add } as const;
}
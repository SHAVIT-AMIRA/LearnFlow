export const COLLECTIONS = {
    words: (uid: string) => `users/${uid}/vocabulary`,
    notes: (uid: string) => `users/${uid}/notes`,
    chats: (uid: string) => `users/${uid}/chats`,
    summaries: (uid: string) => `users/${uid}/summaries`
  };
  
  export const DAILY_SUMMARY_QUOTA = 5;
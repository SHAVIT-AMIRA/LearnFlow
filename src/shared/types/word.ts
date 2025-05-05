// ---------- src/shared/types/word.ts ----------
export interface Word {
    id?: string;
    originalWord: string;
    targetWord: string;
    sourceLanguage: string;
    targetLanguage: string;
    timestamp: string; // ISO
    context: { source: string; url: string };
  }
// ---------- src/shared/types/summary.ts ----------
export interface SummaryDoc {
    videoId: string;
    summary: string[];
    terms: { term: string; def: string }[];
  }
  
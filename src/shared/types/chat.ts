// ---------- src/shared/types/chat.ts ----------
export interface ChatMessage {
  id?: string;
  videoId: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
}
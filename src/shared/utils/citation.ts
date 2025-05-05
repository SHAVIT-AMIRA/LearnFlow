// ---------- src/shared/utils/citation.ts ----------
/** Produces simple APA citation for a YouTube/HTML5 video plus timestamp */
export function makeAPACitation({
    title,
    url,
    date,
    time
  }: {
    title: string;
    url: string;
    date: string; // YYYY-MM-DD
    time?: string; // 00:05:33
  }) {
    const iso = new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return `${title}. ( ${iso} ) [Video]. YouTube. ${url}${time ? `?t=${time}` : ""}`;
  }
  import { httpsCallable } from "firebase/functions";
  import { fns } from "@/background/firebase";
  
  // Get Firebase functions instance
  const functions = fns();
  if (!functions) {
    console.error("Firebase Functions not initialized in citation utils");
  }
  
  // Only create the function callable if functions is available
  const fn = functions 
    ? httpsCallable<{ word: string; target: string }, { text: string; detected: string }>(
        functions,
        "translateWord"
      )
    : null;
  
  export async function translateWord(word: string, target: string) {
    try {
      if (!fn) {
        throw new Error("Firebase Functions not initialized");
      }
      const { data } = await fn({ word, target });
      return { success: true, text: data.text, detectedSource: data.detected };
    } catch (e) {
      console.error("translateWord error", e);
      return { success: false } as const;
    }
  }
  
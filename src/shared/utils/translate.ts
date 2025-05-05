// ---------- src/shared/utils/translate.ts ----------
import { httpsCallable, HttpsCallableResult } from "firebase/functions";
import { fns } from "@/background/firebase";

// Create a safe version of httpsCallable that handles potentially null Functions object
const safeCallable = <T, R>(functionName: string) => {
  const functions = fns();
  if (!functions) {
    return async (): Promise<{ success: false }> => {
      console.error(`Firebase Functions not initialized when calling ${functionName}`);
      return { success: false as const };
    };
  }
  return httpsCallable<T, R>(functions, functionName);
};

export async function translateWord(word: string, target: string) {
  try {
    const translateFn = safeCallable<
      { word: string; target: string }, 
      { translatedText: string; detectedSourceLanguage: string }
    >("translateWord");
    const result = await translateFn({ word, target });
    
    // Check if the result is the error object from our safeCallable function
    if ('success' in result && result.success === false) {
      return { success: false as const };
    }
    
    // Otherwise it's a real HttpsCallableResult
    const callableResult = result as HttpsCallableResult<{ translatedText: string; detectedSourceLanguage: string }>;
    return { 
      success: true as const, 
      text: callableResult.data.translatedText, 
      detectedSource: callableResult.data.detectedSourceLanguage 
    };
  } catch (e) {
    console.error("Translation error:", e);
    return { success: false as const };
  }
}

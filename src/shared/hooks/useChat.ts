// ---------- src/shared/hooks/useChat.ts ----------
import { useState } from "react";
import { liveQuery } from 'dexie';
import { useObservable } from 'react-use'; // Make sure react-use is installed
import { db, type Chat } from '../../background/db'; // Import central db and Chat type
import { useAuthListener } from '../../popup/hooks/useAuthListener'; // Import auth listener

// Define timeout for Gemini requests (e.g., 30 seconds)
const GEMINI_TIMEOUT_MS = 30000;

// Define the structure for chat history messages sent to the background
interface ChatHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export function useChat(videoId?: string) { // Made videoId optional to align with others
  const { uid } = useAuthListener();
  
  // Use useObservable for live updates from Dexie
  const messages = useObservable<Chat[] | undefined>(
    liveQuery(async () => {
      if (!uid || !videoId) return [] as Chat[]; // Need user and videoId
      // Query the central db instance for chat messages
      // Assuming you have an index like [userId+videoId] or similar
      // You might need to add a `userId` field to your Chat interface and table
      return db.chats
        .where({ userId: uid, videoId: videoId }) // Adjust query based on your schema
        .sortBy("ts");
    }),
    [] // Initial value
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const send = async (text: string) => {
    if (!uid || !videoId) {
      setError("User or video context is missing.");
      return;
    }
    setError(null);
    
    // Add user message locally (via background queue)
    const userMsgPayload = { 
      id: crypto.randomUUID(),
      userId: uid,
      videoId, 
      role: "user" as const, 
      message: text, // Using 'message' field as per db.ts Chat interface
    };
    // Send message to background to enqueue save
    chrome.runtime.sendMessage({ type: "ADD_CHAT", payload: userMsgPayload });
    
    setIsLoading(true);
    
    try {
      // Get history directly from the observable state if available,
      // or query again (less efficient)
      const currentMessages = messages || []; // Use observable state
      
      // Format history for the Gemini API (last 10 messages for context)
      const history: ChatHistoryMessage[] = currentMessages
        .slice(-10) // Take last 10
        .map((msg: Chat) => ({
          // Map Chat interface to ChatHistoryMessage interface
          role: msg.role || (msg.response ? "assistant" : "user"), // Infer role if not present
          text: msg.message // Assuming message field holds the content
        }));
        
      // Send request to Gemini via background script message
      const reply = await sendMessageWithTimeout(
        { 
          type: "ASK_GEMINI_BACKGROUND", // Message type for background handler
          payload: {
            prompt: text, 
            history: history, // Send formatted history
            videoId: videoId, // Include videoId if needed
            userId: uid // Include userId if needed
          }
        },
        GEMINI_TIMEOUT_MS
      );
      
      if (reply && reply.success) {
        // Add assistant response locally (via background queue)
        const botMsgPayload = { 
          id: crypto.randomUUID(),
          userId: uid,
          videoId, 
          role: "assistant" as const, 
          message: reply.response, // Assuming Gemini response is in reply.response
          response: reply.response // Potentially store in response field too
        };
        chrome.runtime.sendMessage({ type: "ADD_CHAT", payload: botMsgPayload });
      } else {
        const errorMessage = reply?.error || "Unknown error occurred";
        console.error("Gemini API error:", errorMessage);
        setError(errorMessage);
        // Optionally add an error message to chat locally
        const errorMsgPayload = { 
          id: crypto.randomUUID(),
          userId: uid,
          videoId, 
          role: "assistant" as const, 
          message: `Sorry, I encountered an error: ${errorMessage}`,
        };
        chrome.runtime.sendMessage({ type: "ADD_CHAT", payload: errorMsgPayload });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Chat error:", errorMessage);
      setError(errorMessage);
      // Optionally add an error message to chat locally
       const commsErrorPayload = { 
          id: crypto.randomUUID(),
          userId: uid,
          videoId, 
          role: "assistant" as const, 
          message: `Sorry, communication error: ${errorMessage}`,
        };
        chrome.runtime.sendMessage({ type: "ADD_CHAT", payload: commsErrorPayload });
    } finally {
      setIsLoading(false);
    }
  };
  
  return { 
    messages: messages || [], // Ensure always returning an array
    send,
    isLoading,
    error
  } as const;
}

/**
 * Send a message to the runtime with a timeout (remains the same)
 */
async function sendMessageWithTimeout(message: any, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message || "Unknown runtime error"));
          return;
        }
        resolve(response);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}
import { auth } from "./firebase";
import { db } from "./db";
import type { Msg } from "./bus";
import { enqueue } from "./queue";

// Set up listener for extension messages
chrome.runtime.onMessage.addListener((message: Msg, _sender, sendResponse) => {
  console.log("📨 Background received message:", message.type);
  
  // Handle different message types
  switch (message.type) {
    case "ADD_WORD":
      handleAddWord(message.payload);
      sendResponse({ success: true });
      break;
      
    case "ADD_NOTE":
      handleAddNote(message.payload);
      sendResponse({ success: true });
      break;
      
    case "ADD_CHAT":
      handleAddChat(message.payload);
      sendResponse({ success: true });
      break;
      
    case "ASK_GEMINI_BACKGROUND":
      // This is an async operation, so we need to return true to indicate we'll respond later
      handleGeminiRequest(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
      
    case "TRANSLATE_AND_SAVE_WORD":
      // This is an async operation, so we need to return true to indicate we'll respond later
      handleTranslateAndSaveWord(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
      
    case "GENERATE_SUMMARY":
      // This is an async operation, so we need to return true to indicate we'll respond later
      handleGenerateSummary(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
      
    default:
      console.warn("Unhandled message type:", message.type);
      sendResponse({ success: false, error: "Unhandled message type" });
  }
});

// Handler for adding a word
function handleAddWord(payload: { id: string; term: string }) {
  if (!auth.currentUser) {
    console.error("User not authenticated");
    return;
  }
  
  enqueue({
    id: payload.id,
    term: payload.term
  });
}

// Handler for adding a note
function handleAddNote(payload: any) {
  if (!auth.currentUser) {
    console.error("User not authenticated");
    return;
  }
  
  const note = {
    ...payload,
    userId: auth.currentUser.uid,
    ts: Date.now()
  };
  
  db.notes.put(note)
    .then(() => console.log("Note saved:", note.id))
    .catch(err => console.error("Error saving note:", err));
}

// Handler for adding a chat message
function handleAddChat(payload: any) {
  if (!auth.currentUser) {
    console.error("User not authenticated");
    return;
  }
  
  const chat = {
    ...payload,
    ts: Date.now()
  };
  
  db.chats.put(chat)
    .then(() => console.log("Chat saved:", chat.id))
    .catch(err => console.error("Error saving chat:", err));
}

// Handler for Gemini API requests
async function handleGeminiRequest(payload: { prompt: string; history?: any[]; videoId?: string; userId: string }) {
  try {
    // In a production implementation, this would connect to Google's Gemini API
    // For now, we'll simulate a response
    console.log("Processing Gemini request:", payload.prompt);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      response: `This is a simulated response to: "${payload.prompt}". In a real implementation, this would come from the Gemini API.`
    };
  } catch (error) {
    console.error("Error processing Gemini request:", error);
    throw error;
  }
}

// Handler for translating and saving a word
async function handleTranslateAndSaveWord(payload: { term: string }) {
  try {
    // In a production implementation, this would connect to a translation API
    // For now, we'll simulate a translation
    console.log("Translating word:", payload.term);
    
    if (!auth.currentUser) {
      throw new Error("User not authenticated");
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const wordId = crypto.randomUUID();
    
    // Save the word
    await db.words.put({
      id: wordId,
      userId: auth.currentUser.uid,
      term: payload.term,
      ts: Date.now()
    });
    
    return {
      success: true,
      wordId,
      term: payload.term
    };
  } catch (error) {
    console.error("Error translating word:", error);
    throw error;
  }
}

// Handler for generating a summary
async function handleGenerateSummary(payload: { url: string; videoId?: string; userId: string }) {
  try {
    // In a production implementation, this would connect to an API to generate a summary
    // For now, we'll simulate a summary generation
    console.log("Generating summary for:", payload.url);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const summaryId = crypto.randomUUID();
    
    // Save the summary
    await db.summaries.put({
      id: summaryId,
      userId: payload.userId,
      url: payload.url,
      videoId: payload.videoId,
      title: "Simulated Summary",
      summary: "This is a simulated summary for the provided URL or video.",
      terms: ["term1", "term2"],
      ts: Date.now()
    });
    
    return {
      success: true,
      summaryId
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
} 
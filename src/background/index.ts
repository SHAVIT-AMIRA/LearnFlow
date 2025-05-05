/**
 * LearnFlow - Background Service Worker
 * 
 * - Initializes Firebase
 * - Sets up message listeners
 * - Handles browser events (tabs, install, update)
 * - Direct communication with Firebase Functions for API calls
 */
import { auth, fns } from './firebase';
import { httpsCallable } from "firebase/functions";
import { db } from './db';
import { setupMessageListener } from './bus';
import { setupQueueListeners, flush } from './queue';
import { setupFirestoreSync } from './firestore-sync';
import { setupAuthListener, AuthState } from './auth-channel';

// User settings
let userSettings = {
  targetLanguage: 'en',
  // Add other default settings here
};

// Initialize all services
console.log('[Background] Starting service worker initialization');

// Setup auth listener at the top level
setupAuthListener();

// Setup DB sync
setupFirestoreSync();

// Setup messaging
setupMessageListener();

// Setup queue with online/offline listeners
setupQueueListeners();

// Helper to save user settings to storage
function saveUserSettings(settings: any): void {
  chrome.storage.local.set({ userSettings: settings }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Error saving settings to storage:', chrome.runtime.lastError);
    } else {
      console.log('[Background] User settings saved to storage');
    }
  });
}

// Direct API functions

/**
 * Call the Firebase Function to translate text
 */
async function callTranslateFunction(message: any): Promise<any> {
  try {
    console.log('[Background] Translate request:', message.word);
    
    const functions = fns();
    if (!functions) {
      throw new Error("Firebase Functions not initialized");
    }
    
    const translateFn = httpsCallable(functions, 'translateWord');
    const result = await translateFn({
      word: message.word,
      target: message.target || 'en'
    });
    
    console.log('[Background] Translation result received');
    
    return { 
      success: true, 
      text: (result.data as any).translatedText,
      detectedSource: (result.data as any).detectedSourceLanguage
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Background] Translation error:', errorMessage);
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Call the Firebase Function to chat with Gemini
 */
async function callGeminiChatFunction(message: any): Promise<any> {
  try {
    console.log('[Background] Gemini chat request:', message.prompt?.substring(0, 50));
    
    const functions = fns();
    if (!functions) {
      throw new Error("Firebase Functions not initialized");
    }
    
    const geminiChatFn = httpsCallable(functions, 'askGemini');
    console.log('[Background] Calling askGemini Firebase function...');
    
    const result = await geminiChatFn({
      prompt: message.prompt,
      history: message.history || [],
      context: message.context || '',
      videoId: message.videoId || ''
    });
    
    console.log('[Background] Gemini chat result received');
    
    return { 
      success: true, 
      response: (result.data as any).response
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Background] Gemini chat error:', errorMessage);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

/**
 * Call the Firebase Function to summarize content
 */
async function callSummarizeFunction(message: any): Promise<any> {
  try {
    console.log('[Background] Summarize request for video:', message.videoId);
    
    const functions = fns();
    if (!functions) {
      throw new Error("Firebase Functions not initialized");
    }
    
    const summarizeFn = httpsCallable(functions, 'summarizeVideo');
    const result = await summarizeFn({
      videoId: message.videoId,
      transcript: message.transcript || '',
      language: message.language || 'en'
    });
    
    console.log('[Background] Summary result received');
    
    return { 
      success: true, 
      summary: (result.data as any).summary,
      terms: (result.data as any).terms
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Background] Summarization error:', errorMessage);
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

// Handle legacy API calls (to be eventually refactored with the new message bus)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle the message according to the action
  if (typeof message === 'object' && message.action) {
    switch (message.action) {
      case 'TRANSLATE':
        callTranslateFunction(message)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: String(error) }));
        return true; // Keep the message channel open for async response
        
      case 'GEMINI_CHAT':
        callGeminiChatFunction(message)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: String(error) }));
        return true;
        
      case 'SUMMARIZE':
        callSummarizeFunction(message)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ success: false, error: String(error) }));
        return true;
        
      case 'GET_AUTH_STATE':
        // Return current auth state
        chrome.storage.local.get('authState', (data) => {
          sendResponse({ success: true, authState: data.authState || null });
        });
        return true;
        
      case 'GET_USER_SETTINGS':
        // Return user settings
        chrome.storage.local.get('userSettings', (data) => {
          sendResponse({ success: true, settings: data.userSettings || userSettings });
        });
        return true;
        
      case 'SAVE_USER_SETTINGS':
        // Save updated user settings
        userSettings = { ...userSettings, ...message.settings };
        saveUserSettings(userSettings);
        sendResponse({ success: true });
        return false;
        
      case 'FLUSH_QUEUE':
        // Manually trigger queue flushing
        flush().then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          sendResponse({ success: false, error: String(error) });
        });
        return true;
    }
  }
  
  // If we get here, we couldn't handle the message
  console.warn('[Background] Unhandled message:', message);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

// Handle extension events
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
    // Reset auth state to ensure new installs have correct state
    chrome.storage.local.set({
      authState: {
        isAuth: false,
        uid: null,
        email: null,
        displayName: null
      }
    });
  }
});
/**
 * LearnFlow - Background Service Worker
 * 
 * - Initializes Firebase
 * - Sets up message listeners
 * - Handles browser events (tabs, install, update)
 * - Direct communication with Firebase Functions for API calls
 */
import { initFirebase, auth, fns } from './firebase';
import { setupSync } from './sync';
import { bus } from './broadcast';
import { httpsCallable } from "firebase/functions";

// Types for messages
interface LearnFlowMessage {
  action: string;
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// User settings
let userSettings = {
  targetLanguage: 'en',
  // Add other default settings here
};

// Authentication state
let isAuthenticated = false;

// Initialize services
initFirebase();
setupSync();

// Listen for auth state changes
bus.on((msg) => {
  if (msg.type === 'AUTH_STATE_CHANGED') {
    isAuthenticated = msg.payload.isAuthenticated;
    console.log(`[Background] Auth state changed: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    // If user logged out, reset to default settings
    if (!isAuthenticated) {
      userSettings = {
        targetLanguage: 'en',
      };
    }
    // If logged in, could load user-specific settings from Firestore here
  }
});

// Direct API functions to replace offscreen document

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

// Handle extension events
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
    // TODO: Open onboarding page
  }
});

// Handle messages from content scripts and UI
chrome.runtime.onMessage.addListener((
  message: LearnFlowMessage, 
  _sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: ApiResponse) => void
) => {
  // Handle different message types
  switch (message.action) {
    case 'TOGGLE_PANEL':
      console.log(`[Background] Toggle panel: ${message.panel}`);
      
      // Forward the message to the active tab's content script to open the panel
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            console.log('[Background] Panel toggle response:', response);
            sendResponse({ success: true, data: response });
          });
        } else {
          console.log('[Background] No active tab to send panel toggle to');
          sendResponse({ success: false, error: 'No active tab' });
        }
      });
      
      return true; // Keep channel open for async response
      break;
    
    case 'GET_SETTINGS':
      // Check auth state from Firebase directly
      const authInstance = auth();
      const currentUser = authInstance?.currentUser;
      
      console.log('[Background] GET_SETTINGS request', { 
        isAuthenticated, 
        hasUser: !!currentUser,
        email: currentUser?.email || 'none'
      });
      
      // Always return settings - even if not authenticated we return defaults
      sendResponse({ 
        success: true, 
        data: userSettings
      });
      break;
      
    case 'SAVE_SETTINGS':
      // Update settings
      if (message.settings && typeof message.settings === 'object') {
        userSettings = {...userSettings, ...message.settings};
        console.log('[Background] Settings updated:', userSettings);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Invalid settings object' });
      }
      break;
      
    case 'GET_AUTH_STATE':
      // Return current authentication state
      const user = auth()?.currentUser;
      sendResponse({
        success: true,
        data: {
          isAuthenticated: !!user,
          email: user?.email || null,
          displayName: user?.displayName || null
        }
      });
      break;
      
    case 'TRANSLATE_WORD':
      // Handle translation request directly
      console.log('[Background] Translation request:', message.word);
      callTranslateFunction(message)
        .then(response => {
          console.log('[Background] Translation completed');
          sendResponse(response);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Background] Translation error:', errorMessage);
          sendResponse({
            success: false,
            error: errorMessage
          });
        });
      return true; // Keep channel open for async response
      
    case 'ASK_GEMINI':
      // Handle Gemini chat request directly
      console.log('[Background] Gemini chat request');
      callGeminiChatFunction(message)
        .then(response => {
          console.log('[Background] Gemini chat completed');
          sendResponse(response);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Background] Gemini chat error:', errorMessage);
          sendResponse({
            success: false,
            error: errorMessage
          });
        });
      return true; // Keep channel open for async response
      
    case 'SUMMARIZE':
      // Handle summarize request directly
      console.log('[Background] Summarize request');
      callSummarizeFunction(message)
        .then(response => {
          console.log('[Background] Summarize completed');
          sendResponse(response);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Background] Summarize error:', errorMessage);
          sendResponse({
            success: false,
            error: errorMessage
          });
        });
      return true; // Keep channel open for async response
      
    case 'RECONNECT_OFFSCREEN':
      // This is no longer needed but keep for backward compatibility
      console.log('[Background] Reconnect request - no longer needed with direct API access');
      sendResponse({ success: true, data: 'Direct API access is now used' });
      break;
      
    default:
      console.log('[Background] Unknown message:', message);
  }
});

// Listen for tab updates to inject content script
chrome.tabs.onUpdated.addListener((
  tabId: number, 
  changeInfo: chrome.tabs.TabChangeInfo, 
  tab: chrome.tabs.Tab
) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    // Content script is injected via manifest.json
    // This is just for additional logic if needed
    bus.emit('TAB_UPDATED', { tabId, url: tab.url });
  }
});

// ========================= src/offscreen/gemini.ts =========================
/**
 * Offscreen document for handling Gemini API calls
 * This allows us to make API calls without blocking the main thread
 * and solves CORS issues by using the extension's permissions
 */

// Status tracking
let isInitialized = false;
let initializationError: string | null = null;

// Update status in UI
function updateStatus(message: string, isError = false) {
  try {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      if (isError) {
        statusEl.classList.add('error');
        statusEl.classList.remove('ready');
      } else {
        statusEl.classList.add('ready');
        statusEl.classList.remove('error');
      }
    }
  } catch (e) {
    // Ignore DOM errors
  }
}

// Set initial status
if (isInitialized) {
  updateStatus("Firebase initialized, ready for API calls");
} else {
  updateStatus(`Firebase initialization failed: ${initializationError}`, true);
}

// Log that the offscreen document is loaded
console.log("[Offscreen Gemini] Document loaded and ready to forward messages.");

// Listen for messages from the background script or other contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const senderInfo = sender.id ? 
    `extension ${sender.id}` : 
    (sender.tab ? `tab ${sender.tab.id}` : 'unknown source');
  
  console.log(`[Offscreen Gemini] Message received: ${message.action} from ${senderInfo}`);

  // Define which actions this offscreen document should forward to background
  const actionsToForward = ['ASK_GEMINI_OFFSCREEN', 'TRANSLATE_OFFSCREEN', 'SUMMARIZE_OFFSCREEN'];
  
  if (actionsToForward.includes(message.action)) {
    console.log(`[Offscreen Gemini] Forwarding ${message.action} to background script`);
    
    // Determine the corresponding background action type
    let backgroundActionType;
    switch (message.action) {
      case 'ASK_GEMINI_OFFSCREEN': 
        backgroundActionType = 'ASK_GEMINI_BACKGROUND'; 
        break;
      case 'TRANSLATE_OFFSCREEN': 
        backgroundActionType = 'TRANSLATE_BACKGROUND'; 
        break;
      case 'SUMMARIZE_OFFSCREEN': 
        backgroundActionType = 'SUMMARIZE_BACKGROUND'; 
        break;
      default: // Should not happen due to includes check
        console.error("Unhandled action type for forwarding:", message.action);
        sendResponse({ success: false, error: "Internal error: Unhandled forwarding action" });
        return false;
    }
    
    // Forward the message to the background script
    chrome.runtime.sendMessage(
      { 
        type: backgroundActionType,
        payload: message.payload // Forward the original payload
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error forwarding message to background:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          // Send the background script's response back to the original caller
          sendResponse(response);
        }
      }
    );
    
    return true; // Indicate async response

  } else if (message.action === 'PING') {
    // Handle PING locally if needed
    console.log("[Offscreen Gemini] Processing PING request locally");
    sendResponse({ success: true, ping: 'pong' });
    return false; 

  } else {
    // Action not meant for this offscreen document
    console.warn("[Offscreen Gemini] Received unhandled action:", message.action);
    // Optionally send a response indicating it wasn't handled here
    // sendResponse({ success: false, error: `Action ${message.action} not handled by offscreen/gemini` });
    return false; // Don't keep channel open if not handling
  }
});
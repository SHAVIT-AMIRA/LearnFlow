// ========================= src/offscreen/aiSummarize.ts =========================
/**
 * Offscreen summarizer – converts Transcript → summary/terms/APA citation.
 * Input message: { action:"SUMMARIZE", transcript:string, meta:{title,url}}
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== "SUMMARIZE_OFFSCREEN") return;
  
  console.log('Offscreen received SUMMARIZE_OFFSCREEN, forwarding to background', msg.payload);
  chrome.runtime.sendMessage(
    { 
      type: "SUMMARIZE_BACKGROUND",
      payload: msg.payload 
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error forwarding message to background:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(response);
      }
    }
  );
  
  return true;
});

console.log("Offscreen document for summarization loaded.");

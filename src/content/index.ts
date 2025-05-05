/**
 * Main content entry.
 * – Creates floating UI (always, regardless of video presence)
 * – Continuously tries to detect videos and captions
 * – Works with dynamically loaded content (SPAs)
 */
import { initFloatingUI } from "./floatingUI";
import { pickDetector } from "./detectorFactory";
import { initFirebase } from "@/background/firebase";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatRoot } from '@/ui/chat/ChatRoot';
import { NotesRoot } from '@/ui/notes/NotesRoot';
import { SummaryRoot } from '@/ui/summary/SummaryRoot';

console.log("[LearnFlow] Content script loaded");

// Initialize Firebase to make sure Functions are available
initFirebase();

// Wait for settings to be available before full initialization
let hasSettings = false;
let settingsRetryCount = 0;
const MAX_SETTINGS_RETRIES = 5;

// Always initialize UI first - this should appear on every page
initFloatingUI();

// Start the initialization process by getting settings
getSettingsAndInitialize();

// Function to get settings and then initialize the detector
function getSettingsAndInitialize() {
  settingsRetryCount++;
  console.log(`[LearnFlow] Getting settings (attempt ${settingsRetryCount}/${MAX_SETTINGS_RETRIES})`);
  
  chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[LearnFlow] Error getting settings:", chrome.runtime.lastError);
      retryGetSettings();
      return;
    }
    
    if (!response || !response.success) {
      console.log("[LearnFlow] Settings not available yet:", response);
      retryGetSettings();
      return;
    }
    
    console.log("[LearnFlow] Settings received:", response.data);
    hasSettings = true;
    
    // Now that we have settings, start the detector initialization
    initializeDetector();
  });
}

// Function to retry getting settings after a delay
function retryGetSettings() {
  if (settingsRetryCount >= MAX_SETTINGS_RETRIES) {
    console.log("[LearnFlow] Max settings retry attempts reached. Using defaults.");
    // Continue with initialization anyway
    initializeDetector();
    return;
  }
  
  const delay = 1000 * settingsRetryCount; // Increase delay with each retry
  console.log(`[LearnFlow] Will retry getting settings in ${delay}ms`);
  setTimeout(getSettingsAndInitialize, delay);
}

// Initialize detector after settings are available
function initializeDetector() {
  console.log("[LearnFlow] Initializing detector");
  
  // Setup detector with polling
  let detector = pickDetector();
  let detectionAttempts = 0;
  const MAX_ATTEMPTS = 60; // Try for ~30 seconds (60 * 500ms)

  // Start the detection process
  runDetector();

  // Function to run the detector and retry if needed
  function runDetector() {
    detectionAttempts++;
    
    // Log every few attempts
    if (detectionAttempts % 5 === 0) {
      console.log(`[LearnFlow] Detection attempt ${detectionAttempts}/${MAX_ATTEMPTS}`);
    }
    
    try {
      // If we have a detector, try to use it
      if (detector) {
        console.log(`[LearnFlow] Using detector: ${detector.source}`);
        const container = detector.detect();
        
        if (container) {
          console.log(`[LearnFlow] Successfully detected captions in container:`, container);
          window.addEventListener("beforeunload", () => detector?.cleanup());
          return; // Success! No need to continue polling
        }
      }
      
      // If we've tried too many times, stop trying
      if (detectionAttempts >= MAX_ATTEMPTS) {
        console.log("[LearnFlow] Max detection attempts reached. Giving up on caption detection.");
        return;
      }
      
      // If detection failed, try again after a delay
      setTimeout(() => {
        // Clean up previous detector if it exists
        if (detector) {
          detector.cleanup();
        }
        
        // Get a fresh detector
        detector = pickDetector();
        
        // Run the detector again
        runDetector();
      }, 500);
    } catch (error) {
      console.error("[LearnFlow] Error during detection process:", error);
      
      // Try again after a delay, but only if we haven't reached max attempts
      if (detectionAttempts < MAX_ATTEMPTS) {
        setTimeout(runDetector, 1000);
      }
    }
  }
}

// Add listener for manual video detection
document.addEventListener('video-loaded', () => {
  console.log("[LearnFlow] Video loaded event detected");
  if (hasSettings) {
    console.log("[LearnFlow] Reinitializing detector after video-loaded event");
    initializeDetector();
  } else {
    console.log("[LearnFlow] Waiting for settings before reinitializing detector");
  }
});

// Watch for dynamically added videos
const videoObserver = new MutationObserver((mutations) => {
  let newVideoFound = false;
  
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'VIDEO' || node.querySelector('video')) {
            newVideoFound = true;
          }
        }
      });
    }
  });
  
  if (newVideoFound) {
    console.log("[LearnFlow] New video element detected in DOM");
    if (hasSettings) {
      console.log("[LearnFlow] Reinitializing detector after new video detected");
      initializeDetector();
    } else {
      console.log("[LearnFlow] Waiting for settings before reinitializing detector");
    }
  }
});

// Start observing for new videos
videoObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Add listener for panel toggling
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'TOGGLE_PANEL') {
    console.log(`[LearnFlow Content] Toggle panel request received: ${message.panel}`);
    
    // Handle different panel types
    const panelType = message.panel;
    
    try {
      // Simple implementation - you might want to enhance this with actual panel UI
      const panelExists = document.querySelector(`#lf-panel-${panelType}`);
      
      if (panelExists) {
        // Toggle existing panel
        console.log(`[LearnFlow Content] Toggling existing panel: ${panelType}`);
        panelExists.remove();
        sendResponse({ success: true, action: 'closed', panel: panelType });
      } else {
        // Create new panel
        console.log(`[LearnFlow Content] Creating new panel: ${panelType}`);
        const panel = document.createElement('div');
        panel.id = `lf-panel-${panelType}`;
        panel.style.cssText = `
          position: fixed !important;
          top: 20% !important;
          right: 80px !important;
          background: white !important;
          border: 2px solid #3B82F6 !important;
          border-radius: 8px !important;
          padding: 16px !important;
          width: 300px !important;
          height: 400px !important;
          z-index: 2147483646 !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
          font-family: Arial, sans-serif !important;
          color: #333 !important;
        `;
        
        // Add panel title
        const title = document.createElement('h3');
        title.textContent = getPanelTitle(panelType);
        title.style.cssText = `
          margin: 0 0 10px 0 !important;
          font-size: 18px !important;
          color: #3B82F6 !important;
          padding-bottom: 8px !important;
          border-bottom: 1px solid #e5e7eb !important;
        `;
        panel.appendChild(title);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          background: none !important;
          border: none !important;
          font-size: 20px !important;
          cursor: pointer !important;
          color: #666 !important;
        `;
        closeBtn.onclick = () => panel.remove();
        panel.appendChild(closeBtn);
        
        // Add placeholder content based on panel type
        const content = document.createElement('div');
        content.id = `lf-panel-content-${panelType}`;
        content.style.cssText = `
          padding: 0 !important;
          height: calc(100% - 40px) !important;
          overflow: hidden !important;
        `;
        panel.appendChild(content);
        
        // Get the current video ID for components that need it
        const currentVideoId = getCurrentVideoId();
        
        // Render the appropriate component based on panel type
        const root = createRoot(content);
        switch (panelType) {
          case 'chat':
            root.render(React.createElement(ChatRoot, { videoId: currentVideoId }));
            break;
          case 'notes':
            root.render(React.createElement(NotesRoot, { videoId: currentVideoId }));
            break;
          case 'summary':
            root.render(React.createElement(SummaryRoot, { videoId: currentVideoId }));
            break;
          default:
            content.textContent = `Panel content for ${panelType} will be implemented soon.`;
        }
        
        document.body.appendChild(panel);
        sendResponse({ success: true, action: 'opened', panel: panelType });
      }
    } catch (err) {
      console.error(`[LearnFlow Content] Error handling panel toggle: ${err}`);
      sendResponse({ success: false, error: String(err) });
    }
    
    return true;
  }
});

// Helper function to get panel title
function getPanelTitle(panelType: string): string {
  switch (panelType) {
    case 'chat': return 'LearnFlow Chat';
    case 'notes': return 'LearnFlow Notes';
    case 'summary': return 'Video Summary';
    default: return 'LearnFlow';
  }
}

/**
 * Extract the video ID from the current URL
 * Supports YouTube and other video platforms
 */
function getCurrentVideoId(): string {
  // Try to extract YouTube video ID
  const url = new URL(window.location.href);
  
  // YouTube watch URL format: youtube.com/watch?v=VIDEO_ID
  if (url.searchParams.has('v')) {
    return url.searchParams.get('v') || 'unknown';
  }
  
  // YouTube shortened URL format: youtu.be/VIDEO_ID
  if (url.hostname === 'youtu.be') {
    return url.pathname.substring(1) || 'unknown';
  }
  
  // YouTube embed URL format: youtube.com/embed/VIDEO_ID
  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || 'unknown';
  }
  
  // Fallback: use pathname or hostname as an identifier
  return url.pathname || url.hostname || 'unknown-video';
}

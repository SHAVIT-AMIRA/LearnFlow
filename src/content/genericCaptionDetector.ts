/**
 * Detects any <video> element that has subtitle/caption TextTrack and converts
 * each cue into clickable words. Also provides fallback text selection for
 * sites without proper caption tracks.
 */
import { SubtitleScanner } from "./subtitleScanner";
import { highlightWords } from "./wordHighlighter";
import { showTooltip } from "./tooltip";

export class GenericCaptionDetector {
  source = "generic-video" as const;
  private scanner?: SubtitleScanner;
  private videoObserver?: MutationObserver;
  private selectionObserver?: boolean;

  detect(): HTMLElement | null {
    console.log("[LearnFlow] GenericCaptionDetector.detect() called");

    // Try to find a video with track elements
    const videoWithTrack = this.findVideoWithTrack();
    if (videoWithTrack) {
      console.log("[LearnFlow] Found video with subtitle track");
      this.setupTrackProcessing(videoWithTrack);
      return videoWithTrack;
    }

    // If no track found, look for any video element
    const anyVideo = document.querySelector<HTMLVideoElement>('video');
    if (anyVideo) {
      console.log("[LearnFlow] Found video without subtitle track, setting up fallback");
      this.setupFallbackTextSelection();
      this.observeVideoAdditions(); // Watch for track elements added later
      return anyVideo;
    }

    // No video found, set up observer to detect when videos might be added to the page
    console.log("[LearnFlow] No video found, setting up observer");
    this.observeVideoAdditions();
    return null;
  }

  cleanup() {
    console.log("[LearnFlow] GenericCaptionDetector.cleanup() called");
    this.scanner?.disconnect();
    this.scanner = undefined;
    
    if (this.videoObserver) {
      this.videoObserver.disconnect();
      this.videoObserver = undefined;
    }
    
    if (this.selectionObserver) {
      document.removeEventListener('mouseup', this.handleTextSelection);
      this.selectionObserver = false;
    }
  }

  // Find videos with subtitle or caption tracks
  private findVideoWithTrack(): HTMLVideoElement | null {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
    
    console.log(`[LearnFlow] Found ${videos.length} video elements on the page`);
    
    // Check for videos with track elements
    for (const video of videos) {
      // First, check for explicit track elements
      const tracks = Array.from(video.querySelectorAll('track'));
      const subtitleTrack = tracks.find(track => 
        track.kind === 'subtitles' || track.kind === 'captions'
      );
      
      if (subtitleTrack) {
        console.log("[LearnFlow] Found video with explicit track element");
        return video;
      }
      
      // Check for programmatic TextTracks
      if (video.textTracks && video.textTracks.length > 0) {
        console.log(`[LearnFlow] Video has ${video.textTracks.length} text tracks`);
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            console.log("[LearnFlow] Found video with programmatic text track");
            return video;
          }
        }
      }
      
      // Also check for parent containers that might have caption-related classes
      const parentElement = video.parentElement;
      if (parentElement) {
        const hasCaption = parentElement.querySelector('.captions-text, .vjs-text-track-display, .mejs__captions-text, .caption-text, [class*="caption"], [class*="subtitle"]');
        if (hasCaption) {
          console.log("[LearnFlow] Found video with caption-related elements in parent container");
          return video;
        }
      }
    }
    
    // If we got here, no video with explicit captions was found
    console.log("[LearnFlow] No video with explicit captions found");
    return null;
  }

  // Set up caption processing for videos with tracks
  private setupTrackProcessing(video: HTMLVideoElement) {
    // Find the first subtitle or caption track
    let targetTrack: TextTrack | null = null;
    
    // First check for track elements
    const trackElement = video.querySelector<HTMLTrackElement>(
      "track[kind='subtitles'], track[kind='captions']"
    );
    
    if (trackElement && trackElement.track) {
      targetTrack = trackElement.track;
    } 
    // Then check for programmatic TextTracks
    else if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          targetTrack = track;
          break;
        }
      }
    }
    
    if (targetTrack) {
      console.log("[LearnFlow] Found text track:", targetTrack);
      this.scanner = new SubtitleScanner(targetTrack);
      this.scanner.addEventListener("cue", (e) => this.processCue((e as any).detail));
    } else {
      console.log("[LearnFlow] No suitable text track found on the video");
      this.setupFallbackTextSelection();
    }
  }

  // Set up observer to detect video elements added to the page after load
  private observeVideoAdditions() {
    if (this.videoObserver) return;
    
    console.log("[LearnFlow] Setting up observer for video additions");
    this.videoObserver = new MutationObserver((mutations) => {
      let videoAdded = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement) {
              // Check if this node is a video or contains a video
              const isVideo = node.tagName === 'VIDEO';
              const hasVideo = node.querySelector('video') !== null;
              
              if (isVideo || hasVideo) {
                videoAdded = true;
              }
            }
          });
        }
      });
      
      if (videoAdded) {
        console.log("[LearnFlow] Video element added to the page");
        const video = this.findVideoWithTrack();
        if (video) {
          console.log("[LearnFlow] Found video with track after DOM update");
          this.setupTrackProcessing(video);
        }
      }
    });
    
    this.videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Set up fallback text selection for sites without proper captions
  private setupFallbackTextSelection() {
    if (this.selectionObserver) return;
    
    console.log("[LearnFlow] Setting up fallback text selection");
    document.addEventListener('mouseup', this.handleTextSelection);
    this.selectionObserver = true;
  }

  private handleTextSelection = async (e: MouseEvent) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (!selectedText || selectedText.length < 1 || selectedText.length > 50 || selectedText.split(/\s+/).length > 5) return;
    
    console.log("[LearnFlow] Text selected:", selectedText);
    
    // Delay to ensure intentional selection
    setTimeout(async () => {
      if (window.getSelection()?.toString().trim() !== selectedText) return;
      
      // Send message to background to handle translation and saving
      chrome.runtime.sendMessage(
        { 
          type: "TRANSLATE_AND_SAVE_WORD", 
          payload: { 
            originalWord: selectedText,
            context: { source: this.source, url: location.href } 
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending TRANSLATE_AND_SAVE_WORD:", chrome.runtime.lastError);
            return;
          }
          
          console.log("Background response:", response);
          if (response?.success && response.translation) {
            showTooltip(e, selectedText, response.translation);
          } else if (response?.error === 'AUTH_REQUIRED') {
            // Handle auth required notification if needed (can also be done in background)
            console.log("Auth required for translation."); 
          } else {
            console.error("Translation failed:", response?.error || "Unknown error");
          }
        }
      );
    }, 300);
  };

  private async processCue(line: string) {
    console.log("[LearnFlow] Processing cue:", line);
    const dummy = document.createElement("div");
    dummy.textContent = line; // safe – no HTML expected
    highlightWords(dummy, this.onWordClick);

    // Replace cue text showing in the page if possible (optional)
    // Note: This is challenging because most players have their own rendering
  }

  private onWordClick = async (word: string, ev: MouseEvent) => {
    console.log("[LearnFlow] Word clicked:", word);

    // Send message to background script to handle translation and saving
    chrome.runtime.sendMessage(
      { 
        type: "TRANSLATE_AND_SAVE_WORD", 
        payload: { 
          originalWord: word,
          context: { source: this.source, url: location.href } 
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending TRANSLATE_AND_SAVE_WORD:", chrome.runtime.lastError);
          return;
        }
        
        console.log("Background response:", response);
        if (response?.success && response.translation) {
          showTooltip(ev, word, response.translation);
        } else if (response?.error === 'AUTH_REQUIRED') {
          // Handle auth required notification
          console.log("Auth required for translation.");
        } else {
          console.error("Translation failed:", response?.error || "Unknown error");
        }
      }
    );
  };
}

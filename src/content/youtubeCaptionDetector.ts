// src/content/youtubeCaptionDetector.ts
// LearnFlow • caption detector for YouTube
// ----------------------------------------
// • עוטף מילים בכתוביות YouTube
// • מתרגם בלחיצה (translateWord utility)
// • מציג Tooltip קטן ל-3 שניות ונעלם
// • שולח SAVE_WORD לרקע

import { translateWord } from '@/shared/utils/translate';
import { enqueueWrite } from '@/indexdb/dexie';
import { showTooltip } from './tooltip';
import { CaptionDetector } from '@/types';

let activePopup: HTMLElement | null = null;

export class YouTubeCaptionDetector implements CaptionDetector {
  source = "youtube";
  private obs?: MutationObserver;

  /** מופעל מ-detectorFactory */
  detect(): HTMLElement | null {
    console.log("[LearnFlow] YouTubeCaptionDetector.detect() called");
    this.waitForCaptionContainer();
    return null; // לא צריך להחזיר מייד
  }

  cleanup() {
    console.log("[LearnFlow] YouTubeCaptionDetector.cleanup() called");
    this.obs?.disconnect();
    
    // Restore original text if we made any changes
    document.querySelectorAll('.learnflow-word').forEach((el) => {
      el.replaceWith(document.createTextNode(el.textContent || ''));
    });
    
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
  }

  /* ---------------------------------------------------------------- */

  private waitForCaptionContainer() {
    console.log("[LearnFlow] Starting to wait for caption container");
    const tryFind = () => {
      const el =
        document.querySelector(".ytp-caption-window-container") ||
        document.querySelector("div.caption-window") ||
        document.querySelector("yt-formatted-string.ytp-caption-segment") ||
        document.querySelector(".ytp-player-caption-spoken-text") ||
        document.querySelector(".caption-window-rolling") ||
        document.querySelector(".ytp-caption-segment-container");
      
      if (el) {
        console.log("[LearnFlow] Found caption container:", el);
        this.observe(el as HTMLElement);
      } else {
        console.log("[LearnFlow] No caption container found yet, trying again in 500ms");
        setTimeout(tryFind, 500);
      }
    };
    tryFind();
  }

  private observe(container: HTMLElement) {
    console.log("[LearnFlow] Setting up observer for", container);
    
    this.obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        // טקסט חדש בתוך <span>
        if (m.type === "characterData" && m.target.nodeValue?.trim()) {
          console.log("[LearnFlow] Character data changed:", m.target.nodeValue);
          this.wrapTextNode(m.target as Text);
        }
        // צמתים שנוספו
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) {
            console.log("[LearnFlow] Text node added:", n.nodeValue);
            this.wrapTextNode(n as Text);
          } else if (
            n instanceof HTMLElement &&
            (n.classList.contains("ytp-caption-segment") ||
              n.classList.contains("caption-visual-line"))
          ) {
            console.log("[LearnFlow] Caption segment/line added:", n.textContent);
            n.childNodes.forEach((c) =>
              c.nodeType === 3 ? this.wrapTextNode(c as Text) : null
            );
          }
        });
      });
    });

    this.obs.observe(container, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    
    // Process any existing captions
    console.log("[LearnFlow] Processing existing captions");
    const segments = container.querySelectorAll('.ytp-caption-segment, .caption-visual-line');
    console.log("[LearnFlow] Found existing caption segments:", segments.length);
    
    segments.forEach(seg => {
      seg.childNodes.forEach(node => {
        if (node.nodeType === 3) this.wrapTextNode(node as Text);
      });
    });
  }

  private wrapTextNode(txt: Text) {
    const raw = txt.textContent?.trim();
    if (!raw) return;
    
    console.log("[LearnFlow] Wrapping text node:", raw);

    const parent = txt.parentElement;
    if (!parent) return;
    
    const words = raw.split(/\s+/).filter(Boolean);
    const frag = document.createDocumentFragment();

    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "learnflow-word";
      span.textContent = w;
      span.style.cssText = `
        cursor: pointer !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
        border-radius: 2px !important;
        padding: 0 2px !important;
        margin: 0 1px !important;
        display: inline !important;
      `;
      
      span.onclick = (e) => this.onWordClick(e as MouseEvent, w);
      frag.appendChild(span);
      if (i < words.length - 1) frag.append(" ");
    });
    
    parent.replaceChild(frag, txt);
  }

  private async onWordClick(ev: MouseEvent, word: string) {
    console.log("[LearnFlow] Word clicked:", word);
    ev.stopPropagation();
    ev.preventDefault();
    
    const lang = await this.getTargetLang();
    console.log("[LearnFlow] Target language:", lang);
    
    try {
      const res = await translateWord(word, lang);
      console.log("[LearnFlow] Translation result:", res);
      
      if (!res.success || !res.text) {
        console.error("[LearnFlow] Translation failed");
        return;
      }

      showTooltip(ev, word, res.text);

      enqueueWrite("SAVE_WORD", {
        originalWord: word,
        targetWord: res.text,
        sourceLanguage: res.detectedSource || "auto",
        targetLanguage: lang,
        timestamp: new Date().toISOString(),
        context: { 
          source: this.source, 
          videoTitle: document.title,
          url: location.href 
        },
      });
    } catch (error) {
      console.error("[LearnFlow] Error in word click handler:", error);
    }
  }

  private async getTargetLang() {
    console.log("[LearnFlow] Getting target language");
    try {
      const response = await new Promise<any>(resolve => 
        chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, resolve)
      );
      return response?.success ? response.data?.targetLanguage || 'en' : 'en';
    } catch (error) {
      console.error("[LearnFlow] Error getting settings:", error);
      return 'en'; // Default to English
    }
  }
}

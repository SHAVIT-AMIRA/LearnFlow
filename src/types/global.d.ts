/**
 * Global type declarations for LearnFlow
 */

interface VideoContext {
  title: string;
  description: string;
  channelName: string;
  platform: string;
  videoId: string;
}

declare global {
  interface Window {
    learnFlowVideoContext?: VideoContext;
  }
  
  // Chrome API declarations for TypeScript
  namespace chrome {
    namespace runtime {
      function sendMessage(
        message: any,
        callback?: (response: any) => void
      ): void;
      
      const lastError: chrome.runtime.LastError | undefined;
      
      interface LastError {
        message?: string;
      }
    }
    
    namespace tabs {
      function query(
        queryInfo: {
          active?: boolean;
          currentWindow?: boolean;
        },
        callback: (result: chrome.tabs.Tab[]) => void
      ): void;
      
      function sendMessage(
        tabId: number,
        message: any,
        callback?: (response?: any) => void
      ): void;
      
      interface Tab {
        id?: number;
        url?: string;
      }
    }
  }
}

export {};
/**
 * כלי עזר לעטיפת Chrome API בתוך Promise באופן נכון
 * מונע שגיאות כמו Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'query')
 */

/**
 * עוטף את chrome.tabs.query בתוך Promise
 */
export function queryTabs(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      resolve(tabs);
    });
  });
}

/**
 * עוטף את chrome.tabs.sendMessage בתוך Promise
 * מטפל בשגיאות "Receiving end does not exist" בצורה נכונה
 */
export function sendTabMessage<T = any>(tabId: number, message: any): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.log(`[ChromePromise] Tab message error: ${chrome.runtime.lastError.message}`);
        resolve(null);
      } else {
        resolve(response as T);
      }
    });
  });
}

/**
 * עוטף את chrome.runtime.sendMessage בתוך Promise
 */
export function sendRuntimeMessage<T = any>(message: any): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log(`[ChromePromise] Runtime message error: ${chrome.runtime.lastError.message}`);
        resolve(null);
      } else {
        resolve(response as T);
      }
    });
  });
}

/**
 * עוטף את chrome.storage.local.get בתוך Promise
 */
export function getStorageItem<T = any>(key: string | string[] | null = null): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result as T);
    });
  });
}

/**
 * עוטף את chrome.storage.local.set בתוך Promise
 */
export function setStorageItem(items: { [key: string]: any }): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        console.log(`[ChromePromise] Storage set error: ${chrome.runtime.lastError.message}`);
      }
      resolve();
    });
  });
}

/**
 * שולח הודעה לכל הטאבים באופן נכון
 */
export async function broadcastToAllTabs(message: any): Promise<void> {
  const tabs = await queryTabs({});
  for (const tab of tabs) {
    if (tab.id && tab.url?.startsWith('http')) {
      // שימוש בקולבק במקום Promise
      chrome.tabs.sendMessage(tab.id, message, () => {
        // התעלמות מהשגיאה "Receiving end does not exist"
        if (chrome.runtime.lastError) {
          // בסדר להתעלם
        }
      });
    }
  }
} 
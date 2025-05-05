/**
 * פונקציות עזר לאימות עבור כל חלקי התוסף
 */

/**
 * בדיקה אם המשתמש מאומת
 */
export async function isUserAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get("authState", (result) => {
      const isAuthenticated = result.authState?.isAuthenticated ?? false;
      resolve(isAuthenticated);
    });
  });
}

/**
 * הצגת הודעה למשתמש שיש להתחבר
 */
export function showAuthRequiredNotification(featureName: string, message: string) {
  // יצירת אלמנט הודעה
  const notification = document.createElement('div');
  notification.className = 'lf-auth-notification';
  notification.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: white !important;
    border: 2px solid #e53e3e !important;
    border-radius: 8px !important;
    padding: 12px 16px !important;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    z-index: 9999 !important;
    font-family: Arial, sans-serif !important;
    max-width: 300px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  `;
  
  // כותרת
  const title = document.createElement('div');
  title.textContent = featureName;
  title.style.cssText = `
    font-weight: bold !important;
    font-size: 16px !important;
    color: #e53e3e !important;
  `;
  notification.appendChild(title);
  
  // תוכן ההודעה
  const content = document.createElement('div');
  content.textContent = message;
  content.style.cssText = `
    font-size: 14px !important;
    color: #333 !important;
  `;
  notification.appendChild(content);
  
  // כפתור התחברות
  const loginButton = document.createElement('button');
  loginButton.textContent = 'התחבר';
  loginButton.style.cssText = `
    padding: 6px 12px !important;
    background-color: #3B82F6 !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-size: 14px !important;
    align-self: flex-start !important;
    margin-top: 8px !important;
  `;
  loginButton.onclick = () => {
    // פתיחת חלון ההתחברות
    chrome.runtime.sendMessage({ action: 'OPEN_LOGIN_POPUP' });
    notification.remove();
  };
  notification.appendChild(loginButton);
  
  // כפתור סגירה
  const closeButton = document.createElement('div');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    cursor: pointer !important;
    font-size: 16px !important;
    color: #666 !important;
  `;
  closeButton.onclick = () => notification.remove();
  notification.appendChild(closeButton);
  
  // הוספה למסמך והסרה אוטומטית אחרי 5 שניות
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 5000);
} 
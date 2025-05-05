/**
 * דוגמה לקומפוננטה תואמת React שמשלבת אימות
 * מציגה את הדרך הנכונה לטפל באימות בקומפוננטות React
 */

// Import required hooks
import { useEffect, useState } from 'react';

// Example implementation for React component with auth protection
export const AuthProtectedComponent = ({ videoId }: { videoId: string }) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Check auth state when component mounts
  useEffect(() => {
    // Check storage for auth state
    chrome.storage.local.get("authState", (result) => {
      const isUserAuth = result.authState?.isAuthenticated ?? false;
      setIsAuthenticated(isUserAuth);
    });
    
    // Also listen for auth state changes
    const handleAuthChange = (event: CustomEvent) => {
      setIsAuthenticated(event.detail.isAuthenticated);
    };
    
    document.addEventListener('authStateChanged', handleAuthChange as EventListener);
    
    return () => {
      document.removeEventListener('authStateChanged', handleAuthChange as EventListener);
    };
  }, []);
  
  // Example of protected function
  const saveData = async () => {
    // CRITICAL: Block functionality if not authenticated
    if (!isAuthenticated) {
      setError("התחבר כדי להשתמש בפיצ'ר זה");
      return;
    }
    
    if (!note.trim()) {
      setError("תוכן לא יכול להיות ריק");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Send to background script
      const response: { success: boolean, error?: string } = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SAVE_DATA',
          content: note,
          videoId: videoId,
          timestamp: new Date().toISOString()
        }, (result) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(result || { success: false, error: 'No response' });
          }
        });
      });
      
      if (response && response.success) {
        // Clear the input on success
        setNote("");
        setError(null);
      } else {
        setError(response?.error || "שגיאה בשמירת המידע");
      }
    } catch (err) {
      console.error("Error saving data:", err);
      setError("שגיאה בשמירת המידע");
    } finally {
      setLoading(false);
    }
  };
  
  // Render with authentication check
  return (
    <div className="auth-gated-container">
      {!isAuthenticated ? (
        <div className="auth-warning">
          <p>התחבר כדי להשתמש בפיצ'ר זה</p>
          <button 
            onClick={() => {
              chrome.runtime.sendMessage({ action: 'OPEN_LOGIN_POPUP' }, () => {
                if (chrome.runtime.lastError) {
                  console.log("[Auth] Could not open login popup:", chrome.runtime.lastError.message);
                }
              });
            }}
            className="login-button"
          >
            התחבר
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="כתוב כאן את ההערה שלך..."
            disabled={loading}
            className="w-full p-2 border rounded"
          />
          
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
          
          <button
            onClick={saveData}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            {loading ? "שומר..." : "שמור"}
          </button>
        </>
      )}
    </div>
  );
}; 
// ---------- src/ui/popup/App.tsx ----------
import { useVocabulary } from "@/shared/hooks/useVocabulary";
import { useStats } from "@/shared/hooks/useStats";
import { useAuthListener } from "../../popup/hooks/useAuthListener";
import { useState, useRef } from "react";
import { type Word } from "../../background/db";
import {
  signInWithChrome,
  signInWithEmail,
  createUserWithEmail,
  signOutUser
} from "../../background/authHelper";

// Define the tab types
type TabType = "vocabulary" | "games" | "notes" | "chat";

export default function PopupApp() {
  const { words } = useVocabulary();
  const { streak } = useStats();
  const { isAuth, uid } = useAuthListener();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("vocabulary");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleAuthAction = async (action: () => Promise<void>) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await action();
      setShowEmailForm(false);
      setIsSignUpMode(false);
    } catch (err: any) {
      console.error("Auth Error:", err);
      let message = "An error occurred during authentication.";
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            message = "Invalid email or password.";
            break;
          case 'auth/email-already-in-use':
            message = "This email is already registered. Try logging in.";
            break;
          case 'auth/weak-password':
            message = "Password should be at least 6 characters.";
            break;
          default:
            message = err.message || message;
        }
      }
      setAuthError(message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    if (!email || !password) {
      setAuthError("Please enter both email and password.");
      return;
    }
    
    const action = isSignUpMode
      ? () => createUserWithEmail(email, password)
      : () => signInWithEmail(email, password);
      
    handleAuthAction(action);
  };

  const handleGoogleSignIn = () => handleAuthAction(signInWithChrome);
  const handleSignOut = () => handleAuthAction(signOutUser);

  const toggleEmailFormVisibility = (show: boolean, isSignup: boolean = false) => {
    setShowEmailForm(show);
    setIsSignUpMode(isSignup);
    setAuthError(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "vocabulary":
        return (
          <div className="py-2">
            {words.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[40vh] overflow-y-auto">
                {words.map((w: Word) => (
                  <li key={w.id} className="py-2 flex justify-between">
                    <span>{w.term}</span>
                    <span className="text-blue-600 dark:text-blue-400">{w.term}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                <p>לא נמצאו מילים שמורות</p>
                <p className="text-xs mt-1">לחץ על מילים בכתוביות YouTube כדי לתרגם ולשמור אותן</p>
              </div>
            )}
          </div>
        );
      case "games":
        return (
          <div className="py-4 text-center">
            <h3 className="font-medium mb-2">משחקי למידה</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                <div className="text-2xl mb-1">🎮</div>
                <div className="text-xs">משחק זיכרון</div>
              </button>
              <button className="bg-green-100 dark:bg-green-900 p-3 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
                <div className="text-2xl mb-1">📝</div>
                <div className="text-xs">בחן את עצמך</div>
              </button>
              <button className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                <div className="text-2xl mb-1">🔄</div>
                <div className="text-xs">תרגם מהר</div>
              </button>
              <button className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs">התאמה</div>
              </button>
            </div>
          </div>
        );
      case "notes":
        return (
          <div className="py-4 text-center">
            <h3 className="font-medium mb-2">הערות</h3>
            <div className="space-y-2">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">הערה מ-20.4.2025</div>
                הבנתי את הנושא של זמני עבר בפרק הזה. חשוב לשים לב לצורת הפועל השלישית.
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">הערה מ-18.4.2025</div>
                הביטוי "to take into account" משמעותו "להביא בחשבון" - מופיע הרבה בסרטון.
              </div>
              <button className="w-full mt-2 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                הוסף הערה חדשה
              </button>
            </div>
          </div>
        );
      case "chat":
        return (
          <div className="py-4">
            <h3 className="font-medium mb-2 text-center">צ'אט עם LearnFlow</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 max-h-[40vh] overflow-y-auto space-y-2">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-8">
                איך אני יכול לתרגל את אוצר המילים החדש שלי?
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg ml-8">
                ניתן לתרגל באמצעות המשחקים בלשונית "משחקים" או לנסות לכתוב משפטים חדשים עם המילים. האם תרצה רעיונות נוספים?
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-8">
                מה ההבדל בין "affect" ו-"effect"?
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg ml-8">
                "Affect" הוא בדרך כלל פועל שמשמעותו "להשפיע על", בעוד ש-"Effect" הוא בדרך כלל שם עצם שמשמעותו "תוצאה" או "השפעה".
              </div>
            </div>
            <div className="mt-2 flex">
              <input 
                type="text" 
                placeholder="שאל שאלה..." 
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-l outline-none"
              />
              <button className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 transition-colors">
                שלח
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-w-[320px] min-h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>מעבד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[320px] font-sans text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-100 min-h-[400px] max-h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h1 className="font-semibold text-base">LearnFlow</h1>
        {isAuth && (
          <button 
            onClick={handleSignOut}
            className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 rounded"
          >
            התנתק
          </button>
        )}
      </div>
      
      {authError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm">
          <p className="text-center">{authError}</p>
        </div>
      )}
      
      {isAuth ? (
        <>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Streak: {streak} days</span>
            <span className="truncate">UserID: {uid}</span>
          </div>
          
          <div className="grid grid-cols-4 border-b border-gray-200 dark:border-gray-800">
            <button 
              className={`p-2 text-center text-xs transition-colors ${activeTab === "vocabulary" ? "border-b-2 border-blue-500 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              onClick={() => setActiveTab("vocabulary")}
            >
              <div className="text-lg mb-1">📚</div>
              <div>מילים</div>
            </button>
            <button 
              className={`p-2 text-center text-xs transition-colors ${activeTab === "games" ? "border-b-2 border-blue-500 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              onClick={() => setActiveTab("games")}
            >
              <div className="text-lg mb-1">🎮</div>
              <div>משחקים</div>
            </button>
            <button 
              className={`p-2 text-center text-xs transition-colors ${activeTab === "notes" ? "border-b-2 border-blue-500 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              onClick={() => setActiveTab("notes")}
            >
              <div className="text-lg mb-1">📝</div>
              <div>הערות</div>
            </button>
            <button 
              className={`p-2 text-center text-xs transition-colors ${activeTab === "chat" ? "border-b-2 border-blue-500 font-medium" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              onClick={() => setActiveTab("chat")}
            >
              <div className="text-lg mb-1">💬</div>
              <div>צ'אט</div>
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            {renderTabContent()}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 flex-1">
          {showEmailForm ? (
            <div className="w-full max-w-xs">
              <h2 className="text-center font-semibold mb-4">
                {isSignUpMode ? "הרשמה לחשבון חדש" : "התחברות"}
              </h2>
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-right mb-1 text-sm">כתובת אימייל</label>
                  <input
                    id="email"
                    ref={emailRef}
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded outline-none"
                    disabled={isLoadingAuth}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-right mb-1 text-sm">סיסמה</label>
                  <input
                    id="password"
                    ref={passwordRef}
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded outline-none"
                    disabled={isLoadingAuth}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingAuth}
                  className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isLoadingAuth ? "מעבד..." : (isSignUpMode ? "הרשמה" : "התחברות")}
                </button>
              </form>
              <div className="mt-4 text-center text-sm">
                <button 
                  onClick={() => setIsSignUpMode(!isSignUpMode)}
                  disabled={isLoadingAuth}
                  className="text-blue-500 hover:underline disabled:opacity-50"
                >
                  {isSignUpMode ? "כבר יש לך חשבון? התחבר" : "אין לך חשבון? הרשם"}
                </button>
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => toggleEmailFormVisibility(false)}
                  disabled={isLoadingAuth}
                  className="text-gray-500 hover:underline text-xs disabled:opacity-50"
                >
                  חזור
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">התחברות</h2>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoadingAuth}
                className="w-full max-w-xs bg-white text-gray-700 border border-gray-300 rounded px-4 py-2 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                <span className="ml-2">{isLoadingAuth ? "מעבד..." : "התחבר עם גוגל"}</span>
              </button>
              <button
                onClick={() => toggleEmailFormVisibility(true, false)}
                disabled={isLoadingAuth}
                className="w-full max-w-xs bg-gray-500 text-white py-2 px-4 rounded flex items-center justify-center hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect>
                  <polyline points="3 7 12 13 21 7"></polyline>
                </svg>
                <span className="ml-2">התחבר עם אימייל</span>
              </button>
              <button
                onClick={() => toggleEmailFormVisibility(true, true)}
                disabled={isLoadingAuth}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                אין לך חשבון? הרשם
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- src/ui/options/App.tsx ----------
/** Settings page inside extension Options */
import { useAuthListener } from "../../popup/hooks/useAuthListener";
import { signInWithChrome, signOutUser } from "../../background/authHelper";

export default function OptionsApp() {
  const { isAuth, uid } = useAuthListener();

  const handleSignIn = () => {
    signInWithChrome().catch(err => console.error("Sign in failed:", err));
  };

  const handleSignOut = () => {
    signOutUser().catch(err => console.error("Sign out failed:", err));
  };

  return (
    <div className="p-6 font-sans space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">LearnFlow Settings</h1>
      {isAuth ? (
        <div className="space-y-2">
          <div>Authenticated (User ID: {uid})</div>
          <button className="text-red-600" onClick={handleSignOut}>Sign out</button>
        </div>
      ) : (
        <button className="text-blue-600" onClick={handleSignIn}>Sign in</button>
      )}
      {/* TODO – language selector, notification toggle, etc. */}
    </div>
  );
}
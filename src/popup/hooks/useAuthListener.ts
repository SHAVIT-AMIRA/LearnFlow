import { useEffect, useState } from "react";
import { authCh } from "../../background/broadcast";

export function useAuthListener() {
  const [st, set] = useState<{ isAuth: boolean; uid?: string }>({ isAuth: false });
  useEffect(() => {
    authCh.onmessage = e => set(e.data);
    // Also get initial state from storage
    chrome.storage.local.get("authState").then(x => x.authState && set(x.authState));
  }, []);
  return st;
} 
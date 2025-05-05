// ---------- src/ui/games/FlashCards.tsx ----------
import { useVocabulary } from "@/shared/hooks/useVocabulary";
import { useState } from "react";

export default function FlashCards() {
  const { words } = useVocabulary();
  const [idx, setIdx] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  
  if (!words.length) return <div className="p-6">No words yet.</div>;
  
  const w = words[idx % words.length];
  
  return (
    <div className="p-6 font-sans text-center space-y-4">
      <div className="text-2xl">{w.term}</div>
      
      {showTranslation ? (
        <div className="mb-4 text-blue-600">
          {/* In this version we don't store translations yet, so we'd show the same term */}
          {w.term}
        </div>
      ) : (
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={() => setShowTranslation(true)}
        >
          Show
        </button>
      )}
      
      <div className="space-x-4">
        <button 
          className="px-3 py-1 bg-gray-200 rounded" 
          onClick={() => {
            setIdx(idx + 1);
            setShowTranslation(false);
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

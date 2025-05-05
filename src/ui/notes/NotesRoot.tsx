// ---------- src/ui/notes/NotesRoot.tsx ----------
/**
 * Floating Notes drawer – simple textarea per video.
 */
import { useState, useRef } from "react";
import { useNotes } from "../../shared/hooks/useNotes";
import { useAuthListener } from "../../popup/hooks/useAuthListener";
import { type Note } from "../../background/db";

interface NotesRootProps {
  videoId: string;
}

export function NotesRoot({ videoId }: NotesRootProps) {
  const { uid } = useAuthListener();
  const { notes, add: addNoteViaHook } = useNotes(uid, videoId);
  const [newNote, setNewNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saveNote = () => {
    const textToSave = newNote.trim();
    if (!textToSave) return;
    
    addNoteViaHook(textToSave);
    setNewNote("");
    textareaRef.current?.focus();
  };

  return (
    <div className="w-80 h-96 flex flex-col bg-white rounded-lg shadow-lg">
      <div className="p-3 border-b">
        <textarea
          ref={textareaRef}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Type your note here..."
          className="w-full p-2 border rounded text-sm"
          rows={3}
        />
        <button 
          onClick={saveNote}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          disabled={!newNote.trim()}
        >
          Save Note
        </button>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {notes.length === 0 && (
          <p className="text-center text-sm text-gray-500">No notes for this video yet.</p>
        )}
        {(notes || []).map((note: Note, index: number) => (
          <div 
            key={note.id || `note-${index}`} 
            className="p-2 bg-gray-50 border rounded text-sm"
          >
            <div className="whitespace-pre-wrap">{note.text}</div>
            {note.ts && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(note.ts).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
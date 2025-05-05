// ---------- src/ui/notes/NoteRow.tsx ----------
/**
 * Individual note display component
 */
import { type Note } from "../../background/db";

export function NoteRow({ note }: { note: Note }) {
  return (
    <div className="p-2 bg-gray-50 border rounded text-sm">
      <div className="whitespace-pre-wrap">{note.text}</div>
      {note.ts && (
        <div className="text-xs text-gray-500 mt-1">
          {new Date(note.ts).toLocaleString()}
        </div>
      )}
    </div>
  );
}
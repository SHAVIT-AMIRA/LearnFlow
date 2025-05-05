# LearnFlow – Master Implementation Checklist

> ‎**מטרה**: מסמך בקרה יחיד —‎ לעבור סעיף‑סעיף בזמן פיתוח, לסמן ✔️, ולוודא שהקוד נשאר תואם ארכיטקטורה.  
> ‎**שימוש**: סמן `[x]` כאשר השלמת; אל תשנה נוסח, רק את ה־checkbox.

---
## 0. Repo / Branch
- [ ] `main` נקי, פיתוח ב־`dev` → PR אל `main`
- [ ] CI רץ אוטומטית על PR

---
## 1. Secrets & Env
| ✓ | פעולה |
|---|-------|
| [ ] | `.env` מכיל VITE_FB_* מלאים |
| [ ] | GEMINI_KEY נוסף ל‑`firebase secrets` |
| [ ] | `.env` ב‑`.gitignore` |

---
## 2. Folder Structure (לא שונה)
```
public/ …
src/manifest.ts
src/background/*
src/content/*
src/offscreen/*
src/ui/*
src/shared/*
src/indexdb/*
functions/*
```
- [ ] אין קבצים חיצוניים למבנה זה

---
## 3. Background Layer
- [ ] `src/background/firebase.ts` – Singleton init (no duplicate apps)
- [ ] `broadcast.ts` – bus.emit / bus.on פעילים
- [ ] `sync.ts` – flushQueue + listeners notes|chats|words

---
## 4. IndexedDB
- [ ] `dexie.ts` סכימה מדויקת (words, notes, chats, summaries, queue)
- [ ] enqueueWrite קיים בכל קריאת SAVE_* בתוכן/UI

---
## 5. Content Scripts
| ✓ | קובץ | בדיקה |
|---|-------|--------|
| [ ] | `floatingUI.ts` | כפתורים צפים מוצגים בדף יוטיוב וכל אתר Video |
| [ ] | `youtubeCaptionDetector.ts` | Tooltip 3s, click ⇒ translate+queue |
| [ ] | `genericCaptionDetector.ts` | עובד עם `<video><track>` |
| [ ] | `detectorFactory.ts` | מחליף נכון בין YT/Generic |

---
## 6. Offscreen
- [ ] `gemini.ts` מקבל `ASK_GEMINI`, מחזיר תשובה
- [ ] `aiSummarize.ts` מחזיר summary+terms+citation

---
## 7. Cloud Functions (deploy `europe-west1`)
| ✓ | Name | Trigger/Type |
|---|------|-------------|
| [ ] | `geminiChat` | callable – chat |
| [ ] | `aiSummarize` | callable – summary |
| [ ] | `translateWord`| callable – word |
| [ ] | `onWordWrite`  | Firestore trigger – stats |

---
## 8. UI Components
| ✓ | Path | Must show |
|---|------|-----------|
| [ ] | `ui/popup/App.tsx` | רשימת מילים, streak ✔️ |
| [ ] | `ui/chat/ChatRoot.tsx` | scroll & send ✔️ |
| [ ] | `ui/notes/NotesRoot.tsx` | add note Enter ✔️ |
| [ ] | `ui/summary/SummaryRoot.tsx` | bullet list + term cards ✔️ |
| [ ] | `ui/games/FlashCards.tsx` | next card ✔️ |

---
## 9. Shared Hooks/Utils
- [ ] `useVocabulary` מקריא Dexie liveQuery
- [ ] `useChat.send` ⇒ runtime ASK_GEMINI + adds bot reply
- [ ] `useSummary.exportMd` יוצר Blob ו‑download
- [ ] `translateWord` קורא callable `translateWord`

---
## 10. Styles
- [ ] `tailwind.config.ts` בתיקיית רוט
- [ ] `src/styles/tailwind.css` מוטמע בנקודת הכניסה Vite (`import "@/styles/tailwind.css"`)
- [ ] אנימציות fade / slide פועלות

---
## 11. Firebase Console
- [ ] Auth (Google) פעיל
- [ ] Firestore rules פורסמו
- [ ] Storage rules פורסמו

---
## 12. CI / GitHub Actions
- [ ] secrets: `FIREBASE_TOKEN`, `CWS_*` שלמים
- [ ] Workflow עובר lint+test+build
- [ ] Functions deploy אוטומטי (log ✅)

---
## 13. Tests
- [ ] `pnpm vitest` עובר
- [ ] E2E (Playwright) ירוק (אופציונלי)

---
## 14. Assets CWS
- [ ] icons PNG 16/32/48/128
- [ ] screenshot 1280×800
- [ ] promo video ≤30s

---
## 15. README & Privacy
- [ ] README עם הוראות dev/build
- [ ] privacy.html מועלה (GitHub Pages)

---
## 16. QA Manual
| ✓ | בדיקה |
|---|-------|
| [ ] | יוטיוב: לחיצה על מילה → Tooltip + נשמר ב‑popup |
| [ ] | html5 video באתר אחר ✔️ |
| [ ] | Offline: מילה בתור → חוזר אונליין → Sync ✔️ |
| [ ] | Gemini Chat עונה |
| [ ] | Summary כפתור 📚 מופיע רק כש‑duration >10min |

---
## 17. RELEASE
- [ ] `pnpm build` → dist.zip =~< 8 MB
- [ ] Git tag `vX.Y.Z`
- [ ] GitHub Action מעלה CWS draft ✔️
- [ ] לחץ "Submit for review"

> שמור מסמך זה מעודכן – הוא הופך למקור האמת לפני כל Merge.

public/
  ├─ icons/16.png 48.png 128.png
  └─ offscreen/gemini.html  (stub: basic HTML linking offscreen/gemini.ts)

src/
  manifest.ts                 (typed manifest)

  background/
    index.ts                  (SW root)
    firebase.ts               (Singleton init)
    sync.ts                   (IDB⇄FS sync)
    broadcast.ts              (BroadcastChannel helper)

  content/
    index.ts                  (entry – picks detector & floatingUI)
    detectorFactory.ts        (choose YT/Generic)
    youtubeCaptionDetector.ts
    genericCaptionDetector.ts
    floatingUI.ts
    domUtils.ts               (helpers)

  offscreen/
    gemini.ts                 (chat/notes callable)
    aiSummarize.ts            (summary callable)

  ui/
    popup/
      App.tsx
      index.tsx
    options/
      App.tsx
    games/
      FlashCards.tsx
      Memory.tsx
      index.tsx
    chat/
      ChatRoot.tsx
      MessageItem.tsx
    notes/
      NotesRoot.tsx
      NoteRow.tsx
    summary/
      SummaryRoot.tsx
      TermCard.tsx
      ExportButtons.tsx

  shared/
    types/
      word.ts note.ts chat.ts summary.ts
    hooks/
      useAuth.ts useVocabulary.ts useChat.ts useNotes.ts useSummary.ts
    utils/
      translate.ts langDetect.ts citation.ts
    constants.ts

  styles/
    tailwind.css popup.css

  indexdb/
    dexie.ts                  (tables + queue)

functions/
  geminiChat.ts aiSummarize.ts translateWord.ts firestoreTriggers.ts index.ts

tests/
  youtubeDetector.test.ts genericDetector.test.ts translate.test.ts

.github/workflows/ci.yml
firebase.json
vite.config.ts
tsconfig.json
package.json





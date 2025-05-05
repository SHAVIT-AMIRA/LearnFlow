import { liveQuery } from 'dexie';
import { useObservable } from 'react-use';
import { db, type Word } from '../../background/db';
import { useAuthListener } from '../../popup/hooks/useAuthListener';

export function useVocabulary(limit = 50) {
  const { uid } = useAuthListener();

  const words = useObservable(
    liveQuery(() => {
      if (!uid) return [] as Word[];
      return db.words
        .where('userId').equals(uid)
        .reverse()
        .limit(limit)
        .toArray();
    }),
    [] // Initial value
  );

  return { words: words || [] };
}
// ---------- src/shared/hooks/useSummary.ts ----------
import { liveQuery } from 'dexie';
import { useObservable } from 'react-use'; // Make sure react-use is installed
import { db, type Summary } from '../../background/db'; // Import central db and Summary type
import { useAuthListener } from '../../popup/hooks/useAuthListener'; // Import auth listener

interface UseSummaryResult {
  summaryData: Summary | null;
  exportMd: () => void;
  exportPdf: () => void;
}

export function useSummary(videoId?: string, url?: string): UseSummaryResult {
  const { uid } = useAuthListener();

  const summaryId = videoId || url;

  const summaryData = useObservable<Summary | undefined>(
    liveQuery(async () => {
      if (!uid || !summaryId) return undefined;
      
      let queryResult;
      if (videoId) {
        queryResult = await db.summaries.where({ userId: uid, videoId: videoId }).first();
      } else if (url) {
         queryResult = await db.summaries.where({ userId: uid, url: url }).first();
      } else {
         queryResult = await db.summaries.get([uid, summaryId]);
      }
      
      return queryResult;
    }),
    undefined
  );

  const exportMd = () => {
    if (!summaryData || !summaryData.summary || !summaryData.terms) return;
    
    let content = `# Summary for ${summaryData.title || summaryId}\n\n`;
    
    content += `## Key Points\n\n`;
    const points = Array.isArray(summaryData.summary) ? summaryData.summary : [summaryData.summary];
    points.forEach((point: string) => {
      content += `* ${point}\n`;
    });
    
    content += `\n## Key Terms\n\n`;
    
    // Safely handle terms which could be string[] or Term[]
    if (Array.isArray(summaryData.terms)) {
      summaryData.terms.forEach((termItem: string | any) => {
        if (typeof termItem === 'string') {
          // If it's just a string, use it as the term with empty definition
          content += `**${termItem}**: \n\n`;
        } else if (typeof termItem === 'object' && 'term' in termItem) {
          // If it has a term property, treat it as a Term object
          const typedTerm = termItem as { term: string; def?: string };
          content += `**${typedTerm.term}**: ${typedTerm.def || ''}\n\n`;
        }
      });
    }
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `summary-${summaryId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };
  
  const exportPdf = () => {
    alert('PDF export not implemented');
  };

  return {
    summaryData: summaryData || null,
    exportMd,
    exportPdf
  };
}

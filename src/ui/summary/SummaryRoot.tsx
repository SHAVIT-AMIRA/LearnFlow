// ---------- src/ui/summary/SummaryRoot.tsx ----------
/**
 * Summary drawer – shows bullet points & term cards, allows export.
 */
import { useSummary } from "@/shared/hooks/useSummary";
import { ExportButtons } from "./ExportButtons";
import { TermCard } from "./TermCard";

export function SummaryRoot({ videoId }: { videoId: string }) {
  const { summaryData, exportMd, exportPdf } = useSummary(videoId);

  // If no summary data is available, show a loading state
  if (!summaryData) {
    return (
      <div className="w-96 h-[28rem] bg-white rounded-lg shadow-lg flex flex-col items-center justify-center">
        <p className="text-gray-500">Loading summary...</p>
      </div>
    );
  }

  // Extract summary and terms from summaryData
  const summary = Array.isArray(summaryData.summary) 
    ? summaryData.summary 
    : summaryData.summary 
      ? [summaryData.summary] 
      : [];
  
  const terms = Array.isArray(summaryData.terms) 
    ? summaryData.terms.map(term => {
        if (typeof term === 'string') {
          return { term, def: '' }; // Handle string-only terms
        }
        return term;
      }) 
    : [];

  return (
    <div className="w-96 h-[28rem] bg-white rounded-lg shadow-lg flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto text-sm space-y-2">
        <h2 className="font-semibold text-base mb-1">Summary</h2>
        <ul className="list-disc list-inside space-y-1">
          {summary.map((p: string, i: number) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        <h2 className="font-semibold text-base mt-3 mb-1">Key Terms</h2>
        <div className="flex flex-wrap gap-2">
          {terms.map((t: { term: string; def: string }) => (
            <TermCard key={t.term} term={t.term} def={t.def} />
          ))}
        </div>
      </div>
      <ExportButtons onMd={exportMd} onPdf={exportPdf} />
    </div>
  );
}

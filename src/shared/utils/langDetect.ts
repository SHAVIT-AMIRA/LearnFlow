// ---------- src/shared/utils/langDetect.ts ----------
/** Very small client‑side language detector based on Intl API */
export function detectLang(text: string): string {
    try {
      // @ts-ignore experimental
      const det = (Intl as any).Locale ? new (Intl as any).Locale(text) : null;
      return det?.language || "und";
    } catch {
      return "und";
    }
  }
  
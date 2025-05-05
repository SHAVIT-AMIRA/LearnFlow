/**
 * Common types used across the application
 */

export interface CaptionDetector {
  source: string;
  detect(): HTMLElement | null;
  cleanup(): void;
}
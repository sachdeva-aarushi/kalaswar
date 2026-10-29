export type SpokenLang = "en" | "hi" | "mr";

const DEVANAGARI = /[\u0900-\u097F]/;

/**
 * The agent must never read machine identifiers aloud: they are hard to hear
 * and mean nothing to the artisan. UUIDs and order references are stripped as
 * a final safety net — the prompt already forbids speaking them.
 */
export function stripSpokenIds(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\bKSW[-\s]?\d+\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Pick the speaking voice from the reply itself: she may speak Hindi while the
 * app text is English, so the voice must follow her words, not the UI toggle.
 * Devanagari is shared with Marathi — the Marathi voice is used when the
 * interface is already in Marathi.
 */
export function detectSpokenLang(text: string, fallback: SpokenLang): SpokenLang {
  if (DEVANAGARI.test(text)) return fallback === "mr" ? "mr" : "hi";
  return fallback;
}

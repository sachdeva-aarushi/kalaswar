/**
 * Craft-guidance matching — deterministic keyword overlap between an
 * artisan's recorded craft and recorded guides. Never guesses: when nothing
 * matches, the caller says so honestly instead of offering a distant guide.
 */

export interface GuideLike {
  title: string;
  craft: string;
}

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z\u0900-\u097F]{3,}/g) ?? []);
}

/** Guides whose craft/title share at least one meaningful token with the artisan's craft, best match first. */
export function matchCraftGuides<T extends GuideLike>(guides: T[], craft: string, limit = 4): T[] {
  const wanted = new Set(tokens(craft));
  if (wanted.size === 0) return [];
  const scored = guides
    .map((g) => {
      const hay = tokens(`${g.craft} ${g.title}`);
      const score = hay.reduce((s, tk) => s + (wanted.has(tk) ? 1 : 0), 0);
      return { g, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ g }) => g);
}

// Search helpers shared by the search box (browser) and pages (server).

export type Suggestion = {
  value: string; // what gets searched when chosen
  label: string; // what's shown
  detail?: string; // a hint on the right, e.g. "Dairy · 3 branches"
};

const norm = (s: string) => s.toLowerCase().trim();

// Best matches first: names that start with the text, then a word that starts
// with it, then names that contain it anywhere.
export function rankSuggestions(query: string, options: Suggestion[], limit = 8): Suggestion[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { s: Suggestion; score: number }[] = [];
  for (const s of options) {
    const label = norm(s.label);
    const score = label.startsWith(q)
      ? 0
      : label.split(/[\s\-/(]+/).some((w) => w.startsWith(q))
        ? 1
        : label.includes(q)
          ? 2
          : -1;
    if (score >= 0) scored.push({ s, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.s.label.localeCompare(b.s.label))
    .slice(0, limit)
    .map((x) => x.s);
}

// Number of single-letter edits (add, remove, change) to turn a into b.
function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

// For typos: the closest name, if it's only a few letters off. Compares the text
// with whole names and with each word in them ("chiken" → "Chicken wings").
export function closestMatch(query: string, candidates: string[]): string | null {
  const q = norm(query);
  if (q.length < 3) return null;
  const allowed = Math.max(1, Math.floor(q.length / 4));
  let best: { name: string; distance: number } | null = null;
  for (const name of candidates) {
    const parts = [norm(name), ...norm(name).split(/\s+/)];
    const distance = Math.min(...parts.map((p) => editDistance(q, p)));
    if (distance > 0 && distance <= allowed && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name ?? null;
}

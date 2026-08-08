const SHORTLIST_PREFIX = "ask.shortlist.";

function buildKey(query: string, mode: string, city: string): string {
  return `${SHORTLIST_PREFIX}${mode}|${query}|${city}`;
}

export function loadShortlist(query: string, mode: string, city: string): string[] {
  try {
    const raw = window.sessionStorage.getItem(buildKey(query, mode, city));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveShortlist(query: string, mode: string, city: string, ids: string[]): void {
  window.sessionStorage.setItem(buildKey(query, mode, city), JSON.stringify(ids.slice(0, 5)));
}

export function clearShortlist(query: string, mode: string, city: string): void {
  window.sessionStorage.removeItem(buildKey(query, mode, city));
}

export function isInShortlist(ids: string[], resultId: string): boolean {
  return ids.includes(resultId);
}

export function addToShortlist(ids: string[], resultId: string): { ids: string[]; blocked: boolean } {
  if (ids.includes(resultId)) return { ids, blocked: false };
  if (ids.length >= 5) return { ids, blocked: true };
  return { ids: [...ids, resultId], blocked: false };
}

export function removeFromShortlist(ids: string[], resultId: string): string[] {
  return ids.filter(id => id !== resultId);
}

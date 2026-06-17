// Einfaches Rate-Limit pro IP (Sliding Window), analog zu anderen Karriaro-Tools.
// In-Memory pro Funktions-Instanz — Best-Effort-Schutz gegen Missbrauch.

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20; // pro IP pro Minute
const hits = new Map(); // ip -> number[] (Zeitstempel)

/**
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfter: number }}
 */
export function rateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    hits.set(key, recent);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  recent.push(now);
  hits.set(key, recent);

  // Gelegentliches Aufräumen, damit die Map nicht unbegrenzt wächst.
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      const live = arr.filter((t) => now - t < WINDOW_MS);
      if (live.length === 0) hits.delete(k);
      else hits.set(k, live);
    }
  }

  return { allowed: true, retryAfter: 0 };
}

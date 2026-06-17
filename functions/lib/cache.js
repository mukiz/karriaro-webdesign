// Kurzes In-Memory-Caching pro Domain (TTL ~10 Min) gegen Mehrfach-Last.
// Pro Funktions-Instanz; bei mehreren Instanzen ist das ein Best-Effort-Cache,
// was für ein Akquise-Werkzeug ausreichend ist. Wichtig: Es werden NUR
// transiente, nicht-personenbezogene Ergebnis-Daten gehalten (Build-Brief §11).

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;
const store = new Map(); // key -> { data, expiry }

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet(key, data) {
  if (store.size >= MAX_ENTRIES) {
    // Ältesten Eintrag verwerfen (einfache FIFO-Begrenzung).
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { data, expiry: Date.now() + TTL_MS });
}

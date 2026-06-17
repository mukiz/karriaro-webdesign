// URL-Normalisierung & -Validierung für das Sofort-Skizze-Werkzeug.
// Ergänzt fehlendes Schema, prüft den Hostnamen und liefert eine saubere
// Domain zurück. Wirft bei offensichtlich ungültigen Eingaben.

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

// Hosts, die wir aus Datenschutz-/Missbrauchsgründen nicht serverseitig laden.
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

/**
 * @param {string} input  Roh-Eingabe des Interessenten (z. B. "ihrefirma.de")
 * @returns {{ url: string, domain: string }}
 * @throws {Error} bei ungültiger Eingabe
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') throw new Error('url fehlt');
  let raw = input.trim();
  if (!raw) throw new Error('url ist leer');

  // Schema ergänzen, wenn keins angegeben wurde.
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('url ist keine gültige Adresse');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error('Host nicht erlaubt');
  }
  // Keine rohen IP-Adressen oder interne Hosts.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || !hostname.includes('.')) {
    throw new Error('Host nicht erlaubt');
  }
  if (!HOSTNAME_RE.test(hostname)) {
    throw new Error('Host ungültig');
  }

  // Domain ohne führendes www. für Logo-Fallbacks / Anzeige.
  const domain = hostname.replace(/^www\./, '');

  return { url: parsed.toString(), domain };
}

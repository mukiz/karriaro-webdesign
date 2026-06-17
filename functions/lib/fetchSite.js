// Lädt eine fremde Seite serverseitig (kein CORS-Limit).
// Timeout ~8 s, folgt Redirects, eigener User-Agent, Größenbegrenzung.
// Schlägt das Laden fehl, liefert die Funktion einen "leeren" Zustand,
// damit der Aufrufer mit reduzierten Daten (Branche + Domain) weiterarbeiten kann.

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000; // ~1,5 MB reichen für <head> + Hero bei Weitem.
const USER_AGENT =
  'KarriaroSofortSkizze/1.0 (+https://karriaro.example; Audit-Bot, transient)';

/**
 * @param {string} url  normalisierte, absolute URL
 * @returns {Promise<{ ok: boolean, html: string, finalUrl: string,
 *   status: number|null, elapsedMs: number, bytes: number }>}
 */
export async function fetchSite(url) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !/text\/html|application\/xhtml/i.test(contentType)) {
      // Kein verwertbares HTML — trotzdem mit reduzierten Daten weiter.
      return empty(started, res.status);
    }

    const html = await readLimited(res, MAX_BYTES);
    return {
      ok: true,
      html,
      finalUrl: res.url || url,
      status: res.status,
      elapsedMs: Date.now() - started,
      bytes: Buffer.byteLength(html, 'utf8'),
    };
  } catch {
    // Timeout, DNS-Fehler, abgebrochen … — niemals den Gesamt-Flow kippen.
    return empty(started, null);
  } finally {
    clearTimeout(timer);
  }
}

function empty(started, status) {
  return {
    ok: false,
    html: '',
    finalUrl: '',
    status,
    elapsedMs: Date.now() - started,
    bytes: 0,
  };
}

// Liest den Response-Body, bricht aber bei maxBytes ab (Schutz vor Riesen-Seiten).
async function readLimited(res, maxBytes) {
  if (!res.body || typeof res.body.getReader !== 'function') {
    const text = await res.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  out += decoder.decode();
  return out;
}

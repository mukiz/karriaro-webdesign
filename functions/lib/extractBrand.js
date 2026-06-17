// Marken-Token-Extraktion aus dem geladenen HTML (siehe Build-Brief §6).
//   Logo:   og:image → apple-touch-icon → link[rel=icon] → favicons → clearbit
//   Akzent: meta[theme-color] (sonst null → Frontend nutzt Branchen-Standardfarbe)
//   Name:   og:site_name → <title> (bereinigt) → aus Domain abgeleitet
//
// Die Interessenten-Farbe ist bewusst nur ein *Akzent*; der Karriaro-Rahmen
// (Navy/Cream/Brass) bleibt im Frontend bestehen.

import { parse } from 'node-html-parser';

const HEX_RE = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i;

/**
 * @param {string} html      geladenes HTML ('' wenn Fetch fehlschlug)
 * @param {string} domain    bereinigte Domain (z. B. "ihrefirma.de")
 * @param {string} baseUrl   absolute URL der Seite (für relative Logo-Pfade)
 * @returns {{ name: string, logoUrl: string|null, accent: string|null }}
 */
export function extractBrand(html, domain, baseUrl) {
  if (!html) {
    return {
      name: nameFromDomain(domain),
      logoUrl: faviconFallback(domain),
      accent: null,
    };
  }

  let root;
  try {
    root = parse(html, { comment: false });
  } catch {
    return {
      name: nameFromDomain(domain),
      logoUrl: faviconFallback(domain),
      accent: null,
    };
  }

  const meta = (selector, attr = 'content') => {
    const el = root.querySelector(selector);
    const v = el && el.getAttribute(attr);
    return v ? v.trim() : '';
  };

  // ---- Name ---------------------------------------------------------------
  let name =
    meta('meta[property="og:site_name"]') ||
    cleanTitle(textOf(root.querySelector('title'))) ||
    nameFromDomain(domain);
  name = name.slice(0, 80);

  // ---- Logo ---------------------------------------------------------------
  const candidates = [
    meta('meta[property="og:image"]'),
    meta('meta[property="og:image:url"]'),
    meta('link[rel="apple-touch-icon"]', 'href'),
    meta('link[rel="apple-touch-icon-precomposed"]', 'href'),
    meta('link[rel="icon"]', 'href'),
    meta('link[rel="shortcut icon"]', 'href'),
  ].filter(Boolean);

  let logoUrl = null;
  for (const c of candidates) {
    const abs = absolutize(c, baseUrl);
    if (abs && !looksTooSmall(c)) {
      logoUrl = abs;
      break;
    }
  }
  if (!logoUrl) logoUrl = faviconFallback(domain);

  // ---- Akzentfarbe --------------------------------------------------------
  let accent = normalizeHex(meta('meta[name="theme-color"]'));
  if (!accent) {
    // Häufige zweite Quelle: MS-Tile-Farbe.
    accent = normalizeHex(meta('meta[name="msapplication-TileColor"]'));
  }
  // Dominante Farbe aus dem Logo abzuleiten würde serverseitige Bilddekodierung
  // erfordern (schwergewichtig). Ist keine Farbe ermittelbar, bleibt accent null
  // und das Frontend nutzt die Branchen-Standardfarbe (Datenvertrag erlaubt null).

  return { name, logoUrl, accent };
}

// --- Helpers ---------------------------------------------------------------

function textOf(el) {
  return el ? el.text || '' : '';
}

function cleanTitle(title) {
  if (!title) return '';
  // Übliche Trenner: "Firma – Slogan", "Firma | Branche" → vorderer Teil.
  const parts = title.split(/\s+[|–—·-]\s+/);
  const first = (parts[0] || title).trim();
  return first.replace(/\s+/g, ' ').slice(0, 80);
}

function nameFromDomain(domain) {
  const core = (domain || '').replace(/^www\./, '').split('.')[0] || 'Ihr Betrieb';
  return core
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function absolutize(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl || undefined).toString();
  } catch {
    return null;
  }
}

// Sehr grobe Heuristik gegen Mini-Icons (Breite < 8 px, wenn im Pfad codiert).
function looksTooSmall(href) {
  const m = href.match(/(\d{1,4})x(\d{1,4})/);
  if (m) {
    const w = parseInt(m[1], 10);
    if (w > 0 && w < 8) return true;
  }
  return false;
}

function faviconFallback(domain) {
  if (!domain) return null;
  // Google-Favicon-Dienst liefert robust ein 128px-Icon; Clearbit als
  // zweite Stufe übernimmt das Frontend bei Ladefehler nicht automatisch —
  // wir liefern hier die zuverlässigste einzelne URL.
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

function normalizeHex(value) {
  if (!value) return null;
  const v = value.trim();
  if (!HEX_RE.test(v)) return null;
  let hex = v.startsWith('#') ? v : `#${v}`;
  if (hex.length === 4) {
    // #abc → #aabbcc
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex.toLowerCase();
}

// Extrahiert knappe, nicht-personenbezogene Seiten-Fakten zum Grounding des
// KI-Textes (Build-Brief §7). Bewusst sparsam: Meta-Description, erste H1,
// erkennbare Stadt/PLZ-Region. Keine Anreicherung über die Domain hinaus (§11).

import { parse } from 'node-html-parser';

export function extractFacts(html) {
  if (!html) return {};
  let root;
  try {
    root = parse(html, { comment: false });
  } catch {
    return {};
  }

  const facts = {};

  const desc =
    attr(root, 'meta[name="description"]', 'content') ||
    attr(root, 'meta[property="og:description"]', 'content');
  if (desc) facts.beschreibung = clip(desc, 200);

  const h1 = root.querySelector('h1');
  if (h1 && h1.text) facts.hauptueberschrift = clip(h1.text, 120);

  const h2 = root.querySelector('h2');
  if (h2 && h2.text) facts.unterueberschrift = clip(h2.text, 120);

  // Stadt/Region: PLZ + Ort sind ein nützliches, nicht-personenbezogenes Signal
  // für den Geo-Bezug ("Ihre Stadt").
  const plzOrt = (root.text || '').match(/\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß.\- ]{2,30})/);
  if (plzOrt) facts.regionHinweis = clip(`${plzOrt[1]} ${plzOrt[2]}`.trim(), 60);

  return facts;
}

function attr(root, sel, name) {
  const el = root.querySelector(sel);
  const v = el && el.getAttribute(name);
  return v ? v.trim() : '';
}

function clip(s, n) {
  return s.replace(/\s+/g, ' ').trim().slice(0, n);
}

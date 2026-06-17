// Lokale Text-Vorlage (stiller Fallback).
// Wird genutzt, wenn der Server-Endpunkt nicht erreichbar ist oder ein Fehler
// auftritt — damit das Werkzeug für Interessenten nie kaputt aussieht
// (Build-Brief §4.3). UWG-sicher: keine Superlative/Absolut-Behauptungen,
// Auffindbarkeit nur als Möglichkeit.

import { WIDGET_BY_KEY, DEFAULT_ACCENT } from './widgets/index.jsx';

const GENERIC_FINDINGS = [
  { label: 'Telefonnummer am Handy nicht klickbar', severity: 'high' },
  { label: 'Ladezeit zu langsam für Mobil', severity: 'medium' },
  { label: 'Kein lokales Schema (LocalBusiness)', severity: 'medium' },
  { label: 'Kein direkter Kontaktweg auf der Startseite', severity: 'low' },
];

/**
 * Baut aus den Eingaben eine vollständige, lokale Skizzen-Antwort im selben
 * Datenformat wie der Server (damit das Rendering identisch funktioniert).
 *
 * @param {{ url: string, branche: string, ziel: string }} input
 * @returns {object} Antwort im Server-Datenvertrag (meta.source = 'local')
 */
export function composeCopy({ url, branche, ziel }) {
  const domain = domainFromInput(url);
  const name = nameFromDomain(domain);
  const widget = pickWidgetLocal(branche);
  const label = capitalize((branche || 'Handwerk').split(/[\/,]/)[0].trim() || 'Betrieb');
  const wish = (ziel || '').trim();

  return {
    brand: {
      name,
      domain,
      logoUrl: domain
        ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
        : null,
      accent: widget.defaultAccent || DEFAULT_ACCENT,
    },
    copy: {
      eyebrow: `${label} · Ihre Region`,
      headline: `${name} — sichtbar, schnell, lokal.`,
      subline: wish
        ? `Eine klare Startseite, die hilft: ${lcfirst(wish)}.`
        : `Eine klare Startseite, die Anfragen aus der Nachbarschaft leichter macht.`,
      widgetPitch: `Mit dem ${widget.name} bekommen Besucher sofort einen konkreten Mehrwert.`,
      geoHook: `Sauber strukturiert kann Ihre Seite bei Google und KI-Assistenten besser auffindbar werden.`,
      found: `Konzept-Skizze auf Basis von ${domain || 'Ihrer Domain'} — eine Richtung, kein fertiges Template.`,
    },
    widget: { key: widget.key, name: widget.name },
    audit: {
      score: 46,
      topLeak: GENERIC_FINDINGS[0].label,
      findings: GENERIC_FINDINGS,
    },
    meta: { source: 'local', cached: false },
  };
}

function pickWidgetLocal(branche) {
  const norm = (branche || '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
  const map = {
    dachdecker: 'bafa',
    immobilien: 'wert',
    makler: 'wert',
    friseur: 'friseur',
    salon: 'friseur',
    restaurant: 'wein',
    gastro: 'wein',
    spedition: 'fracht',
    logistik: 'fracht',
    sanitar: 'sanitaer',
    klempner: 'sanitaer',
  };
  let key = 'generic';
  for (const [needle, k] of Object.entries(map)) {
    if (norm.includes(needle)) {
      key = k;
      break;
    }
  }
  return WIDGET_BY_KEY[key] || WIDGET_BY_KEY.generic;
}

function domainFromInput(url) {
  let raw = (url || '').trim();
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^https?:\/\//i, '').split('/')[0];
  }
}

function nameFromDomain(domain) {
  const core = (domain || '').split('.')[0] || 'Ihr Betrieb';
  return core.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function capitalize(s) {
  s = (s || '').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

function lcfirst(s) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

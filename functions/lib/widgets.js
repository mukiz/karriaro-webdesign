// Branchen-Werkzeug-Mapping (Build-Brief §8).
// Wählt anhand der Branche das passende Werkzeug. Die eigentliche interaktive
// Umsetzung liegt im Frontend (web/src/widgets); hier wird nur key + Name +
// Branchen-Standardfarbe als Fallback-Akzent bestimmt.

const WIDGETS = {
  dachdecker: { key: 'bafa', name: 'BAFA-Förderrechner' },
  immobilienmakler: { key: 'wert', name: 'Wertrechner' },
  makler: { key: 'wert', name: 'Wertrechner' },
  friseur: { key: 'friseur', name: 'Style-Finder' },
  salon: { key: 'friseur', name: 'Style-Finder' },
  restaurant: { key: 'wein', name: 'Wein-Berater' },
  gastronomie: { key: 'wein', name: 'Wein-Berater' },
  spedition: { key: 'fracht', name: 'Frachtrechner' },
  logistik: { key: 'fracht', name: 'Frachtrechner' },
  sanitaer: { key: 'sanitaer', name: 'Notfall-Anrückzeit' },
  klempner: { key: 'sanitaer', name: 'Notfall-Anrückzeit' },
};

const GENERIC = { key: 'generic', name: 'Anfrage-Assistent' };

// Branchen-Standardfarbe je Werkzeug — nur Fallback, wenn vom Interessenten
// keine Akzentfarbe ermittelbar war.
const WIDGET_DEFAULT_ACCENT = {
  bafa: '#2E6F5E',
  wert: '#2F5DA8',
  friseur: '#9C3C7A',
  wein: '#7A2E3A',
  fracht: '#3A5A78',
  sanitaer: '#C2592E',
  generic: '#C2974A',
};

/**
 * @param {string} branche  Roh-Eingabe (z. B. "Sanitär / Klempner")
 * @returns {{ key: string, name: string, defaultAccent: string }}
 */
export function pickWidget(branche) {
  const norm = normalize(branche);
  let match = GENERIC;
  for (const [needle, widget] of Object.entries(WIDGETS)) {
    if (norm.includes(needle)) {
      match = widget;
      break;
    }
  }
  return { ...match, defaultAccent: WIDGET_DEFAULT_ACCENT[match.key] };
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

import React, { useState } from 'react';

// Branchen-Werkzeuge (Build-Brief §8). Jedes ist einbettbar, interaktiv und im
// Akzent des Interessenten gehalten (per `accent`-Prop). Demo-Rechenwerte sind
// als Schätzung gekennzeichnet ("Schätzung" / „ca."). In Produktion würden hier
// echte Parameter/Daten rechnen, wo verfügbar.

export const DEFAULT_ACCENT = '#C2974A';

// --- kleine UI-Bausteine ----------------------------------------------------

function Field({ label, children }) {
  return (
    <label className="wx-field">
      <span className="wx-label">{label}</span>
      {children}
    </label>
  );
}

function Result({ accent, children, hint }) {
  return (
    <div className="wx-result" style={{ borderColor: accent }}>
      <div className="wx-result-value" style={{ color: accent }}>
        {children}
      </div>
      {hint && <div className="wx-hint">{hint}</div>}
    </div>
  );
}

function Button({ accent, children, ...rest }) {
  return (
    <button type="button" className="wx-btn" style={{ background: accent }} {...rest}>
      {children}
    </button>
  );
}

const SCHAETZUNG = 'Unverbindliche Schätzung · keine Zusage';

// --- Dachdecker: BAFA-Förderrechner ----------------------------------------

function BafaWidget({ accent }) {
  const [qm, setQm] = useState(120);
  const [done, setDone] = useState(false);
  // Demo: grobe Schätzung Dämmkosten und Förderquote.
  const kosten = Math.round(qm * 190);
  const foerderung = Math.round(kosten * 0.15);
  return (
    <div>
      <Field label="Dachfläche (m²)">
        <input
          type="number"
          min="20"
          max="1000"
          value={qm}
          onChange={(e) => {
            setQm(Number(e.target.value) || 0);
            setDone(true);
          }}
        />
      </Field>
      <Button accent={accent} onClick={() => setDone(true)}>
        Förderung schätzen
      </Button>
      {done && (
        <Result accent={accent} hint={SCHAETZUNG}>
          ca. {foerderung.toLocaleString('de-DE')} € Zuschuss
        </Result>
      )}
    </div>
  );
}

// --- Immobilienmakler: Wertrechner -----------------------------------------

function WertWidget({ accent }) {
  const [qm, setQm] = useState(95);
  const [lage, setLage] = useState('mittel');
  const [done, setDone] = useState(false);
  const basis = { einfach: 2600, mittel: 3600, gut: 4900 }[lage];
  const wert = Math.round((qm * basis) / 1000) * 1000;
  return (
    <div>
      <Field label="Wohnfläche (m²)">
        <input
          type="number"
          min="20"
          max="600"
          value={qm}
          onChange={(e) => {
            setQm(Number(e.target.value) || 0);
            setDone(true);
          }}
        />
      </Field>
      <Field label="Lage">
        <select value={lage} onChange={(e) => { setLage(e.target.value); setDone(true); }}>
          <option value="einfach">einfach</option>
          <option value="mittel">mittel</option>
          <option value="gut">gut</option>
        </select>
      </Field>
      <Button accent={accent} onClick={() => setDone(true)}>
        Wert schätzen
      </Button>
      {done && (
        <Result accent={accent} hint={SCHAETZUNG}>
          ca. {wert.toLocaleString('de-DE')} €
        </Result>
      )}
    </div>
  );
}

// --- Friseur / Salon: Style-Finder -----------------------------------------

function FriseurWidget({ accent }) {
  const [laenge, setLaenge] = useState('mittel');
  const [typ, setTyp] = useState('natuerlich');
  const map = {
    'kurz|natuerlich': 'Soft Pixie mit weichem Übergang',
    'kurz|markant': 'Textured Crop mit klarer Kante',
    'mittel|natuerlich': 'Long Bob mit fließenden Lagen',
    'mittel|markant': 'Curtain-Bangs mit Struktur',
    'lang|natuerlich': 'Lagen-Schnitt mit Glow-Balayage',
    'lang|markant': 'Statement-Pony mit Längen-Kontur',
  };
  const tip = map[`${laenge}|${typ}`] || 'Beratungstermin für Ihren Look';
  return (
    <div>
      <Field label="Länge">
        <select value={laenge} onChange={(e) => setLaenge(e.target.value)}>
          <option value="kurz">kurz</option>
          <option value="mittel">mittel</option>
          <option value="lang">lang</option>
        </select>
      </Field>
      <Field label="Stil">
        <select value={typ} onChange={(e) => setTyp(e.target.value)}>
          <option value="natuerlich">natürlich</option>
          <option value="markant">markant</option>
        </select>
      </Field>
      <Result accent={accent} hint="Stil-Vorschlag · Feinabstimmung im Salon">
        {tip}
      </Result>
    </div>
  );
}

// --- Restaurant: Wein-Berater ----------------------------------------------

function WeinWidget({ accent }) {
  const [gericht, setGericht] = useState('rind');
  const map = {
    rind: 'Kräftiger Rotwein — z. B. Spätburgunder',
    fisch: 'Frischer Weißwein — z. B. Riesling trocken',
    pasta: 'Mittelkräftig — z. B. Chianti',
    vegetarisch: 'Leicht & fruchtig — z. B. Grauburgunder',
    dessert: 'Edelsüß — z. B. Auslese',
  };
  return (
    <div>
      <Field label="Ihr Gericht">
        <select value={gericht} onChange={(e) => setGericht(e.target.value)}>
          <option value="rind">Rind / Wild</option>
          <option value="fisch">Fisch</option>
          <option value="pasta">Pasta</option>
          <option value="vegetarisch">Vegetarisch</option>
          <option value="dessert">Dessert</option>
        </select>
      </Field>
      <Result accent={accent} hint="Empfehlung · Auswahl variiert nach Karte">
        {map[gericht]}
      </Result>
    </div>
  );
}

// --- Spedition / Logistik: Frachtrechner ------------------------------------

function FrachtWidget({ accent }) {
  const [km, setKm] = useState(250);
  const [gewicht, setGewicht] = useState(500);
  const [done, setDone] = useState(false);
  // Demo: Grundpreis + km-Satz + Gewichtszuschlag.
  const preis = Math.round(60 + km * 0.9 + gewicht * 0.12);
  return (
    <div>
      <Field label="Entfernung (km)">
        <input
          type="number"
          min="1"
          max="3000"
          value={km}
          onChange={(e) => { setKm(Number(e.target.value) || 0); setDone(true); }}
        />
      </Field>
      <Field label="Gewicht (kg)">
        <input
          type="number"
          min="1"
          max="24000"
          value={gewicht}
          onChange={(e) => { setGewicht(Number(e.target.value) || 0); setDone(true); }}
        />
      </Field>
      <Button accent={accent} onClick={() => setDone(true)}>
        Fracht schätzen
      </Button>
      {done && (
        <Result accent={accent} hint={SCHAETZUNG}>
          ca. {preis.toLocaleString('de-DE')} €
        </Result>
      )}
    </div>
  );
}

// --- Sanitär / Klempner: Notfall-Anrückzeit ---------------------------------

function SanitaerWidget({ accent }) {
  const [plz, setPlz] = useState('');
  const [done, setDone] = useState(false);
  // Demo: Anrückzeit aus PLZ-Quersumme abgeleitet (deterministisch, plausibel).
  const minutes = plz.length >= 4
    ? 25 + (plz.split('').reduce((a, c) => a + (Number(c) || 0), 0) % 35)
    : null;
  return (
    <div>
      <Field label="Ihre PLZ">
        <input
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={plz}
          placeholder="z. B. 50667"
          onChange={(e) => {
            setPlz(e.target.value.replace(/\D/g, '').slice(0, 5));
            setDone(true);
          }}
        />
      </Field>
      <Button accent={accent} onClick={() => setDone(true)}>
        Anrückzeit prüfen
      </Button>
      {done && minutes !== null && (
        <Result accent={accent} hint="Schätzung · abhängig von Auslastung">
          in ca. {minutes} Min. vor Ort
        </Result>
      )}
    </div>
  );
}

// --- Alle übrigen: Anfrage-Assistent ---------------------------------------

function GenericWidget({ accent }) {
  const [thema, setThema] = useState('angebot');
  const [sent, setSent] = useState(false);
  const map = {
    angebot: 'Wir melden uns mit einem unverbindlichen Angebot.',
    termin: 'Wir schlagen Ihnen passende Termine vor.',
    rueckruf: 'Wir rufen Sie zur Wunschzeit zurück.',
  };
  return (
    <div>
      <Field label="Ihr Anliegen">
        <select value={thema} onChange={(e) => { setThema(e.target.value); setSent(false); }}>
          <option value="angebot">Angebot anfragen</option>
          <option value="termin">Termin finden</option>
          <option value="rueckruf">Rückruf wünschen</option>
        </select>
      </Field>
      <Button accent={accent} onClick={() => setSent(true)}>
        Weiter
      </Button>
      {sent && (
        <Result accent={accent} hint="Demo-Vorschau · echte Anfrage in der finalen Seite">
          {map[thema]}
        </Result>
      )}
    </div>
  );
}

// --- Registry ---------------------------------------------------------------

export const WIDGET_BY_KEY = {
  bafa: { key: 'bafa', name: 'BAFA-Förderrechner', defaultAccent: '#2E6F5E', Component: BafaWidget },
  wert: { key: 'wert', name: 'Wertrechner', defaultAccent: '#2F5DA8', Component: WertWidget },
  friseur: { key: 'friseur', name: 'Style-Finder', defaultAccent: '#9C3C7A', Component: FriseurWidget },
  wein: { key: 'wein', name: 'Wein-Berater', defaultAccent: '#7A2E3A', Component: WeinWidget },
  fracht: { key: 'fracht', name: 'Frachtrechner', defaultAccent: '#3A5A78', Component: FrachtWidget },
  sanitaer: { key: 'sanitaer', name: 'Notfall-Anrückzeit', defaultAccent: '#C2592E', Component: SanitaerWidget },
  generic: { key: 'generic', name: 'Anfrage-Assistent', defaultAccent: '#C2974A', Component: GenericWidget },
};

/**
 * Rendert das Werkzeug zu einem key. Unbekannte keys fallen auf 'generic'.
 */
export function WidgetByKey({ widgetKey, accent }) {
  const entry = WIDGET_BY_KEY[widgetKey] || WIDGET_BY_KEY.generic;
  const Comp = entry.Component;
  return <Comp accent={accent || entry.defaultAccent || DEFAULT_ACCENT} />;
}

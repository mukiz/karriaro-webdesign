import React, { useEffect, useRef, useState } from 'react';
import PhyllotaxisSeal from './PhyllotaxisSeal.jsx';
import { WidgetByKey } from './widgets/index.jsx';
import { composeCopy } from './composeCopy.js';

// Karriaro „Sofort-Skizze" — Frontend (Build-Brief §4).
// Erlebnis: Eingabe → Phyllotaxis-Lade-Sequenz → „Heute vs. Konzept"-Split
// mit echtem Audit + Branchen-Werkzeug → CTA. Die Datenquelle ist der eigene
// Server-Endpunkt /api/sofort-skizze; bei Fehler/Timeout greift still die
// lokale Vorlage composeCopy (das Werkzeug sieht nie kaputt aus).

const ENDPOINT = '/api/sofort-skizze';
const MIN_LOADING_MS = 2600; // Lade-Siegel soll sichtbar „füllen".
const REQUEST_TIMEOUT_MS = 26000;

const BRANCHEN = [
  { value: 'dachdecker', label: 'Dachdecker' },
  { value: 'immobilienmakler', label: 'Immobilienmakler' },
  { value: 'friseur', label: 'Friseur / Salon' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'spedition', label: 'Spedition / Logistik' },
  { value: 'sanitaer', label: 'Sanitär / Klempner' },
  { value: 'sonstige', label: 'Andere Branche' },
];

const STATUS_LINES = [
  'Seite wird sicher geladen …',
  'Marken-Tokens werden gelesen …',
  'Audit läuft — echte Befunde …',
  'Konzept-Text wird formuliert …',
  'Skizze wird gezeichnet …',
];

export default function SofortSkizze() {
  const [phase, setPhase] = useState('idle'); // idle | loading | result
  const [url, setUrl] = useState('');
  const [branche, setBranche] = useState('sanitaer');
  const [ziel, setZiel] = useState('');
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState('');
  const [data, setData] = useState(null);
  const [statusIdx, setStatusIdx] = useState(0);

  const statusTimer = useRef(null);

  useEffect(() => () => clearInterval(statusTimer.current), []);

  function startStatusCycle() {
    setStatusIdx(0);
    clearInterval(statusTimer.current);
    statusTimer.current = setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_LINES.length - 1));
    }, 650);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!url.trim()) {
      setFormError('Bitte Ihre Website-Adresse eingeben.');
      return;
    }
    if (!consent) {
      setFormError('Bitte die Einwilligung bestätigen, um zu starten.');
      return;
    }

    setPhase('loading');
    startStatusCycle();
    const startedAt = Date.now();

    const payload = await fetchSkizze({ url, branche, ziel });

    // Mindest-Anzeigedauer, damit die Lade-Sequenz wirkt.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await sleep(MIN_LOADING_MS - elapsed);
    }
    clearInterval(statusTimer.current);

    setData(payload);
    setPhase('result');
  }

  function reset() {
    setPhase('idle');
    setData(null);
    setConsent(false);
  }

  return (
    <div className="app">
      <Header />
      <main className="wrap">
        {phase === 'idle' && (
          <IntakeForm
            url={url}
            setUrl={setUrl}
            branche={branche}
            setBranche={setBranche}
            ziel={ziel}
            setZiel={setZiel}
            consent={consent}
            setConsent={setConsent}
            formError={formError}
            onSubmit={handleSubmit}
          />
        )}

        {phase === 'loading' && (
          <Loading statusLine={STATUS_LINES[statusIdx]} />
        )}

        {phase === 'result' && data && <ResultView data={data} onReset={reset} />}
      </main>
      <Footer />
    </div>
  );
}

// --- Netzwerk ---------------------------------------------------------------

async function fetchSkizze({ url, branche, ziel }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, branche, ziel }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    if (!json || !json.brand || !json.copy) throw new Error('unvollständig');
    return json;
  } catch {
    // Stiller Fallback — keine rote Fehlerbox für Interessenten (§4.3).
    return composeCopy({ url, branche, ziel });
  } finally {
    clearTimeout(t);
  }
}

// --- Teil-Komponenten -------------------------------------------------------

function Header() {
  return (
    <header className="topbar">
      <div className="brandmark">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-name">Karriaro</span>
      </div>
      <span className="kicker">Sofort-Skizze</span>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>© {new Date().getFullYear()} Karriaro Webdesign · Köln</span>
      <span>Konzept-Skizze — kein fertiges Template. Eingaben werden nicht gespeichert.</span>
    </footer>
  );
}

function IntakeForm(props) {
  const {
    url, setUrl, branche, setBranche, ziel, setZiel,
    consent, setConsent, formError, onSubmit,
  } = props;

  return (
    <section className="intake">
      <p className="eyebrow">Konzept-Skizze in ~30 Sekunden</p>
      <h1 className="display">
        Ihre Seite heute — und wie sie im Karriaro-Stil aussehen könnte.
      </h1>
      <p className="lede">
        Adresse und Branche eingeben. Wir zeigen Ihnen eine{' '}
        <strong>Konzept-Skizze</strong> mit echten Audit-Befunden und einem
        funktionierenden Branchen-Werkzeug — eine Richtung, kein fertiges Template.
      </p>

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <label className="field">
            <span className="field-label">Website-Adresse</span>
            <input
              type="text"
              inputMode="url"
              placeholder="ihrefirma.de"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              aria-required="true"
            />
          </label>
          <label className="field">
            <span className="field-label">Branche</span>
            <select value={branche} onChange={(e) => setBranche(e.target.value)}>
              {BRANCHEN.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Ihr Ziel (optional)</span>
          <input
            type="text"
            placeholder="z. B. mehr Anfragen aus der Nachbarschaft"
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
          />
        </label>

        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-required="true"
          />
          <span>
            Ich bin damit einverstanden, dass meine Eingaben und das öffentlich
            erreichbare Logo meiner Seite <strong>einmalig und transient</strong>{' '}
            zur Erstellung dieser Konzept-Skizze verarbeitet werden. Es findet
            keine Speicherung und keine Veröffentlichung statt.
          </span>
        </label>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className="cta" disabled={!consent}>
          Konzept-Skizze erstellen →
        </button>
      </form>
    </section>
  );
}

function Loading({ statusLine }) {
  return (
    <section className="loading" aria-live="polite" aria-busy="true">
      <div className="seal-wrap">
        <PhyllotaxisSeal active accent="#C2974A" />
      </div>
      <p className="loading-label">{statusLine}</p>
      <p className="loading-sub">
        Wir lesen Ihre Seite, prüfen sie und zeichnen die Skizze — einen Moment.
      </p>
    </section>
  );
}

function ResultView({ data, onReset }) {
  const accent = data.brand.accent || '#C2974A';
  const monogram = monogramOf(data.brand.name);

  return (
    <section className="result" style={{ '--accent': accent }}>
      <div className="result-head">
        <span className="pill">Konzept-Skizze</span>
        <h2 className="result-title">{data.brand.name}</h2>
        <p className="result-domain">{data.brand.domain}</p>
      </div>

      <div className="split">
        <HeuteBlock audit={data.audit} domain={data.brand.domain} />
        <KonzeptBlock data={data} accent={accent} monogram={monogram} />
      </div>

      <div className="result-foot">
        <p className="handmade">
          Eine Richtung, kein fertiges Template — die finale Seite codieren wir
          von Hand.
        </p>
        <div className="foot-actions">
          <a className="cta" href="#erstgespraech">
            30-Min-Erstgespräch vereinbaren →
          </a>
          <button type="button" className="ghost" onClick={onReset}>
            Neue Skizze
          </button>
        </div>
        <SourceNote source={data.meta?.source} />
      </div>
    </section>
  );
}

function HeuteBlock({ audit, domain }) {
  return (
    <article className="pane pane-heute">
      <span className="pane-tag">Heute</span>
      <BrowserChrome domain={domain} muted />
      <div className="pane-body">
        <div className="score-row">
          <ScoreDial score={audit.score} />
          <div>
            <p className="score-cap">Audit-Score</p>
            <p className="score-hint">
              Selbst-ermittelt, nicht extern verifiziert.
            </p>
          </div>
        </div>

        <p className="leak-cap">Größter Hebel</p>
        <p className="leak">{audit.topLeak}</p>

        <ul className="findings">
          {audit.findings.map((f, i) => (
            <li key={i} className={`finding sev-${f.severity}`}>
              <span className="sev-dot" aria-hidden="true" />
              <span>{f.label}</span>
              {f.label === audit.topLeak && (
                <span className="finding-top">Top</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function KonzeptBlock({ data, accent, monogram }) {
  const { brand, copy, widget } = data;
  return (
    <article className="pane pane-konzept" style={{ borderTopColor: accent }}>
      <span className="pane-tag konzept">Konzept-Skizze</span>
      <BrowserChrome domain={brand.domain} accent={accent} />
      <div className="pane-body konzept-body">
        <div className="konzept-hero">
          <LogoRing logoUrl={brand.logoUrl} monogram={monogram} accent={accent} />
          <div>
            <p className="mono-eyebrow" style={{ color: accent }}>
              {copy.eyebrow}
            </p>
            <h3 className="konzept-headline">{copy.headline}</h3>
          </div>
        </div>
        <p className="konzept-subline">{copy.subline}</p>

        <div className="widget-card" style={{ borderColor: accent }}>
          <div className="widget-head">
            <span className="mono-eyebrow" style={{ color: accent }}>
              {widget.name}
            </span>
          </div>
          <p className="widget-pitch">{copy.widgetPitch}</p>
          <WidgetByKey widgetKey={widget.key} accent={accent} />
        </div>

        <p className="geo-hook">{copy.geoHook}</p>
        {copy.found && <p className="found-note">{copy.found}</p>}
      </div>
    </article>
  );
}

function BrowserChrome({ domain, accent, muted }) {
  return (
    <div className={`chrome ${muted ? 'muted' : ''}`} aria-hidden="true">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <span className="addr" style={accent ? { borderColor: accent } : undefined}>
        {domain || 'ihre-domain.de'}
      </span>
    </div>
  );
}

function LogoRing({ logoUrl, monogram, accent }) {
  const [failed, setFailed] = useState(false);
  const showLogo = logoUrl && !failed;
  return (
    <div className="logo-ring" style={{ boxShadow: `0 0 0 2px ${accent}` }}>
      {showLogo ? (
        <img
          src={logoUrl}
          alt="Logo des Betriebs"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className="logo-mono" style={{ color: accent }}>
          {monogram}
        </span>
      )}
    </div>
  );
}

function ScoreDial({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct < 40 ? '#C2592E' : pct < 70 ? '#C2974A' : '#2E6F5E';
  return (
    <div
      className="dial"
      style={{
        background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(21,36,63,.12) 0)`,
      }}
      role="img"
      aria-label={`Audit-Score ${pct} von 100`}
    >
      <span className="dial-num">{pct}</span>
    </div>
  );
}

function SourceNote({ source }) {
  if (source === 'server') return null; // Normalfall, kein Hinweis nötig.
  const text =
    source === 'local' || source === 'fallback'
      ? 'Vorschau aus lokaler Vorlage — für die exakte Skizze später erneut versuchen.'
      : '';
  if (!text) return null;
  return <p className="source-note">{text}</p>;
}

// --- Helpers ----------------------------------------------------------------

function monogramOf(name) {
  const words = (name || 'K').trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

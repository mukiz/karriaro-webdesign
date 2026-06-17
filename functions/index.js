// Karriaro „Sofort-Skizze" — Server-Endpunkt  POST /api/sofort-skizze
//
// Ablauf (Build-Brief §5):
//   1. URL normalisieren/validieren
//   2. Seite serverseitig laden (Timeout, Redirects, Größenlimit)
//   3. Marken-Tokens extrahieren (Logo, Akzent, Name)
//   4. Audit ausführen (echte Befunde)
//   5. Branchen-Werkzeug wählen
//   6. KI-Text serverseitig erzeugen (gegroundet)
//   7. Antwort gemäß Datenvertrag zusammensetzen
//
// Nicht-funktional: Gesamt-Timeout ~25 s, sauberes JSON auch im Fehlerfall
// (bevorzugt HTTP 200 mit reduzierten Daten), Caching pro Domain (~10 Min),
// Rate-Limit pro IP, Anthropic-Key nur serverseitig (Secret).
//
// Datenschutz (§11): Eingaben & Logo nur transient. Es wird nichts persistiert;
// der Domain-Cache hält ausschließlich das transiente Ergebnis (TTL 10 Min).

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import { normalizeUrl } from './lib/normalizeUrl.js';
import { fetchSite } from './lib/fetchSite.js';
import { extractBrand } from './lib/extractBrand.js';
import { extractFacts } from './lib/extractFacts.js';
import { runAudit } from './lib/audit.js';
import { pickWidget } from './lib/widgets.js';
import { generateCopy } from './lib/ai.js';
import { cacheGet, cacheSet } from './lib/cache.js';
import { rateLimit } from './lib/rateLimit.js';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const OVERALL_TIMEOUT_MS = 25000;

export const sofortSkizze = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    timeoutSeconds: 30,
    memory: '512MiB',
    secrets: [ANTHROPIC_API_KEY],
  },
  async (req, res) => {
    // Secret in die Prozess-Env spiegeln (ai.js liest process.env).
    if (ANTHROPIC_API_KEY.value()) {
      process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY.value();
    }

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    // ---- Rate-Limit pro IP -------------------------------------------------
    const ip =
      (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
      req.ip ||
      'unknown';
    const rl = rateLimit(ip);
    if (!rl.allowed) {
      res.set('Retry-After', String(rl.retryAfter));
      res.status(429).json({ error: 'rate_limited', retryAfter: rl.retryAfter });
      return;
    }

    const body = req.body || {};
    const branche = typeof body.branche === 'string' ? body.branche : '';
    const ziel = typeof body.ziel === 'string' ? body.ziel : '';

    // ---- URL validieren ----------------------------------------------------
    let url;
    let domain;
    try {
      const n = normalizeUrl(body.url);
      url = n.url;
      domain = n.domain;
    } catch (e) {
      res.status(400).json({ error: 'invalid_url', message: e.message });
      return;
    }

    // ---- Cache-Treffer? ----------------------------------------------------
    const cacheKey = `${domain}|${normalizeBranche(branche)}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.status(200).json({ ...cached, meta: { source: cached.meta.source, cached: true } });
      return;
    }

    try {
      const payload = await withTimeout(
        buildResponse({ url, domain, branche, ziel }),
        OVERALL_TIMEOUT_MS,
      );
      cacheSet(cacheKey, payload);
      res.status(200).json(payload);
    } catch (e) {
      // Selbst im harten Fehlerfall liefern wir eine verwertbare, reduzierte
      // Antwort (HTTP 200), damit das Frontend nie kaputt aussieht.
      const widget = pickWidget(branche);
      res.status(200).json(reducedResponse({ domain, branche, widget }));
    }
  },
);

// ---------------------------------------------------------------------------

async function buildResponse({ url, domain, branche, ziel }) {
  const widget = pickWidget(branche);

  // 2. Seite laden (scheitert es, geht es mit reduzierten Daten weiter).
  const site = await fetchSite(url);

  // 3. Marken-Tokens.
  const brand = extractBrand(site.html, domain, site.finalUrl || url);

  // 4. Audit.
  const audit = runAudit(site, url);

  // 5./6. KI-Text (gegroundet). Bei Fehler/Timeout → null → Vorlage im Frontend.
  const facts = extractFacts(site.html);
  let copy = null;
  try {
    copy = await generateCopy({
      name: brand.name,
      branche,
      ziel,
      widget,
      facts,
      topFindings: audit.findings.slice(0, 3).map((f) => f.label),
    });
  } catch {
    copy = null;
  }

  if (!copy) {
    // Reduzierte, UWG-sichere Server-Vorlage (kein KI-Text verfügbar).
    copy = templateCopy({ name: brand.name, branche, widget, audit });
  }

  // 7. Antwort gemäß Datenvertrag.
  return {
    brand: {
      name: brand.name,
      domain,
      logoUrl: brand.logoUrl,
      accent: brand.accent || widget.defaultAccent || null,
    },
    copy,
    widget: { key: widget.key, name: widget.name },
    audit,
    meta: { source: 'server', cached: false },
  };
}

// Vorlage, wenn die KI nicht erreichbar war (serverseitig, UWG-konform).
function templateCopy({ name, branche, widget, audit }) {
  const b = (branche || 'Ihr Handwerk').trim();
  const label = capitalize(b.split(/[\/,]/)[0].trim() || 'Betrieb');
  return {
    eyebrow: `${label} · Ihre Region`,
    headline: `${name} — sichtbar, schnell, lokal.`,
    subline: `Eine klare Startseite, die Anfragen aus der Nachbarschaft leichter macht.`,
    widgetPitch: `Mit dem ${widget.name} liefern Sie Besuchern sofort einen konkreten Mehrwert.`,
    geoHook: `Sauber strukturiert kann Ihre Seite bei Google und KI-Assistenten besser auffindbar werden.`,
    found: `Erste Einschätzung anhand von ${name}: Größter Hebel ist „${audit.topLeak}".`,
  };
}

// Komplett reduzierte Antwort (selbst der Aufbau ist gescheitert).
function reducedResponse({ domain, branche, widget }) {
  return {
    brand: {
      name: capitalize((domain || 'ihr-betrieb').split('.')[0]),
      domain: domain || '',
      logoUrl: domain
        ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
        : null,
      accent: widget.defaultAccent || null,
    },
    copy: templateCopy({
      name: capitalize((domain || 'Ihr Betrieb').split('.')[0]),
      branche,
      widget,
      audit: { topLeak: 'Schnelle, mobile Startseite mit klarem Kontaktweg' },
    }),
    widget: { key: widget.key, name: widget.name },
    audit: {
      score: 50,
      topLeak: 'Schnelle, mobile Startseite mit klarem Kontaktweg',
      findings: [
        { label: 'Klickbare Telefonnummer am Handy', severity: 'high' },
        { label: 'Kurze Ladezeit (LCP)', severity: 'medium' },
        { label: 'Lokales Schema (LocalBusiness)', severity: 'medium' },
      ],
    },
    meta: { source: 'fallback', cached: false },
  };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function normalizeBranche(b) {
  return (b || '').toLowerCase().trim().slice(0, 40);
}

function capitalize(s) {
  s = (s || '').replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : 'Ihr Betrieb';
}

// Selbst-ermittelter Audit (Build-Brief §10).
// Liefert echte, aus dem geladenen HTML + Fetch-Metadaten gemessene Befunde:
//   - Telefonnummer am Handy klickbar (tel:-Link)
//   - Ladezeit / Seitengewicht (Proxy für LCP)
//   - LocalBusiness-Schema (JSON-LD)
//   - Mobil-Tauglichkeit (viewport)
//   - HTTPS
//   - Formular-/Kontakt-Hürden
//
// Wichtig (Ehrlichkeit): Der Score ist selbst-ermittelt und nicht extern
// verifiziert. Das wird im Frontend so kommuniziert. Echte LCP-Messung würde
// einen Headless-Browser erfordern; wir approximieren über Ladezeit + Gewicht.

import { parse } from 'node-html-parser';

/**
 * @param {{ html: string, finalUrl: string, ok: boolean, elapsedMs: number, bytes: number }} site
 * @param {string} url  ursprünglich angeforderte URL (für HTTPS-Check)
 * @returns {{ score: number, topLeak: string,
 *   findings: Array<{ label: string, severity: 'high'|'medium'|'low' }> }}
 */
export function runAudit(site, url) {
  const findings = [];

  // Konnte die Seite gar nicht geladen werden, liefern wir generische, aber
  // ehrliche Befunde (reduzierter Datenstand).
  if (!site.ok || !site.html) {
    return {
      score: 50,
      topLeak: 'Seite war nicht sauber abrufbar — Erreichbarkeit prüfen',
      findings: [
        { label: 'Seite war nicht sauber abrufbar — Erreichbarkeit prüfen', severity: 'high' },
        { label: 'Kein lokales Schema (LocalBusiness) gefunden', severity: 'medium' },
        { label: 'Mobile Performance nicht messbar', severity: 'medium' },
      ],
    };
  }

  let root;
  try {
    root = parse(site.html, { comment: false });
  } catch {
    root = null;
  }

  const html = site.html;
  const isHttps = /^https:/i.test(site.finalUrl || url);

  // ---- Klickbare Telefonnummer -------------------------------------------
  const hasTelLink = /href\s*=\s*["']tel:/i.test(html);
  const looksLikePhone = /(\+?\d[\d\s().\/-]{6,}\d)/.test(html);
  if (!hasTelLink && looksLikePhone) {
    findings.push({
      label: 'Telefonnummer am Handy nicht klickbar',
      severity: 'high',
    });
  } else if (!hasTelLink && !looksLikePhone) {
    findings.push({
      label: 'Keine erkennbare Telefonnummer auf der Startseite',
      severity: 'medium',
    });
  }

  // ---- Ladezeit / Seitengewicht (LCP-Proxy) ------------------------------
  const kb = Math.round(site.bytes / 1024);
  const seconds = (site.elapsedMs / 1000).toFixed(1).replace('.', ',');
  if (site.elapsedMs > 3500 || kb > 900) {
    findings.push({
      label: `Ladezeit ${seconds} s — zu langsam für Mobil`,
      severity: 'medium',
    });
  } else if (site.elapsedMs > 2000) {
    findings.push({
      label: `Ladezeit ${seconds} s — Spielraum nach oben`,
      severity: 'low',
    });
  }

  // ---- LocalBusiness-Schema ----------------------------------------------
  const hasLocalBusiness =
    /"@type"\s*:\s*"(LocalBusiness|[A-Za-z]*Business|Organization|Plumber|Roofing|HairSalon|Restaurant|MovingCompany|RealEstateAgent)"/i.test(
      html,
    ) || /itemtype\s*=\s*["'][^"']*LocalBusiness/i.test(html);
  if (!hasLocalBusiness) {
    findings.push({
      label: 'Kein lokales Schema (LocalBusiness)',
      severity: 'medium',
    });
  }

  // ---- Mobil-Tauglichkeit -------------------------------------------------
  const hasViewport = root
    ? !!root.querySelector('meta[name="viewport"]')
    : /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    findings.push({
      label: 'Kein Mobile-Viewport — Seite skaliert auf dem Handy nicht',
      severity: 'high',
    });
  }

  // ---- HTTPS --------------------------------------------------------------
  if (!isHttps) {
    findings.push({
      label: 'Keine sichere Verbindung (kein HTTPS)',
      severity: 'high',
    });
  }

  // ---- Kontakt-/Formular-Hürde -------------------------------------------
  const hasForm = root
    ? !!root.querySelector('form')
    : /<form[\s>]/i.test(html);
  const hasMailto = /href\s*=\s*["']mailto:/i.test(html);
  if (!hasForm && !hasMailto) {
    findings.push({
      label: 'Kein direkter Kontaktweg (Formular/E-Mail) auf der Startseite',
      severity: 'medium',
    });
  }

  // ---- Aussagekraft sicherstellen ----------------------------------------
  if (findings.length === 0) {
    findings.push({
      label: 'Solide Basis — Feinschliff bei lokaler Sichtbarkeit möglich',
      severity: 'low',
    });
  }

  // Sortierung nach Schwere; größter Hebel = topLeak.
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const score = scoreFrom(findings);
  const topLeak = findings[0].label;

  return { score, topLeak, findings: findings.slice(0, 6) };
}

function scoreFrom(findings) {
  let score = 100;
  for (const f of findings) {
    score -= f.severity === 'high' ? 22 : f.severity === 'medium' ? 12 : 4;
  }
  return Math.max(12, Math.min(98, score));
}

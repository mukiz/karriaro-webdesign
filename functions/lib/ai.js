// KI-Text serverseitig (Build-Brief §7).
// Ruft ein aktuelles Claude-Modell über das offizielle Anthropic-SDK auf.
// Der Prompt folgt der verbindlichen Vorlage aus §7; die Antwort wird robust
// aus den <json>…</json>-Tags geparst. Bei jedem Fehler wird NICHT abgebrochen,
// sondern null zurückgegeben — der Aufrufer nutzt dann die reduzierte Vorlage.
//
// Der Anthropic-Key liegt ausschließlich serverseitig (Secret), nie im Client.

import Anthropic from '@anthropic-ai/sdk';

// Latenz-/kostensensibles, öffentliches Lead-Werkzeug → schnelles Modell.
// Über Env überschreibbar (z. B. SOFORT_SKIZZE_MODEL=claude-opus-4-8).
const MODEL = process.env.SOFORT_SKIZZE_MODEL || 'claude-haiku-4-5';
const AI_TIMEOUT_MS = 12000;

const SYSTEM = `Du bist der Marken-Texter der Kölner Webdesign-Manufaktur Karriaro.
Schreibe den Text einer Konzept-Startseite für den folgenden lokalen Betrieb.
Stütze headline, subline und found auf die übergebenen Fakten. Findest du
wenig Belastbares, sage das ehrlich in 'found'.

Tonalität: selbstbewusst, handwerklich, klar, ohne Buzzword-Soße, jargonfrei, Deutsch.
RECHT (UWG): keine Superlative oder Absolut-Behauptungen ('beste', 'Nr. 1',
'garantiert'). Auffindbarkeit (Google/KI) NUR als Möglichkeit formulieren, nie als Garantie.

Gib das Ergebnis ausschließlich als JSON zwischen <json> und </json> aus,
alle Werte kurz und auf Deutsch:
<json>{"found":"…","eyebrow":"2-4 Wörter","headline":"max 8 Wörter",
"subline":"1 Satz Nutzen","widgetPitch":"1 Satz zum Werkzeug",
"geoHook":"1 Satz zur KI-Auffindbarkeit, UWG-sicher"}</json>`;

/**
 * @param {object} ctx
 * @param {string} ctx.name
 * @param {string} ctx.branche
 * @param {string} ctx.ziel
 * @param {{ key: string, name: string }} ctx.widget
 * @param {object} ctx.facts        extrahierte Seiten-Fakten
 * @param {string[]} ctx.topFindings  Top-Audit-Befunde (Labels)
 * @returns {Promise<object|null>}  geparstes Copy-Objekt oder null bei Fehler
 */
export async function generateCopy(ctx) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 1 });

  const userContent = buildUserMessage(ctx);

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    });

    const text = (res.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return parseJsonBlock(text);
  } catch {
    // Netz-/API-/Timeout-Fehler → stiller Fallback im Aufrufer.
    return null;
  }
}

function buildUserMessage(ctx) {
  const facts = ctx.facts || {};
  const factLines = Object.entries(facts)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${String(v).slice(0, 200)}`)
    .join('\n');

  return [
    `Betrieb: ${ctx.name || 'unbekannt'}`,
    `Branche: ${ctx.branche || 'unbekannt'}`,
    `Gewähltes Werkzeug: ${ctx.widget?.name || 'Anfrage-Assistent'} (${ctx.widget?.key || 'generic'})`,
    `Ziel des Betriebs: ${ctx.ziel || 'mehr lokale Anfragen'}`,
    '',
    'Extrahierte Seiten-Fakten:',
    factLines || '- (keine belastbaren Fakten extrahiert)',
    '',
    'Top-Audit-Befunde (für Grounding, nicht 1:1 zitieren):',
    (ctx.topFindings || []).map((f) => `- ${f}`).join('\n') || '- (keine)',
  ].join('\n');
}

// Extrahiert das JSON zwischen <json>…</json>. Fällt zurück auf das erste
// {...}-Objekt im Text. Liefert null, wenn nichts Brauchbares geparst werden kann.
export function parseJsonBlock(text) {
  if (!text) return null;
  let raw = null;

  const tagMatch = text.match(/<json>([\s\S]*?)<\/json>/i);
  if (tagMatch) {
    raw = tagMatch[1];
  } else {
    const brace = text.match(/\{[\s\S]*\}/);
    if (brace) raw = brace[0];
  }
  if (!raw) return null;

  try {
    const obj = JSON.parse(raw.trim());
    const keys = ['found', 'eyebrow', 'headline', 'subline', 'widgetPitch', 'geoHook'];
    const out = {};
    let any = false;
    for (const k of keys) {
      if (typeof obj[k] === 'string' && obj[k].trim()) {
        out[k] = obj[k].trim();
        any = true;
      }
    }
    return any ? out : null;
  } catch {
    return null;
  }
}

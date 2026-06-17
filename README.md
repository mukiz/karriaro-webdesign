# Karriaro Webdesign

Zwei Teile in einem Repo:

1. **Statische Agentur-Website** (`index.html`, `beispiele.html`, `demos/`) –
   die bestehende Marketing-Seite mit WebGL-Partikeldemo (GitHub Pages).
2. **Sofort-Skizze** (`web/` + `functions/`) – das Lead-Werkzeug: Interessent
   gibt Website-Adresse + Branche ein und erhält in ~30 s eine **Konzept-Skizze**
   („Heute vs. Konzept") mit echtem Audit, Logo, KI-Text und Branchen-Werkzeug.
   Läuft auf **Firebase** (Hosting + Cloud Function).

---

## Sofort-Skizze – Architektur

Klar getrennt, damit CORS/Browser-Sandbox kein Problem sind:

| Teil                       | Aufgabe                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| **Frontend** (`web/`)      | Darstellung & Erlebnis: Eingabe, Phyllotaxis-Lade-Sequenz, Split, Werkzeug, CTA, Consent. Ruft **nur** den eigenen Endpunkt. |
| **Server** (`functions/`)  | `POST /api/sofort-skizze`: Seite laden, Marken-Tokens extrahieren, Audit, Branchen-Werkzeug wählen, KI-Text. |

Der **Anthropic-API-Key liegt ausschließlich serverseitig** (Firebase-Secret),
nie im Client.

### Datenvertrag

Das Frontend rendert exakt aus der Server-Antwort:

```json
{
  "brand":  { "name", "domain", "logoUrl|null", "accent|null" },
  "copy":   { "eyebrow", "headline", "subline", "widgetPitch", "geoHook", "found" },
  "widget": { "key", "name" },
  "audit":  { "score", "topLeak", "findings": [{ "label", "severity" }] },
  "meta":   { "source", "cached" }
}
```

Fehlt `logoUrl`/`accent`, nutzt das Frontend **Monogramm** bzw.
**Branchen-Standardfarbe**. Bei Server-/Netzfehler greift still die lokale
Vorlage `web/src/composeCopy.js` (das Werkzeug sieht für Interessenten nie
kaputt aus).

### Verzeichnisse

```
web/                    Vite + React Frontend (die Sofort-Skizze-Erfahrung)
  src/SofortSkizze.jsx  Hauptkomponente: Eingabe → Laden → Split → CTA
  src/PhyllotaxisSeal.jsx  Lade-/Marken-Siegel im goldenen Winkel (137,5°)
  src/widgets/          Branchen-Werkzeuge (BAFA, Wert, Style, Wein, Fracht, …)
  src/composeCopy.js    Stiller Fallback (lokale Vorlage, UWG-sicher)
functions/              Firebase Cloud Function (europe-west1)
  index.js              Orchestrator für /api/sofort-skizze
  lib/normalizeUrl.js   URL prüfen/normalisieren
  lib/fetchSite.js      Fremde Seite laden (Timeout 8 s, Redirects, Größenlimit)
  lib/extractBrand.js   Logo / Akzent / Name
  lib/extractFacts.js   Knappe Grounding-Fakten für die KI
  lib/audit.js          Echter, selbst-ermittelter Audit
  lib/widgets.js        Branchen → Werkzeug-Mapping
  lib/ai.js             Claude-Aufruf (Prompt §7, robustes JSON-Parsing)
  lib/cache.js          Domain-Cache (TTL ~10 Min)
  lib/rateLimit.js      Rate-Limit pro IP
```

---

## Entwicklung

Voraussetzungen: Node 20, `firebase-tools` (`npm i -g firebase-tools`).

```bash
# 1. Abhängigkeiten
(cd web && npm install)
(cd functions && npm install)

# 2. Anthropic-Key für lokale Funktion (nicht committen)
cp functions/.env.example functions/.env   # Key eintragen

# 3. Funktion lokal starten (Emulator auf :5001)
(cd functions && npm run serve)

# 4. Frontend lokal (Vite proxyt /api an den Emulator)
(cd web && npm run dev)
```

## Deployment (Firebase)

```bash
# Projekt-ID in .firebaserc setzen oder:
firebase use <dein-projekt>

# Anthropic-Key als Secret hinterlegen (nur serverseitig!)
firebase functions:secrets:set ANTHROPIC_API_KEY

# Frontend bauen + alles deployen
(cd web && npm run build)
firebase deploy --only functions,hosting
```

Der Hosting-Rewrite leitet `/api/sofort-skizze` an die Function `sofortSkizze`
(Region `europe-west1`); alles andere fällt auf die SPA (`web/dist/index.html`).

### Modellwahl (KI-Text)

Default ist **`claude-haiku-4-5`** – schnell und kostengünstig, passend für ein
öffentliches, rate-limitiertes Werkzeug mit ~25 s Zeitbudget. Für maximale
Textqualität via Env überschreibbar:

```bash
firebase functions:config:unset  # n/a – Env-Variable:
# in functions/.env oder als Secret/Param:
SOFORT_SKIZZE_MODEL=claude-opus-4-8
```

---

## Compliance & Datenschutz

- **DSGVO:** Eingaben und Logo werden **nur transient** verarbeitet – keine
  Speicherung, keine Veröffentlichung. Die **Consent-Checkbox ist Pflicht vor
  dem Start**. Der Domain-Cache (10 Min) hält ausschließlich das transiente
  Skizzen-Ergebnis.
- **UWG:** KI- und Vorlagen-Texte ohne Absolut-/Superlativ-Behauptungen;
  Auffindbarkeit (Google/KI) nur als **Möglichkeit**. Kein Wettbewerbsvergleich.
- **Ehrlichkeit:** Der Audit-Score ist **selbst-ermittelt, nicht extern
  verifiziert** – so wird er im „Heute"-Block auch kommuniziert.

---

## Statische Marketing-Website (Bestand)

| Datei                       | Inhalt                                                  |
| --------------------------- | ------------------------------------------------------- |
| `index.html`                | Startseite – Hero, Leistungen, Teaser                   |
| `beispiele.html`            | Beispiele & Fähigkeiten – Live-Demo + Skills            |
| `demos/drohnenschwarm.html` | Vollbild-Demo des interaktiven WebGL-Partikelschwarms   |
| `assets/site.css`           | Gemeinsames Stylesheet                                   |

Lokal starten: `python3 -m http.server 8080`, dann `http://localhost:8080`.
Diese Seiten werden weiterhin via GitHub Pages ausgeliefert; die Sofort-Skizze
läuft eigenständig auf Firebase.

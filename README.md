# Karriaro Webdesign

Eine kleine, moderne Agentur-Website mit einer Unterseite, die Fähigkeiten und
interaktive Beispiele zeigt – darunter ein mausreaktiver WebGL-Partikelschwarm
(„Drohnen", die eine Rakete formen).

## Seitenstruktur

| Datei                          | Inhalt                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `index.html`                   | Startseite – Hero, Leistungen, Teaser zum Vorzeige-Beispiel  |
| `beispiele.html`               | **Beispiele & Fähigkeiten** – Live-Demo + Skills-Übersicht   |
| `demos/drohnenschwarm.html`    | Vollbild-Demo des interaktiven Partikelschwarms              |
| `assets/site.css`              | Gemeinsames Stylesheet für die Site                          |

Die Demo wird auf `beispiele.html` per `<iframe>` eingebettet. Mit dem
Query-Parameter `?embed=1` (`drohnenschwarm.html?embed=1`) wird das Text-Overlay
ausgeblendet, damit die Vorschau in Karten/Teasern sauber wirkt.

## Verwendete Technik (Demo)

- **Particle System / Particle Morphing** – viele Einzelpunkte ergeben eine Form.
- **Mouse Repulsion** – Partikel weichen dem Cursor aus und federn per
  Spring-Physik zurück in Formation.
- **WebGL via [Three.js](https://threejs.org/)** – GPU-gerendert für tausende
  flüssige Partikel.

## Lokal starten

Einfach `index.html` im Browser öffnen. Empfohlen über einen lokalen Server
(vermeidet CDN-/iframe-Probleme beim direkten Datei-Öffnen):

```bash
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

> Three.js wird per CDN (Import Map) geladen – eine Internetverbindung ist nötig.

## Interaktion in der Demo

| Aktion              | Effekt                                    |
| ------------------- | ----------------------------------------- |
| **Maus bewegen**    | Drohnen weichen dem Cursor aus            |
| **Klicken**         | Explosion – der Schwarm reformiert sich   |
| **Form wechseln**   | Morpht zwischen Rakete und Kugel          |
| **Zurücksetzen**    | Zurück zur Rakete                         |

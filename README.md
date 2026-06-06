# Drohnenschwarm · Particle Morphing Demo

Eine interaktive WebGL-Demo: tausende Partikel („Drohnen") formen eine Rakete
und reagieren auf die Mausbewegung – genau die Technik aus modernen
Webdesign-Trends 2026.

## Verwendete Technik

- **Particle System / Particle Morphing** – viele Einzelpunkte ergeben zusammen
  eine erkennbare Form.
- **Mouse Repulsion** – Partikel werden vom Cursor abgestoßen und federn per
  Spring-Physik zurück in Formation.
- **WebGL via [Three.js](https://threejs.org/)** – GPU-gerendert für tausende
  flüssige Partikel.

## Starten

Einfach `index.html` im Browser öffnen. Es wird keine Installation benötigt –
Three.js wird per CDN (Import Map) geladen, daher ist eine Internetverbindung
nötig.

Alternativ über einen lokalen Server (empfohlen, vermeidet evtl. CDN-/CORS-Probleme):

```bash
# Python
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

## Interaktion

| Aktion              | Effekt                                    |
| ------------------- | ----------------------------------------- |
| **Maus bewegen**    | Drohnen weichen dem Cursor aus            |
| **Klicken**         | Explosion – der Schwarm reformiert sich   |
| **Form wechseln**   | Morpht zwischen Rakete und Kugel          |
| **Zurücksetzen**    | Zurück zur Rakete                         |

## Wie es funktioniert (Kurzfassung)

1. Für jede Zielform (Rakete, Kugel) werden Punkte prozedural auf der
   Oberfläche verteilt → das sind die „Home"-Positionen.
2. Pro Frame zieht eine Feder jedes Partikel zu seiner Home-Position
   (`SPRING`), während Dämpfung (`DAMP`) für weiche Bewegung sorgt.
3. Die Mausposition wird auf eine Ebene im 3D-Raum projiziert; Partikel in der
   Nähe bekommen einen Abstoßungsimpuls (`REPEL_RADIUS`, `REPEL_FORCE`).
4. Beim Morphen werden lediglich die Home-Positionen und Farben getauscht – die
   Feder-Physik animiert den Übergang automatisch.

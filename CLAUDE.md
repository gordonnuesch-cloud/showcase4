# Arbeitsanweisung für Claude Code

Vierter Showcase: Romantasy, Flug vom Drachenrücken. Zeigt, wie weit
Code-Grafik geht, wenn man sie ernst nimmt: rohes WebGL2, Shader, alles im
Canvas.

## Regeln

- Nichts einbinden, was nicht aus Code entsteht. Keine Bild-, Audio- oder
  Schriftdateien außer Google Fonts im `<link>`.
- Kein Buchtitel, kein Autorenname, kein Verlagsname, keine Figurennamen aus
  der Vorlage auf der Seite.
- Ton andeutend. Spannung durch Zurückhaltung.
- Build bleibt eine einzelne HTML-Datei.

## Prüfen

```
npm run pruefen
```

Prüft die Einsatzdaten (Momentzahl, kein Moment mitten in einem Hindernis)
und spielt alle Einsätze mit gedachten Spielern (Maus/Tastatur, flink/langsam)
bei Bindung 0–100. Bricht ab, wenn hohe Bindung nicht spürbar leichter macht.
Nach jeder Änderung an Hindernissen oder Flugwerten.

```
npm run balance
```

Spielt das ganze Spiel je Strategie 400-mal durch (immer Distanz, immer Nähe,
Nähe nur allein, Zufall …) und zeigt die Verteilung der fünf Ausgänge. Bricht
ab, wenn eine Strategie in über 80 % zum selben Ende führt, keine Gefahr
(Tribunal oder Sturz) mehr trägt oder ein Ausgang kaum vorkommt. Nach jeder
Änderung an Zahlen in `einsatz.js` oder `geschichte.js`.

```
npm run rauchtest
```

Rendert Flug, Einsätze, Szenen und Ausgänge in beiden Qualitätsstufen
(WebGL in Software), die 2D-Fassung ohne WebGL und hochkant wie auf einem
Telefon, spielt einige Stellen live und legt die Bilder nach `rauchtest/`.
Ansehen, auch in voller Größe: Artefakte wie Treppenlinien sieht man in der
Übersicht nicht.

## Aufbau

```
src/himmel.js     der Himmel: ein Fragment-Shader, Qualitätsstufen, Brennweite
src/himmel2d.js   derselbe Himmel ohne WebGL, ruhig in 2D gemalt (?ohnewebgl)
src/stimmung.js   Tageszeiten als Daten, Mischung mit der Wärme
src/flug.js       Flugmodell ohne Grafik; die Bindung wirkt als Verzögerung,
                  Trägheit, Wendigkeit, Unruhe. Reine Funktionen, testbar.
src/drache.js     Hals, Kopf, Flügel als 2D-Silhouette mit Saumlicht; Glut/Asche
src/data/einsaetze.js  die fünf Einsätze als Daten: Zeilen, Hindernisse, Momente
src/einsatz.js    Ablauf eines Einsatzes ohne Grafik; Wirkung der Entscheidungen
src/data/szenen.js  Titel, vier Zwischenszenen, fünf Ausgänge
src/geschichte.js Zwischenszenen und Ausgänge ohne Grafik; alle Regelzahlen oben
tools/notnagel.mjs  baut beim Build den ganzen Text als verstecktes HTML
src/einsatzbild.js  Felsnadeln, Pfeile, Blitze, Reiter im Bild; Regen
src/ton.js        aller Klang aus Web Audio: Wind, Regen, Flügel, Herz, Einzelklänge
src/schrift.js    Text im Canvas: Zeilen, Momente, Textseiten
src/main.js       Phasen, Schleife, Eingabe, Vorführmodus (Taste V auf dem Titel)
                  Erproben: ?einsatz= ?szene= ?ausgang= ?erprobung ?frei ?vorfuehren
```

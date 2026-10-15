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
npm run rauchtest
```

Rendert den Himmel in allen Tageszeiten, kalt und warm, in beiden
Qualitätsstufen (WebGL in Software) und legt die Bilder nach `rauchtest/`.
Ansehen, auch in voller Größe: Artefakte wie Treppenlinien sieht man in der
Übersicht nicht.

## Aufbau

```
src/himmel.js     der Himmel: ein Fragment-Shader, Qualitätsstufen
src/stimmung.js   Tageszeiten als Daten, Mischung mit der Wärme
src/flug.js       Flugmodell ohne Grafik; die Bindung wirkt als Verzögerung,
                  Trägheit, Wendigkeit, Unruhe. Reine Funktionen, testbar.
src/drache.js     Hals, Kopf, Flügel als 2D-Silhouette mit Saumlicht; Glut/Asche
src/data/einsaetze.js  die fünf Einsätze als Daten: Zeilen, Hindernisse, Momente
src/einsatz.js    Ablauf eines Einsatzes ohne Grafik; Wirkung der Entscheidungen
src/einsatzbild.js  Felsnadeln, Pfeile, Blitze, Reiter im Bild
src/schrift.js    Text im Canvas: Zeilen, Momente, Titel, Karten
src/main.js       Schleife und Eingabe (?einsatz=1..5, ?erprobung, ?frei)
```

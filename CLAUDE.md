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
src/main.js       Vorschau (Tasten 1–5, ←/→, Q)
```

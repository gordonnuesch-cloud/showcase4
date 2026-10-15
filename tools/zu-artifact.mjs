// Macht aus dist/index.html eine Datei, die sich als Claude-Artifact
// veroeffentlichen laesst.
//
// Hintergrund: Artifacts bekommen ihr HTML-Geruest beim Veroeffentlichen
// gestellt. Eine Datei mit eigenem <!doctype>, <html> und <body> wuerde
// doppelt verschachtelt. Dieses Skript zieht <title>, <link>, <style>
// und den Body-Inhalt heraus und schreibt sie flach nach artifact.html.
//
// Aufruf: npm run build && npm run artifact

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const quelle = "dist/index.html";
if (!existsSync(quelle)) {
  console.error("dist/index.html fehlt. Erst 'npm run build' ausführen.");
  process.exit(1);
}

const html = readFileSync(quelle, "utf8");

// Kopfinhalt uebernehmen (title, Fonts, Styles, eingebettete Skripte),
// nur die <meta>-Zeilen weglassen: die stellt das Artifact-Geruest selbst.
const kopf = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, ""])[1]
  .replace(/<meta\b[^>]*>\s*/gi, "")
  .trim();
const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ""])[1].trim();

if (!/<title>/i.test(kopf)) console.warn("Warnung: kein <title> gefunden — das Artifact bekäme einen Verlegenheitsnamen.");
if (!/<script/i.test(kopf + body)) console.warn("Warnung: kein <script> im Ergebnis — der Build hat das Spiel nicht eingebettet.");

const aus = [kopf, body].filter(Boolean).join("\n\n");
writeFileSync("artifact.html", aus + "\n", "utf8");

const kb = (Buffer.byteLength(aus, "utf8") / 1024).toFixed(0);
console.log(`artifact.html geschrieben (${kb} KB). Diese Datei veröffentlichen, nicht dist/index.html.`);

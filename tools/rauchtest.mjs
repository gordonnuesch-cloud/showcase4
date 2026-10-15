// Rauchtest: rendert den Himmel im echten Browser in allen Tageszeiten,
// kalt und warm, in beiden Qualitaetsstufen, und meldet Shader- und
// Konsolenfehler. Bilder nach rauchtest/, Uebersicht 00-uebersicht.png.
// WebGL laeuft hier in Software (SwiftShader) - langsam, aber fuer
// Standbilder genau richtig.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";

const ORDNER = "rauchtest";
rmSync(ORDNER, { recursive: true, force: true });
mkdirSync(ORDNER);

const html = readFileSync("dist/index.html");
const server = createServer((_, res) => { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(html); }).listen(0);
const basis = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const fehler = [];
const seite = await browser.newPage({ viewport: { width: 1280, height: 720 } });
seite.on("console", (m) => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|ERR_INTERNET/.test(m.text())) fehler.push(m.text()); });
seite.on("pageerror", (e) => fehler.push("pageerror: " + e.message));

// Flugbilder: gleiche Kurve bei niedriger und hoher Bindung, dazu die Tageszeiten
const bilder = [
  ["01-morgenrot-bindung10", "zeit=4&bindung=10&lenk=0.6"], ["02-morgenrot-bindung90", "zeit=4&bindung=90&lenk=0.6"],
  ["03-mittag-bindung70", "zeit=1&bindung=70&lenk=-0.4"], ["04-gewitter-bindung20", "zeit=2&bindung=20&lenk=0.3"],
  ["05-mondnacht-bindung50", "zeit=3&bindung=50&lenk=0"], ["06-morgengrauen-bindung80", "zeit=0&bindung=80&lenk=-0.7"]
];
for (const [name, q] of bilder) for (const stufe of ["hoch", "niedrig"]) {
  if (stufe === "niedrig" && !/^0[12]/.test(name)) continue;
  await seite.goto(`${basis}?${q}&q=${stufe}&t=40`);
  await seite.waitForFunction(() => document.documentElement.dataset.bereit === "1" || document.documentElement.dataset.webgl === "fehlt", null, { timeout: 30000 });
  if (await seite.evaluate(() => document.documentElement.dataset.webgl === "fehlt")) { fehler.push("WebGL2 fehlt im Testbrowser"); break; }
  await seite.screenshot({ path: `${ORDNER}/${name}-${stufe}.png` });
}

// Fuehlt sich Bindung an? Reaktionszeit muss mit der Bindung deutlich fallen
const { reaktionszeit } = await import("../src/flug.js");
const r0 = reaktionszeit(0), r100 = reaktionszeit(100);
console.log(`Reaktionszeit: Bindung 0 → ${Math.round(r0 * 1000)} ms, Bindung 100 → ${Math.round(r100 * 1000)} ms`);
if (!(r0 > r100 * 4)) fehler.push("Bindung verändert die Reaktion zu wenig");

const namen = readdirSync(ORDNER).filter((n) => n.endsWith(".png")).sort();
const blatt = await browser.newPage({ viewport: { width: 1600, height: 400 } });
await blatt.setContent(`<body style="margin:0;background:#222;font:12px sans-serif;color:#ddd;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px">` +
  namen.map((n) => `<figure style="margin:0"><img style="width:100%;display:block" src="data:image/png;base64,${readFileSync(`${ORDNER}/${n}`).toString("base64")}"><figcaption>${n}</figcaption></figure>`).join("") + "</body>");
await blatt.screenshot({ path: `${ORDNER}/00-uebersicht.png`, fullPage: true });

await browser.close(); server.close();
console.log(`Bilder: ${ORDNER}/ — Übersicht in 00-uebersicht.png`);
if (fehler.length) { console.error("\nFehler:"); fehler.forEach((f) => console.error("  " + f)); process.exit(1); }
console.log("Keine Fehler.");

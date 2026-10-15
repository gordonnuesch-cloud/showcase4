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

// Freier Flug: gleiche Kurve bei niedriger und hoher Bindung, in beiden Stufen
const bilder = [
  ["01-frei-bindung10", "frei&zeit=4&bindung=10&lenk=0.6", true], ["02-frei-bindung90", "frei&zeit=4&bindung=90&lenk=0.6", true],
  // Einsaetze: vorgerechnet bis zur genannten Sekunde
  ["03-e1-titel", "einsatz=1&uhr=3"], ["04-e1-ilvar", "einsatz=1&uhr=16"],
  ["05-e1-felsen", "einsatz=1&uhr=29.5&bindung=30", true], ["06-e1-moment", "einsatz=1&uhr=50"],
  ["07-e2-pfeile", "einsatz=2&uhr=26&bindung=60"], ["08-e3-blitz", "einsatz=3&uhr=41&bindung=20"],
  ["09-e4-reiter", "einsatz=4&uhr=29&bindung=70"], ["10-e5-moment", "einsatz=5&uhr=52&bindung=80"]
];
async function standbild(name, q, stufe) {
  await seite.goto(`${basis}?${q}&q=${stufe}&t=40`);
  await seite.waitForFunction(() => document.documentElement.dataset.bereit === "1" || document.documentElement.dataset.webgl === "fehlt", null, { timeout: 30000 });
  if (await seite.evaluate(() => document.documentElement.dataset.webgl === "fehlt")) { fehler.push("WebGL2 fehlt im Testbrowser"); return false; }
  await seite.screenshot({ path: `${ORDNER}/${name}-${stufe}.png` });
  return true;
}
for (const [name, q, beide] of bilder) {
  if (!await standbild(name, q, "hoch")) break;
  if (beide) await standbild(name, q, "niedrig");
}

// Live: ein Moment oeffnet sich, eine Wahl mit der Pfeiltaste veraendert die Bindung
await seite.goto(`${basis}?einsatz=1&uhr=49&q=niedrig`);
await seite.waitForFunction(() => window.__flug?.einsatz.moment && window.__flug.einsatz.momentSeit > 1.8, null, { timeout: 30000 })
  .catch(() => fehler.push("Live: der Moment bei 50 s öffnet sich nicht"));
const vorher = await seite.evaluate(() => window.__flug.spiel.bindung);
await seite.keyboard.press("ArrowRight");
const nachher = await seite.evaluate(() => ({ b: window.__flug.spiel.bindung, offen: !!window.__flug.einsatz.moment }));
if (nachher.b <= vorher || nachher.offen) fehler.push(`Live: Nähe zulassen wirkt nicht (Bindung ${vorher} → ${nachher.b})`);
await seite.waitForTimeout(1500);
await seite.screenshot({ path: `${ORDNER}/11-e1-folge-live.png` });

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

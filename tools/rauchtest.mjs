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
  ["03-titel", "titel", true],
  // Einsaetze: vorgerechnet bis zur genannten Sekunde
  ["04-e1-felsen", "einsatz=1&uhr=29.5&bindung=30", true], ["05-e1-moment", "einsatz=1&uhr=50"],
  ["06-e3-blitz", "einsatz=3&uhr=41&bindung=20"], ["07-e4-reiter", "einsatz=4&uhr=29&bindung=70"],
  // Zwischenszenen: weitergeblaettert; zufall=0 erzwingt die Entdeckung, 1 schliesst sie aus
  ["08-szene1-ruhig", "szene=1&zufall=1&schritte=2"], ["09-szene2-entdeckt", "szene=2&zufall=0&verdacht=50&schritte=2"],
  ["10-szene3-folge", "szene=3&zufall=0&verdacht=50&schritte=3&wahl=links"], ["11-szene4-tuer", "szene=4&schritte=2", true],
  // Ausgaenge, vollstaendig aufgedeckt
  ...["grenze", "geheimnis", "tribunal", "pflicht", "sturz"].map((n, i) => [`${12 + i}-ausgang-${n}`, `ausgang=${n}&schritte=2`])
];
async function standbild(name, q, stufe, s = seite, endung = `-${stufe}`) {
  await s.goto(`${basis}?${q}&q=${stufe}&t=40`);
  await s.waitForFunction(() => document.documentElement.dataset.bereit === "1", null, { timeout: 30000 });
  const ohne = await s.evaluate(() => document.documentElement.dataset.webgl === "fehlt");
  if (ohne !== /ohnewebgl/.test(q)) { fehler.push(ohne ? "WebGL2 fehlt im Testbrowser" : `${name}: 2D-Fassung nicht aktiv`); return false; }
  await s.screenshot({ path: `${ORDNER}/${name}${endung}.png` });
  return true;
}
for (const [name, q, beide] of bilder) {
  if (!await standbild(name, q, "hoch")) break;
  if (beide) await standbild(name, q, "niedrig");
}

// Ohne WebGL: dieselben Stellen in der ruhigen 2D-Fassung
for (const [name, q] of [["21-2d-titel", "titel"], ["22-2d-e1-felsen", "einsatz=1&uhr=29.5"], ["23-2d-e3-gewitter", "einsatz=3&uhr=41"],
  ["24-2d-e4-mondnacht", "einsatz=4&uhr=29&bindung=70"], ["25-2d-e5-morgenrot", "einsatz=5&uhr=10&bindung=90"]]) {
  await standbild(name, q + "&ohnewebgl", "hoch", seite, "");
}
// Und einmal wirklich ohne WebGL: der Browser selbst schaltet es ab
{
  const ohne = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] });
  const s = await ohne.newPage({ viewport: { width: 1280, height: 720 } });
  s.on("pageerror", (e) => fehler.push("ohne WebGL: " + e.message));
  await s.goto(`${basis}?einsatz=2&uhr=26&t=40`);
  await s.waitForFunction(() => document.documentElement.dataset.bereit === "1", null, { timeout: 30000 });
  if (!await s.evaluate(() => document.documentElement.dataset.webgl === "fehlt")) fehler.push("Browser ohne WebGL: 2D-Fassung springt nicht ein");
  await s.screenshot({ path: `${ORDNER}/26-2d-echt-e2.png` });
  await ohne.close();
}

// Hochkant wie auf einem Telefon
{
  const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  tel.on("pageerror", (e) => fehler.push("hochkant: " + e.message));
  for (const [name, q] of [["30-tel-titel", "titel"], ["31-tel-e1-felsen", "einsatz=1&uhr=29.5"], ["32-tel-e1-moment", "einsatz=1&uhr=50"],
    ["33-tel-e2-pfeile", "einsatz=2&uhr=26&bindung=60"], ["34-tel-szene4", "szene=4&schritte=2"], ["35-tel-grenze", "ausgang=grenze&schritte=2"]]) {
    await standbild(name, q, "hoch", tel, "");
  }
  await tel.close();
}

// Live: Qualitaet schaltet von selbst zurueck. WebGL in Software ist langsam
// genug, um einen schwachen Rechner zu spielen.
await seite.goto(`${basis}?einsatz=1`);
await seite.waitForFunction(() => document.documentElement.dataset.qualitaet === "niedrig", null, { timeout: 8000 })
  .catch(() => fehler.push("Qualität: bei niedriger Bildrate keine Rückschaltung binnen 8 s"));
await seite.waitForTimeout(2500);
const nachRueckschaltung = await seite.evaluate(() => Math.round(window.__flug.zustand.fps));
console.log(`Qualität: zurückgeschaltet, danach ${nachRueckschaltung} fps (WebGL in Software)`);
await seite.screenshot({ path: `${ORDNER}/27-rueckschaltung-live.png` });

// Live: Titel → Einsatz 1 per Leertaste
await seite.goto(`${basis}?q=niedrig`);
await seite.waitForTimeout(1500);
await seite.keyboard.press("Space");
await seite.waitForTimeout(300);
if (await seite.evaluate(() => window.__flug.zustand.phase) !== "einsatz") fehler.push("Live: Leertaste auf dem Titel startet keinen Einsatz");

// Ton: nach der Leertaste laeuft der Klang; jeder Einzelklang laesst sich spielen
const ton = await seite.evaluate(() => window.__ton.probe());
if (ton !== "running") fehler.push(`Ton: AudioContext ist ${ton}`);
await seite.waitForTimeout(600);

// Live: ein Moment oeffnet sich, eine Wahl mit der Pfeiltaste veraendert die Bindung
await seite.goto(`${basis}?einsatz=1&uhr=49&q=niedrig`);
await seite.waitForFunction(() => window.__flug?.einsatz.moment && window.__flug.einsatz.momentSeit > 1.8, null, { timeout: 30000 })
  .catch(() => fehler.push("Live: der Moment bei 50 s öffnet sich nicht"));
const vorher = await seite.evaluate(() => window.__flug.spiel.bindung);
await seite.keyboard.press("ArrowRight");
const nachher = await seite.evaluate(() => ({ b: window.__flug.spiel.bindung, offen: !!window.__flug.einsatz.moment }));
if (nachher.b <= vorher || nachher.offen) fehler.push(`Live: Nähe zulassen wirkt nicht (Bindung ${vorher} → ${nachher.b})`);
await seite.waitForTimeout(1500);
await seite.screenshot({ path: `${ORDNER}/20-e1-folge-live.png` });

// Live: eine Zwischenszene durchblaettern, entdeckt werden, Tamsin decken lassen, weiter in Einsatz 2
await seite.goto(`${basis}?szene=1&zufall=0&verdacht=50&q=niedrig`);
await seite.waitForTimeout(800);
for (let i = 0; i < 8; i++) {
  const z = await seite.evaluate(() => ({ phase: window.__flug.zustand.phase, wahl: !!window.__flug.szene?.wahl }));
  if (z.phase !== "szene") break;
  await seite.keyboard.press(z.wahl ? "ArrowRight" : "Space");
  await seite.waitForTimeout(z.wahl ? 200 : 1600);
  if (z.wahl) await seite.waitForTimeout(1400);
}
const danach = await seite.evaluate(() => ({ phase: window.__flug.zustand.phase, nr: window.__flug.einsatz?.nr, wahlen: window.__flug.spiel.wahlen }));
if (danach.phase !== "einsatz" || danach.nr !== 1) fehler.push(`Live: nach Szene 1 kein Einsatz 2 (${JSON.stringify(danach)})`);
if (!danach.wahlen.some((w) => w.seite === "deckt")) fehler.push("Live: die Wahl in der Szene kam nicht an");

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

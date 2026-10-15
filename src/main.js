// Freier Flug zum Ausprobieren - noch ohne Geschichte. Damit laesst sich
// pruefen, ob sich die Bindung anfuehlt, bevor eine Szene geschrieben ist.
//
// Steuerung: Pfeile oder WASD, Maus ziehen, Touch ziehen.
// Erproben:  [ und ] Bindung -/+ 10 · 1-5 Tageszeit · Q Qualitaet
// Testbilder: ?t=Sek&bindung=0..100&lenk=-1..1&zeit=0..4&q=hoch|niedrig

import { himmelErstellen, QUALITAET } from "./himmel.js";
import { stimmung, TAGESZEITEN } from "./stimmung.js";
import { neuerFlug, fliegen, kamera, kennwerte } from "./flug.js";
import { dracheZeichnen, sonneAufSchirm, teilchenErstellen, teilchenZeichnen } from "./drache.js";

const param = new URLSearchParams(location.search);
const glc = document.getElementById("himmel"), vorn = document.getElementById("hud");
const g2 = vorn.getContext("2d");

const zustand = {
  zeit: Number(param.get("zeit") ?? 4),
  bindung: Number(param.get("bindung") ?? 30),
  waerme: 0,
  q: QUALITAET[param.get("q")] || QUALITAET.hoch,
  automatisch: !param.has("q"),
  fps: 0
};
zustand.waerme = kennwerte(zustand.bindung).waerme;

const himmel = (() => { try { return himmelErstellen(glc); } catch (e) { console.error(e); return null; } })();
const flug = neuerFlug();
const teilchen = teilchenErstellen();

function groesse() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  glc.width = Math.round(innerWidth * dpr * zustand.q.skala);
  glc.height = Math.round(innerHeight * dpr * zustand.q.skala);
  vorn.width = Math.round(innerWidth * dpr); vorn.height = Math.round(innerHeight * dpr);
}
groesse();
addEventListener("resize", groesse);

// --- Eingabe ----------------------------------------------------------------------
const tasten = {};
const zeiger = { aktiv: false, x0: 0, y0: 0, x: 0, y: 0 };
addEventListener("keydown", (e) => {
  tasten[e.key.toLowerCase()] = true;
  if (/^[1-5]$/.test(e.key)) zustand.zeit = Number(e.key) - 1;
  if (e.key === "[") zustand.bindung = Math.max(0, zustand.bindung - 10);
  if (e.key === "]") zustand.bindung = Math.min(100, zustand.bindung + 10);
  if (e.key.toLowerCase() === "q") { zustand.q = zustand.q === QUALITAET.hoch ? QUALITAET.niedrig : QUALITAET.hoch; zustand.automatisch = false; groesse(); }
  if (e.key.startsWith("Arrow")) e.preventDefault();
});
addEventListener("keyup", (e) => { tasten[e.key.toLowerCase()] = false; });
addEventListener("blur", () => { for (const k in tasten) tasten[k] = false; });
vorn.style.pointerEvents = "auto";
vorn.addEventListener("pointerdown", (e) => { zeiger.aktiv = true; zeiger.x0 = e.clientX; zeiger.y0 = e.clientY; zeiger.x = zeiger.y = 0; vorn.setPointerCapture(e.pointerId); });
vorn.addEventListener("pointermove", (e) => {
  if (!zeiger.aktiv) return;
  const r = Math.min(innerWidth, innerHeight) * 0.25;
  zeiger.x = Math.max(-1, Math.min(1, (e.clientX - zeiger.x0) / r));
  zeiger.y = Math.max(-1, Math.min(1, (zeiger.y0 - e.clientY) / r));
});
["pointerup", "pointercancel"].forEach((n) => vorn.addEventListener(n, () => { zeiger.aktiv = false; zeiger.x = zeiger.y = 0; }));

function eingabe() {
  let x = 0, y = 0;
  if (tasten.arrowleft || tasten.a) x -= 1;
  if (tasten.arrowright || tasten.d) x += 1;
  if (tasten.arrowup || tasten.w) y += 1;
  if (tasten.arrowdown || tasten.s) y -= 1;
  if (zeiger.aktiv) { x += zeiger.x; y += zeiger.y; }
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}

// --- Qualitaet: bei dauerhaft unter ~40 fps eine Stufe zurueck ---------------------
let rahmen = [];
function qualitaetPruefen(dt) {
  rahmen.push(dt); if (rahmen.length > 90) rahmen.shift();
  const mittel = rahmen.reduce((a, b) => a + b, 0) / rahmen.length;
  zustand.fps = 1000 / mittel;
  if (zustand.automatisch && rahmen.length === 90 && mittel > 25 && zustand.q === QUALITAET.hoch) {
    zustand.q = QUALITAET.niedrig; rahmen = []; groesse();
  }
}

// --- Bild ----------------------------------------------------------------------------
let letzterKurs = 0;
function bild(t, dt) {
  const kw = fliegen(flug, dt, testLenkung ?? eingabe(), zustand.bindung);
  // Die Stimmung folgt der Bindung langsam - man soll den Wandel spueren, nicht sehen springen
  zustand.waerme += (kw.waerme - zustand.waerme) * Math.min(1, dt * 0.6);
  const st = stimmung(zustand.zeit, zustand.waerme);
  const kam = kamera(flug);
  if (himmel) himmel.zeichnen(st, t, flug.pos, flug.hoehe, kam, zustand.q);
  const W = vorn.width, H = vorn.height;
  g2.clearRect(0, 0, W, H);
  const drehrate = dt > 0 ? (flug.kurs - letzterKurs) / dt : 0; letzterKurs = flug.kurs;
  teilchenZeichnen(g2, W, H, teilchen, flug, dt, zustand.waerme, drehrate);
  dracheZeichnen(g2, W, H, flug, {
    sonne: sonneAufSchirm(kam, st.sonne, W, H),
    farbe: st.sonnenFarbe.map((x) => Math.pow(x, 1 / 2.2)), himmel: st.horizont.map((x) => Math.pow(x, 1 / 2.2)),
    waerme: zustand.waerme
  }, t);
  // Vorlaeufig: eine leise Zeile fuer die Erprobung, kommt im Spiel weg
  g2.font = `${Math.round(H * 0.018)}px "Cormorant Garamond", Georgia, serif`;
  g2.fillStyle = "rgba(255,248,235,.6)";
  g2.fillText(`Freier Flug · ${TAGESZEITEN[zustand.zeit].name} · Bindung ${zustand.bindung} · ${zustand.q.name}${zustand.fps ? ` · ${Math.round(zustand.fps)} fps` : ""}`, H * 0.03, H * 0.97);
}

// Testbilder: Flug einige Sekunden mit fester Lenkung vorrechnen, dann ein Bild
const fest = param.has("t") ? Number(param.get("t")) : null;
const testLenkung = param.has("lenk") ? { x: Number(param.get("lenk")), y: 0 } : null;
if (fest !== null) {
  for (let i = 0; i < 240; i++) fliegen(flug, 1 / 60, testLenkung ?? { x: 0, y: 0 }, zustand.bindung);
  zustand.waerme = kennwerte(zustand.bindung).waerme;
  requestAnimationFrame(() => { bild(fest, 1 / 60); document.documentElement.dataset.bereit = "1"; });
} else {
  let zuletzt = 0;
  const schleife = (ts) => {
    const dt = Math.min(0.05, (ts - zuletzt) / 1000 || 0.016); zuletzt = ts;
    qualitaetPruefen(dt * 1000);
    bild(ts / 1000, dt);
    requestAnimationFrame(schleife);
  };
  requestAnimationFrame(schleife);
}
if (!himmel) document.documentElement.dataset.webgl = "fehlt";
window.__flug = { zustand, flug };

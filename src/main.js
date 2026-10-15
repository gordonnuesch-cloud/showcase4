// Einstieg: Spielschleife, Eingabe, Zeichnen.
//
// Steuerung: Pfeile oder WASD, Maus oder Finger ziehen. In einem Moment
// waehlt ← / → (oder Tippen links/rechts). Leertaste oder Tippen fuer weiter.
// Erproben:  ?einsatz=1..5 · ?erprobung (Werte unten, [ ] Bindung, 1-5, Q)
//            ?frei = freier Flug ohne Geschichte
// Testbilder: ?t=Sek mit ?uhr=Sek (Einsatz bis dahin vorrechnen) oder
//            ?frei&bindung=0..100&lenk=-1..1&zeit=0..4, dazu &q=hoch|niedrig

import { himmelErstellen, QUALITAET } from "./himmel.js";
import { stimmung, TAGESZEITEN } from "./stimmung.js";
import { neuerFlug, fliegen, kamera, kennwerte } from "./flug.js";
import { dracheZeichnen, aufSchirm, teilchenErstellen, teilchenZeichnen } from "./drache.js";
import { neuesSpiel, einsatzBeginnen, einsatzSchritt, einsatzAbschliessen, waehlen, autopilot, tastenAnlauf } from "./einsatz.js";
import { hindernisseZeichnen } from "./einsatzbild.js";
import { zeileZeichnen, momentZeichnen, titelZeichnen, karteZeichnen } from "./schrift.js";
import { EINSAETZE } from "./data/einsaetze.js";

const param = new URLSearchParams(location.search);
const glc = document.getElementById("himmel"), vorn = document.getElementById("hud");
const g2 = vorn.getContext("2d");
const frei = param.has("frei"), erprobung = param.has("erprobung");

const spiel = neuesSpiel();
if (param.has("bindung")) spiel.bindung = Number(param.get("bindung"));
if (param.has("verdacht")) spiel.verdacht = Number(param.get("verdacht"));

const zustand = {
  phase: frei ? "frei" : "einsatz",    // frei | einsatz | zwischen | ende
  zeit: Number(param.get("zeit") ?? 4),
  waerme: kennwerte(spiel.bindung).waerme,
  q: QUALITAET[param.get("q")] || QUALITAET.hoch,
  automatisch: !param.has("q"),
  fps: 0, erschuetterung: 0, blitz: 0, karteSeit: 0
};
let einsatz = frei ? null : einsatzBeginnen(Math.max(0, Math.min(4, Number(param.get("einsatz") ?? 1) - 1)));

const himmel = (() => { try { return himmelErstellen(glc); } catch (e) { console.error(e); return null; } })();
let flug = neuerFlug();
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
let tastenLenkung = 0;

function weiter() {
  if (zustand.phase !== "zwischen" || zustand.karteSeit < 1) return;
  if (einsatz.nr < 4) { einsatz = einsatzBeginnen(einsatz.nr + 1); zustand.phase = "einsatz"; flug = neuerFlug(); }
  else zustand.phase = "ende";
  zustand.karteSeit = 0;
}
function entscheiden(seite) {
  if (zustand.phase === "einsatz" && einsatz.moment && einsatz.momentSeit > 1.6) waehlen(einsatz, spiel, seite);
}

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  tasten[k] = true;
  if (!e.repeat && (k === "arrowleft" || k === "a")) entscheiden("distanz");
  if (!e.repeat && (k === "arrowright" || k === "d")) entscheiden("naehe");
  if (k === " " || k === "enter") weiter();
  if (erprobung || frei) {
    if (/^[1-5]$/.test(e.key)) zustand.zeit = Number(e.key) - 1;
    if (e.key === "[") spiel.bindung = Math.max(0, spiel.bindung - 10);
    if (e.key === "]") spiel.bindung = Math.min(100, spiel.bindung + 10);
    if (k === "q") { zustand.q = zustand.q === QUALITAET.hoch ? QUALITAET.niedrig : QUALITAET.hoch; zustand.automatisch = false; groesse(); }
  }
  if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
});
addEventListener("keyup", (e) => { tasten[e.key.toLowerCase()] = false; });
addEventListener("blur", () => { for (const k in tasten) tasten[k] = false; });
vorn.style.pointerEvents = "auto";
vorn.addEventListener("pointerdown", (e) => {
  if (zustand.phase === "zwischen") return weiter();
  if (einsatz?.moment) return entscheiden(e.clientX < innerWidth / 2 ? "distanz" : "naehe");
  zeiger.aktiv = true; zeiger.x0 = e.clientX; zeiger.y0 = e.clientY; zeiger.x = zeiger.y = 0; vorn.setPointerCapture(e.pointerId);
});
vorn.addEventListener("pointermove", (e) => {
  if (!zeiger.aktiv) return;
  const r = Math.min(innerWidth, innerHeight) * 0.25;
  zeiger.x = Math.max(-1, Math.min(1, (e.clientX - zeiger.x0) / r));
  zeiger.y = Math.max(-1, Math.min(1, (zeiger.y0 - e.clientY) / r));
});
["pointerup", "pointercancel"].forEach((n) => vorn.addEventListener(n, () => { zeiger.aktiv = false; zeiger.x = zeiger.y = 0; }));

function eingabe(dt) {
  let x = 0, y = 0;
  if (tasten.arrowleft || tasten.a) x -= 1;
  if (tasten.arrowright || tasten.d) x += 1;
  if (tasten.arrowup || tasten.w) y += 1;
  if (tasten.arrowdown || tasten.s) y -= 1;
  tastenLenkung = tastenAnlauf(tastenLenkung, x, dt);
  x = tastenLenkung;
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

// --- Ablauf ----------------------------------------------------------------------------
function schritt(dt, lenkung) {
  const lenkt = frei || (zustand.phase === "einsatz" && !einsatz.moment);
  fliegen(flug, dt, lenkt ? lenkung : { x: 0, y: 0 }, spiel.bindung);
  if (zustand.phase === "einsatz") {
    for (const ereignis of einsatzSchritt(einsatz, dt, flug)) {
      if (ereignis.art === "treffer") zustand.erschuetterung = 1;
      if (ereignis.art === "knapp") zustand.erschuetterung = Math.max(zustand.erschuetterung, 0.35);
    }
    if (einsatz.ende) { einsatzAbschliessen(einsatz, spiel); zustand.phase = "zwischen"; zustand.karteSeit = 0; }
  } else zustand.karteSeit += dt;
  zustand.erschuetterung = Math.max(0, zustand.erschuetterung - dt * 1.6);
  // Die Stimmung folgt der Bindung langsam - man soll den Wandel spueren, nicht springen sehen
  zustand.waerme += (kennwerte(spiel.bindung).waerme - zustand.waerme) * Math.min(1, dt * 0.6);
}

// --- Bild ----------------------------------------------------------------------------
let letzterKurs = 0;
function bild(t, dt) {
  const zeit = einsatz ? einsatz.nr : zustand.zeit;
  const st = stimmung(zeit, zustand.waerme);
  const kam = kamera(flug);
  const e = zustand.erschuetterung;
  kam[1] += Math.sin(t * 47) * 0.012 * e; kam[2] += Math.sin(t * 31) * 0.03 * e;
  if (himmel) himmel.zeichnen(st, t, flug.pos, flug.hoehe, kam, zustand.q);
  const W = vorn.width, H = vorn.height;
  g2.clearRect(0, 0, W, H);
  const licht = {
    sonne: aufSchirm(kam, st.sonne, W, H),
    farbe: st.sonnenFarbe.map((x) => Math.pow(x, 1 / 2.2)), himmel: st.horizont.map((x) => Math.pow(x, 1 / 2.2)),
    waerme: zustand.waerme
  };
  let blitz = 0;
  if (einsatz && zustand.phase === "einsatz") blitz = hindernisseZeichnen(g2, W, H, einsatz, kam, licht, t);
  const drehrate = dt > 0 ? (flug.kurs - letzterKurs) / dt : 0; letzterKurs = flug.kurs;
  teilchenZeichnen(g2, W, H, teilchen, flug, dt, zustand.waerme, drehrate);
  dracheZeichnen(g2, W, H, flug, licht, t);

  // Blitzlicht und Treffer legen sich ueber alles
  zustand.blitz = Math.max(blitz, zustand.blitz - dt * 4);
  if (zustand.blitz > 0.01) { g2.fillStyle = `rgba(210,220,255,${zustand.blitz * 0.35})`; g2.fillRect(0, 0, W, H); }
  if (e > 0.5) {
    const rot = g2.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    rot.addColorStop(0, "rgba(90,10,10,0)"); rot.addColorStop(1, `rgba(90,10,10,${(e - 0.5) * 1.2})`);
    g2.fillStyle = rot; g2.fillRect(0, 0, W, H);
  }

  if (zustand.phase === "einsatz") {
    if (einsatz.moment) momentZeichnen(g2, W, H, einsatz.moment, einsatz.momentSeit);
    else if (!titelZeichnen(g2, W, H, einsatz)) zeileZeichnen(g2, W, H, einsatz.zeile, einsatz.uhr);
  } else if (zustand.phase === "zwischen") {
    // Vorlaeufig: die Zwischenszenen kommen im naechsten Schritt
    karteZeichnen(g2, W, H, [["Ende des Einsatzes", "gross"], [EINSAETZE[einsatz.nr].titel], ["Weiter mit Leertaste oder Tippen", "leise"]], Math.min(1, zustand.karteSeit));
  } else if (zustand.phase === "ende") {
    karteZeichnen(g2, W, H, [["Die Ausgänge folgen", "gross"]], Math.min(1, zustand.karteSeit));
  }

  if (erprobung || frei) {
    g2.font = `${Math.round(H * 0.018)}px "Cormorant Garamond", Georgia, serif`;
    g2.textAlign = "left";
    g2.fillStyle = "rgba(255,248,235,.6)";
    const wo = einsatz ? `Einsatz ${einsatz.nr + 1} · ${Math.round(einsatz.uhr)} s · Treffer ${einsatz.treffer}` : `Freier Flug · ${TAGESZEITEN[zustand.zeit].name}`;
    g2.fillText(`${wo} · Bindung ${spiel.bindung} · Verdacht ${spiel.verdacht} · ${zustand.q.name}${zustand.fps ? ` · ${Math.round(zustand.fps)} fps` : ""}`, H * 0.03, H * 0.97);
  }
}

// --- Start ----------------------------------------------------------------------------
// Testbilder: Einsatz (oder freien Flug) mit dem gedachten Spieler vorrechnen
const fest = param.has("t") ? Number(param.get("t")) : null;
const testLenkung = param.has("lenk") ? { x: Number(param.get("lenk")), y: 0 } : null;
if (param.has("uhr") && einsatz) {
  const bis = Number(param.get("uhr")), pilot = autopilot(), dt = 1 / 30;
  while (einsatz.uhr < bis && !einsatz.ende) {
    schritt(dt, pilot(einsatz, flug, dt));
    if (einsatz.moment) { if (einsatz.uhr >= bis - 0.05) break; waehlen(einsatz, spiel, "distanz"); }
  }
  if (einsatz.moment) einsatz.momentSeit = fest !== null ? 3 : 0;
  zustand.waerme = kennwerte(spiel.bindung).waerme;
} else if (frei && fest !== null) {
  for (let i = 0; i < 240; i++) fliegen(flug, 1 / 60, testLenkung ?? { x: 0, y: 0 }, spiel.bindung);
}

if (fest !== null) {
  const bereit = () => requestAnimationFrame(() => { bild(fest, 1 / 60); document.documentElement.dataset.bereit = "1"; });
  // Erst zeichnen, wenn die Schrift da ist (oder sicher nicht kommt)
  const schnitte = ['500 20px "Cormorant Garamond"', 'italic 500 20px "Cormorant Garamond"', '600 20px "Cormorant Garamond"'];
  Promise.all(schnitte.map((f) => document.fonts?.load(f).catch(() => null))).then(bereit, bereit);
} else {
  let zuletzt = 0;
  const schleife = (ts) => {
    const dt = Math.min(0.05, (ts - zuletzt) / 1000 || 0.016); zuletzt = ts;
    qualitaetPruefen(dt * 1000);
    schritt(dt, testLenkung ?? eingabe(dt));
    bild(ts / 1000, dt);
    requestAnimationFrame(schleife);
  };
  requestAnimationFrame(schleife);
}
if (!himmel) document.documentElement.dataset.webgl = "fehlt";
window.__flug = { zustand, spiel, get flug() { return flug; }, get einsatz() { return einsatz; } };

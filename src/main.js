// Einstieg: Spielschleife, Eingabe, Zeichnen.
//
// Ablauf: Titel → Einsatz 1 → Szene 1 → … → Einsatz 5 → Ausgang.
// Steuerung: Pfeile oder WASD, Maus oder Finger ziehen. M oder das Zeichen
// oben rechts schaltet den Ton. Bei zwei
// Moeglichkeiten waehlt ← / → (oder Tippen links/rechts). Leertaste, Enter
// oder Tippen blaettert weiter.
//
// Erproben:   ?einsatz=1..5 · ?szene=1..4 · ?ausgang=grenze|geheimnis|tribunal|pflicht|sturz
//             ?erprobung (Werte unten, [ ] Bindung, Q) · ?frei (freier Flug, 1-5 Tageszeit)
//             ?bindung= ?verdacht= ?zufall=0..1 (Entdeckung erzwingen oder ausschliessen)
//             ?ohnewebgl (die 2D-Fassung des Himmels)
// Testbilder: ?t=Sek, dazu ?uhr=Sek (Einsatz vorrechnen) oder ?schritte=n (weiterblaettern)

import { himmelErstellen, QUALITAET } from "./himmel.js";
import { himmel2dErstellen } from "./himmel2d.js";
import { stimmung, TAGESZEITEN } from "./stimmung.js";
import { neuerFlug, fliegen, kamera, kennwerte } from "./flug.js";
import { dracheZeichnen, aufSchirm, teilchenErstellen, teilchenZeichnen } from "./drache.js";
import { neuesSpiel, einsatzBeginnen, einsatzSchritt, einsatzAbschliessen, waehlen, autopilot, tastenAnlauf, regenStaerke } from "./einsatz.js";
import { szeneBeginnen, szeneWeiter, szeneWaehlen, verhaftet, ausgang } from "./geschichte.js";
import { hindernisseZeichnen, regenSchleier, regenZeichnen } from "./einsatzbild.js";
import { tonStarten, tonFuehren, tonEreignis, stummSchalten, istStumm, tonProbe } from "./ton.js";
import { zeileZeichnen, momentZeichnen, titelZeichnen, seiteZeichnen } from "./schrift.js";
import { TITEL, AUSGAENGE, NOCHMAL } from "./data/szenen.js";

const param = new URLSearchParams(location.search);
let glc = document.getElementById("himmel");
const vorn = document.getElementById("hud");
const g2 = vorn.getContext("2d");
const frei = param.has("frei"), erprobung = param.has("erprobung");

const spiel = neuesSpiel();
if (param.has("bindung")) spiel.bindung = Number(param.get("bindung"));
if (param.has("verdacht")) spiel.verdacht = Number(param.get("verdacht"));
if (param.has("zufall")) { const z = Number(param.get("zufall")); spiel.zufall = () => z; }

const zustand = {
  phase: "titel",                       // titel | einsatz | szene | ausgang | frei
  seit: 0,                              // Zeitpunkt, an dem die Phase begann
  uhr: 0,                               // laufende Zeit fuer Texteinblendungen
  zeit: Number(param.get("zeit") ?? 4),
  waerme: kennwerte(spiel.bindung).waerme,
  q: QUALITAET[param.get("q")] || QUALITAET.hoch,
  automatisch: !param.has("q"),
  fps: 0, erschuetterung: 0, blitz: 0, letzteAktion: -1, leuchten: 6
};
let einsatz = null, szene = null, ende = null;

// Erst WebGL; geht das nicht, eine ruhige 2D-Fassung auf frischer Leinwand
// (eine Leinwand, die WebGL versucht hat, gibt keinen 2D-Kontext mehr her)
let himmel = param.has("ohnewebgl") ? null : (() => { try { return himmelErstellen(glc); } catch (e) { console.error(e); return null; } })();
const zweiD = !himmel;
if (zweiD) {
  const neu = glc.cloneNode(); glc.replaceWith(neu); glc = neu;
  himmel = himmel2dErstellen(glc);
}
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

// --- Phasen ----------------------------------------------------------------------------
function phase(name) { zustand.phase = name; zustand.seit = zustand.uhr; }

function einsatzStarten(nr) {
  einsatz = einsatzBeginnen(nr); szene = null; flug = neuerFlug();
  phase("einsatz");
}
function szeneStarten(nr) {
  szene = szeneBeginnen(nr, spiel);
  phase("szene");
  szeneWeiter(szene, spiel, spiel.zufall);
  stempeln();
}
function ausgangZeigen(name) {
  ende = { name, d: AUSGAENGE[name], gezeigt: [zustand.uhr + 0.6] };
  phase("ausgang");
  tonEreignis("ausgang", name);
}
// Neue Absaetze bekommen ihren Zeitpunkt, damit sie einzeln einblenden
function stempeln() {
  for (const z of szene.zeilen) if (z.t === undefined) z.t = zustand.uhr;
  if (szene.wahl && szene.wahl.t === undefined) szene.wahl.t = zustand.uhr;
}

// --- Eingabe ----------------------------------------------------------------------
const tasten = {};
const zeiger = { aktiv: false, x0: 0, y0: 0, x: 0, y: 0 };
let tastenLenkung = 0;

function weiter(test = false) {
  // Ein Doppeltipp soll nicht zwei Seiten weiterblaettern
  if (!test && zustand.uhr - zustand.letzteAktion < 0.45) return;
  zustand.letzteAktion = zustand.uhr;
  const p = zustand.phase;
  if (p !== "einsatz" && p !== "frei") tonEreignis("seite");
  if (p === "titel") einsatzStarten(0);
  else if (p === "szene" && !szene.wahl) {
    szeneWeiter(szene, spiel, spiel.zufall);
    stempeln();
    if (szene.fertig) verhaftet(spiel) ? ausgangZeigen("tribunal") : einsatzStarten(szene.nr + 1);
  } else if (p === "ausgang") {
    if (ende.gezeigt.length < ende.d.absaetze.length) ende.gezeigt.push(zustand.uhr);
    else if (!test) location.reload();
  }
}
function entscheiden(seite) {
  if (zustand.phase === "einsatz" && einsatz.moment && einsatz.momentSeit > 1.6) {
    const wahl = seite === "links" ? "distanz" : "naehe";
    waehlen(einsatz, spiel, wahl);
    tonEreignis(wahl);
  }
  if (zustand.phase === "szene" && szene.wahl && zustand.uhr - szene.wahl.t > 1.4) {
    szeneWaehlen(szene, spiel, seite);
    tonEreignis(seite === "rechts" && szene.nr === 3 && szene.stufe === "tuer" ? "naehe" : "seite");
    stempeln();
    zustand.letzteAktion = zustand.uhr;
  }
}

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  tasten[k] = true;
  tonStarten();
  if (k === "m") stummSchalten();
  if (!e.repeat && (k === "arrowleft" || k === "a")) entscheiden("links");
  if (!e.repeat && (k === "arrowright" || k === "d")) entscheiden("rechts");
  if (!e.repeat && (k === " " || k === "enter")) weiter();
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
// Tonschalter oben rechts, als gezeichnetes Zeichen
const schalterFlaeche = () => ({ x: innerWidth - 56, y: 8, b: 48 });
vorn.addEventListener("pointerdown", (e) => {
  tonStarten();
  const f = schalterFlaeche();
  if (e.clientX > f.x && e.clientY < f.y + f.b) { stummSchalten(); return; }
  const offen = (zustand.phase === "einsatz" && einsatz.moment) || (zustand.phase === "szene" && szene.wahl);
  if (offen) return entscheiden(e.clientX < innerWidth / 2 ? "links" : "rechts");
  if (zustand.phase !== "einsatz" && zustand.phase !== "frei") return weiter();
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

// --- Bildwahl je Phase ---------------------------------------------------------------
// Tageszeit, Waerme, ob der Drache zu sehen ist, wie stark der Text das Bild abdeckt
const AUSGANGSBILD = {
  grenze: { zeit: 4, waerme: 1, drache: true }, geheimnis: { zeit: 3, waerme: 0.8, drache: true },
  pflicht: { zeit: 1, waerme: 0, drache: true }, tribunal: { zeit: 3, waerme: 0, drache: false },
  sturz: { zeit: 2, waerme: 0.1, drache: false, regen: 0.5 }
};
function bildwahl() {
  const warm = kennwerte(spiel.bindung).waerme;
  switch (zustand.phase) {
    case "titel": return { zeit: 0, waerme: 0.35, drache: true, schleier: 0.4 };
    case "einsatz": return { zeit: einsatz.nr, waerme: warm, drache: true, regen: regenStaerke(einsatz) };
    // Nach dem Gewitter regnet es auf das Zelt der Hauptfrau
    case "szene": return { zeit: szene.nr, waerme: warm, drache: false, schleier: 0.74, regen: szene.nr === 2 ? 0.35 : 0 };
    case "ausgang": return { ...AUSGANGSBILD[ende.name], schleier: 0.5 };
    default: return { zeit: zustand.zeit, waerme: warm, drache: true };
  }
}

// --- Ablauf ----------------------------------------------------------------------------
function schritt(dt, lenkung) {
  zustand.uhr += dt;
  const p = zustand.phase;
  // Ausserhalb der Einsaetze zieht er ruhige Bogen von selbst
  const lenkt = p === "frei" || (p === "einsatz" && !einsatz.moment);
  const ruhig = p === "einsatz" ? { x: 0, y: 0 } : { x: Math.sin(zustand.uhr * 0.13) * 0.25, y: 0 };
  fliegen(flug, dt, lenkt ? lenkung : ruhig, spiel.bindung);
  if (p === "einsatz") {
    for (const ereignis of einsatzSchritt(einsatz, dt, flug)) {
      if (ereignis.art === "treffer") zustand.erschuetterung = 1;
      if (ereignis.art === "knapp") zustand.erschuetterung = Math.max(zustand.erschuetterung, 0.35);
      if (ereignis.art === "frei") tonEreignis("vorbei");
      if (ereignis.art === "treffer" || ereignis.art === "knapp" || ereignis.art === "moment") tonEreignis(ereignis.art);
    }
    // Pfeile hoert man kurz bevor sie da sind
    for (const h of einsatz.hindernisse) {
      if (h.typ === "pfeile" && !h.gehoert && h.ankunft - einsatz.uhr < 1.3) { h.gehoert = true; tonEreignis("pfeile"); }
    }
    // Wetterleuchten: ferne Blitze, die nichts wollen ausser da sein
    if (einsatz.d.wetterleuchten && !einsatz.moment && (zustand.leuchten -= dt) < 0) {
      const nah = 0.2 + Math.random() * 0.5;
      zustand.blitz = Math.max(zustand.blitz, nah * 0.8); tonEreignis("donner", nah);
      zustand.leuchten = 5 + Math.random() * 8;
    }
    if (einsatz.ende) {
      einsatzAbschliessen(einsatz, spiel);
      einsatz.nr < 4 ? szeneStarten(einsatz.nr) : ausgangZeigen(ausgang(spiel));
    }
  }
  zustand.erschuetterung = Math.max(0, zustand.erschuetterung - dt * 1.6);
  const w = bildwahl();
  tonFuehren({
    tempo: flug.tempo, drehrate: zustand.drehrate || 0, waerme: zustand.waerme, schlag: flug.schlag, zeit: zustand.uhr,
    laut: { einsatz: einsatz?.moment ? 0.4 : 1, frei: 1, titel: 0.6, szene: 0.25, ausgang: 0.5 }[p] ?? 1,
    regen: w.regen || 0, drache: w.drache
  });
  // Die Stimmung folgt langsam - man soll den Wandel spueren, nicht springen sehen
  zustand.waerme += (bildwahl().waerme - zustand.waerme) * Math.min(1, dt * 0.6);
}

// --- Bild ----------------------------------------------------------------------------
let letzterKurs = 0;
function bild(t, dt) {
  const wahl = bildwahl();
  const st = stimmung(wahl.zeit, zustand.waerme);
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
  if (zustand.phase === "einsatz") blitz = hindernisseZeichnen(g2, W, H, einsatz, kam, licht, t);
  const drehrate = dt > 0 ? (flug.kurs - letzterKurs) / dt : 0; letzterKurs = flug.kurs;
  zustand.drehrate = drehrate;
  regenSchleier(g2, W, H, wahl.regen || 0);
  if (wahl.drache) {
    teilchenZeichnen(g2, W, H, teilchen, flug, dt, zustand.waerme, drehrate);
    dracheZeichnen(g2, W, H, flug, licht, t);
  }
  regenZeichnen(g2, W, H, wahl.regen || 0, flug, dt, drehrate);
  // Ein naher Blitz aus den Hindernissen bringt seinen Donner mit
  if (blitz > 0.3 && zustand.uhr - (zustand.donnerZuletzt ?? -9) > 1.2) { tonEreignis("donner", Math.min(1, blitz)); zustand.donnerZuletzt = zustand.uhr; }

  // Blitzlicht und Treffer legen sich ueber alles
  zustand.blitz = Math.max(blitz, zustand.blitz - dt * 4);
  if (zustand.blitz > 0.01) { g2.fillStyle = `rgba(210,220,255,${zustand.blitz * 0.35})`; g2.fillRect(0, 0, W, H); }
  if (e > 0.5) {
    const rot = g2.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    rot.addColorStop(0, "rgba(90,10,10,0)"); rot.addColorStop(1, `rgba(90,10,10,${(e - 0.5) * 1.2})`);
    g2.fillStyle = rot; g2.fillRect(0, 0, W, H);
  }

  const seit = zustand.uhr - zustand.seit, jetzt = zustand.uhr;
  if (zustand.phase === "einsatz") {
    if (einsatz.moment) momentZeichnen(g2, W, H, einsatz.moment, einsatz.momentSeit);
    else if (!titelZeichnen(g2, W, H, einsatz)) zeileZeichnen(g2, W, H, einsatz.zeile, einsatz.uhr);
  } else if (zustand.phase === "titel") {
    const absaetze = [...TITEL.absaetze.map((text) => ({ text })), { text: TITEL.bedienung, stil: "lage" }]
      .map((p, i) => ({ ...p, t: zustand.seit + 0.8 + i * 0.9 }));
    seiteZeichnen(g2, W, H, { kopf: TITEL.name, gross: true, absaetze, fuss: TITEL.weiter, jetzt, seit, schleier: wahl.schleier });
  } else if (zustand.phase === "szene") {
    seiteZeichnen(g2, W, H, { kopf: szene.d.ort, absaetze: szene.zeilen, wahl: szene.wahl, fuss: "Weiter: Leertaste oder Tippen", jetzt, seit, schleier: wahl.schleier });
  } else if (zustand.phase === "ausgang") {
    const absaetze = ende.gezeigt.map((t, i) => ({ text: ende.d.absaetze[i], t }));
    const alle = ende.gezeigt.length === ende.d.absaetze.length;
    seiteZeichnen(g2, W, H, { kopf: ende.d.titel, gross: true, absaetze, fuss: alle ? NOCHMAL : "Weiter: Leertaste oder Tippen", jetzt, seit, schleier: wahl.schleier });
  }

  schalterZeichnen(W, H);

  if (erprobung || frei) {
    g2.font = `${Math.round(H * 0.018)}px "Cormorant Garamond", Georgia, serif`;
    g2.textAlign = "left";
    g2.fillStyle = "rgba(255,248,235,.6)";
    const wo = zustand.phase === "einsatz" ? `Einsatz ${einsatz.nr + 1} · ${Math.round(einsatz.uhr)} s · Treffer ${einsatz.treffer}`
      : zustand.phase === "frei" ? `Freier Flug · ${TAGESZEITEN[zustand.zeit].name}` : zustand.phase;
    g2.fillText(`${wo} · Bindung ${spiel.bindung} · Verdacht ${spiel.verdacht} · Narben ${spiel.narben.join("/")} · ${zustand.q.name}${zustand.fps ? ` · ${Math.round(zustand.fps)} fps` : ""}`, H * 0.03, H * 0.97);
  }
}

// Lautsprecher als Strichzeichnung; durchgestrichen, wenn stumm
function schalterZeichnen(W, H) {
  const d = W / innerWidth, f = schalterFlaeche();
  const x = (f.x + f.b / 2) * d, y = (f.y + f.b / 2) * d, s = 9 * d;
  g2.save();
  g2.strokeStyle = g2.fillStyle = "rgba(245,238,226,0.55)";
  g2.lineWidth = 1.6 * d; g2.lineJoin = "round";
  g2.beginPath();
  g2.moveTo(x - s, y - s * 0.4); g2.lineTo(x - s * 0.45, y - s * 0.4); g2.lineTo(x + s * 0.15, y - s);
  g2.lineTo(x + s * 0.15, y + s); g2.lineTo(x - s * 0.45, y + s * 0.4); g2.lineTo(x - s, y + s * 0.4); g2.closePath();
  g2.stroke();
  g2.beginPath();
  if (istStumm()) { g2.moveTo(x + s * 0.5, y - s * 0.45); g2.lineTo(x + s * 1.2, y + s * 0.45); g2.moveTo(x + s * 1.2, y - s * 0.45); g2.lineTo(x + s * 0.5, y + s * 0.45); }
  else { g2.arc(x + s * 0.2, y, s * 0.6, -0.8, 0.8); g2.moveTo(x + s * 0.2 + s * 1.05 * Math.cos(-0.8), y + s * 1.05 * Math.sin(-0.8)); g2.arc(x + s * 0.2, y, s * 1.05, -0.8, 0.8); }
  g2.stroke();
  g2.restore();
}

// --- Start ----------------------------------------------------------------------------
const fest = param.has("t") ? Number(param.get("t")) : null;
const testLenkung = param.has("lenk") ? { x: Number(param.get("lenk")), y: 0 } : null;

if (frei) phase("frei");
else if (param.has("einsatz")) einsatzStarten(Math.max(0, Math.min(4, Number(param.get("einsatz")) - 1)));
else if (param.has("szene")) szeneStarten(Math.max(0, Math.min(3, Number(param.get("szene")) - 1)));
else if (param.has("ausgang") && AUSGAENGE[param.get("ausgang")]) ausgangZeigen(param.get("ausgang"));

// Testbilder: Einsatz mit dem gedachten Spieler vorrechnen, Seiten weiterblaettern
if (param.has("uhr") && einsatz) {
  const bis = Number(param.get("uhr")), pilot = autopilot(), dt = 1 / 30;
  while (einsatz.uhr < bis && !einsatz.ende) {
    schritt(dt, pilot(einsatz, flug, dt));
    if (einsatz.moment) { if (einsatz.uhr >= bis - 0.05) break; waehlen(einsatz, spiel, "distanz"); }
  }
  if (einsatz.moment) einsatz.momentSeit = fest !== null ? 3 : 0;
  zustand.waerme = kennwerte(spiel.bindung).waerme;
} else if (fest !== null) {
  for (let i = 0; i < 240; i++) schritt(1 / 60, testLenkung ?? { x: 0, y: 0 });
}
for (let i = 0; i < Number(param.get("schritte") || 0); i++) {
  if (szene?.wahl) entscheiden(param.get("wahl") || "rechts"); else weiter(true);
  zustand.uhr += 2;
}
if (fest !== null) { zustand.uhr += 30; zustand.waerme = bildwahl().waerme; }

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
if (zweiD) document.documentElement.dataset.webgl = "fehlt";
// Wenn gar nichts zeichnen kann, bleibt der Text als Seite
if (!himmel) document.getElementById("notnagel")?.classList.add("sichtbar");
window.__ton = { probe: tonProbe, starten: tonStarten };
window.__flug = { zustand, spiel, get flug() { return flug; }, get einsatz() { return einsatz; }, get szene() { return szene; }, get ende() { return ende; } };

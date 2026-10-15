// Vorschau des Himmels - noch ohne Spiel. Tasten: 1-5 Tageszeit,
// Pfeile links/rechts Waerme, Q Qualitaet. Adressparameter fuer Tests:
// ?zeit=0..4&waerme=0..1&q=hoch|niedrig&t=Sekunden (Bild einfrieren)

import { himmelErstellen, QUALITAET } from "./himmel.js";
import { stimmung, TAGESZEITEN } from "./stimmung.js";

const param = new URLSearchParams(location.search);
const gl = document.getElementById("himmel"), hud = document.getElementById("hud");
const g2 = hud.getContext("2d");

const zustand = {
  zeit: Number(param.get("zeit") ?? 1),
  waerme: Number(param.get("waerme") ?? 0.5),
  q: QUALITAET[param.get("q")] || QUALITAET.hoch,
  automatisch: !param.has("q"),
  fps: 0
};

const himmel = (() => { try { return himmelErstellen(gl); } catch (e) { console.error(e); return null; } })();

function groesse() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  gl.width = Math.round(innerWidth * dpr * zustand.q.skala);
  gl.height = Math.round(innerHeight * dpr * zustand.q.skala);
  hud.width = Math.round(innerWidth * dpr); hud.height = Math.round(innerHeight * dpr);
}
groesse();
addEventListener("resize", groesse);

addEventListener("keydown", (e) => {
  if (/^[1-5]$/.test(e.key)) zustand.zeit = Number(e.key) - 1;
  if (e.key === "ArrowLeft") zustand.waerme = Math.max(0, zustand.waerme - 0.1);
  if (e.key === "ArrowRight") zustand.waerme = Math.min(1, zustand.waerme + 0.1);
  if (e.key.toLowerCase() === "q") { zustand.q = zustand.q === QUALITAET.hoch ? QUALITAET.niedrig : QUALITAET.hoch; zustand.automatisch = false; groesse(); }
});

// Bildrate messen; faellt sie dauerhaft unter ~40 fps, eine Stufe zurueck
let rahmen = [], zuletzt = 0;
function qualitaetPruefen(dt) {
  rahmen.push(dt); if (rahmen.length > 90) rahmen.shift();
  const mittel = rahmen.reduce((a, b) => a + b, 0) / rahmen.length;
  zustand.fps = 1000 / mittel;
  if (zustand.automatisch && rahmen.length === 90 && mittel > 25 && zustand.q === QUALITAET.hoch) {
    zustand.q = QUALITAET.niedrig; rahmen = []; groesse();
  }
}

function beschriften() {
  const k = hud.width / 1000;
  g2.clearRect(0, 0, hud.width, hud.height);
  g2.font = `${Math.round(15 * k)}px "Cormorant Garamond", Georgia, serif`;
  g2.fillStyle = "rgba(255,248,235,.85)";
  g2.fillText(`${TAGESZEITEN[zustand.zeit].name} · Wärme ${zustand.waerme.toFixed(1)} · Qualität ${zustand.q.name}${zustand.fps ? ` · ${Math.round(zustand.fps)} fps` : ""}`, 24 * k, hud.height - 24 * k);
}

const fest = param.has("t") ? Number(param.get("t")) : null;
function schleife(ts) {
  const dt = ts - zuletzt || 16; zuletzt = ts;
  if (fest === null) qualitaetPruefen(dt);
  const t = fest ?? ts / 1000;
  // Sanftes Schwanken, als saesse man auf einem fliegenden Ruecken
  const kamera = [Math.sin(t * 0.07) * 0.15, -0.13 + Math.sin(t * 0.31) * 0.02, Math.sin(t * 0.23) * 0.04];
  if (himmel) himmel.zeichnen(stimmung(zustand.zeit, zustand.waerme), t, t * 1.2, kamera, zustand.q);
  beschriften();
  if (fest === null) requestAnimationFrame(schleife);
  else document.documentElement.dataset.bereit = "1";
}
requestAnimationFrame(schleife);
if (!himmel) document.documentElement.dataset.webgl = "fehlt";
window.__himmel = zustand;   // zum Messen der Bildrate von aussen

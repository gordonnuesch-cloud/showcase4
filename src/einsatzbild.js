// Gefahren im Bild: Felsnadeln, Pfeilsalven, Blitze, feindliche Reiter.
// Sie fuellen den ganzen Himmel bis auf eine Luecke und kommen naeher. Es gibt
// keinen Zielrahmen; die Luecke sieht man - oder der Drache zeigt sie einem.

import { aufSchirm } from "./drache.js";
import { brennweite } from "./himmel.js";

const richtung = (gier, nick) => [Math.sin(gier) * Math.cos(nick), Math.sin(nick), Math.cos(gier) * Math.cos(nick)];
const zufall = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rgb = (c, a = 1) => `rgba(${c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)).join(",")},${a})`;
const misch = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

/**
 * Zeichnet alle Hindernisse eines Einsatzes. Gibt die Staerke eines
 * Blitzlichts zurueck (0..1), das main ueber das ganze Bild legt.
 */
export function hindernisseZeichnen(g, W, H, e, kam, licht, t) {
  let blitzlicht = 0;
  // Groessen nach der Brennweite: hochkant waeren sie sonst riesig
  const s = brennweite(W, H) * H / 1.35 / 1000;
  for (const h of e.hindernisse) {
    // nah: 0 am Horizont, 1 bei Ankunft, darueber zieht es vorbei
    const nah = Math.max(0, 1 - (h.ankunft - e.uhr) / h.vorlauf);
    const vorbei = Math.max(0, nah - 1) / 0.18;          // 0..~1 nach der Ankunft
    const sicht = Math.min(1, nah * 4) * (1 - Math.min(1, vorbei));
    if (sicht <= 0) continue;
    // Ferne Dinge nehmen die Farbe des Dunstes an, nahe werden dunkel
    const farbe = misch(licht.himmel.map((x) => x * 0.75), [0.03, 0.03, 0.05], Math.min(1, 0.3 + nah * 0.75));
    const rand = h.toleranz + 0.04;
    for (const seite of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const k = h.saat + i * 13.7 + (seite > 0 ? 500 : 0);
        const abstand = rand + i * ({ felsen: 0.11, pfeile: 0.07, blitz: 0.17, reiter: 0.16 }[h.typ]) + zufall(k) * 0.04;
        // Beim Vorbeiziehen weichen die Dinge nach aussen aus dem Bild
        const gier = h.ziel + seite * (abstand + vorbei * 0.5);
        const art = { felsen, pfeile, blitz, reiter }[h.typ];
        blitzlicht = Math.max(blitzlicht, art(g, W, H, s, kam, gier, nah, k, farbe, sicht, t, seite, licht.himmel) || 0);
      }
    }
  }
  return blitzlicht;
}

function felsen(g, W, H, s, kam, gier, nah, k, farbe, sicht, t, seite, dunst) {
  const p = aufSchirm(kam, richtung(gier, -0.03 - zufall(k + 1) * 0.04), W, H);
  if (!p) return;
  const hoch = s * 1000 * (0.03 + 0.85 * Math.pow(Math.min(nah, 1.2), 2.4)) * (0.55 + zufall(k + 2) * 0.8);
  const breit = hoch * (0.2 + zufall(k + 3) * 0.12);
  const [x, y] = p, unten = Math.max(H * 1.05, y + s * 200), neig = (zufall(k + 4) - 0.5) * breit * 0.8;
  if (x + breit < 0 || x - breit > W) return;
  // Der Fuss steht im Wolkenmeer: nach unten loest sich der Fels im Dunst auf
  const fuss = g.createLinearGradient(0, y - hoch, 0, y + s * 80);
  fuss.addColorStop(0, rgb(farbe, sicht)); fuss.addColorStop(0.75, rgb(farbe, sicht));
  fuss.addColorStop(1, rgb(dunst, sicht * 0.0));
  g.fillStyle = fuss;
  g.beginPath();
  g.moveTo(x - breit * 0.5, unten);
  g.lineTo(x - breit * 0.38, y - hoch * 0.35);
  g.lineTo(x - breit * 0.2, y - hoch * 0.72);
  g.lineTo(x + neig, y - hoch);
  g.lineTo(x + breit * 0.16, y - hoch * 0.66);
  g.lineTo(x + breit * 0.3, y - hoch * 0.5);
  g.lineTo(x + breit * 0.42, y - hoch * 0.2);
  g.lineTo(x + breit * 0.5, unten);
  g.fill();
}

function pfeile(g, W, H, s, kam, gier, nah, k, farbe, sicht) {
  for (let j = 0; j < 3; j++) {
    const nick = -0.08 + zufall(k + j * 5.1) * 0.2;
    const p = aufSchirm(kam, richtung(gier + (zufall(k + j) - 0.5) * 0.05, nick), W, H);
    if (!p) continue;
    // Sie kommen auf einen zu: Strich vom Fluchtpunkt weg, wachsend
    const vx = p[0] - W / 2, vy = p[1] - H / 2, l = Math.hypot(vx, vy) || 1;
    const lang = s * 1000 * (0.006 + 0.09 * Math.pow(Math.min(nah, 1.2), 2.6));
    g.strokeStyle = rgb(farbe, sicht * 0.95);
    g.lineWidth = Math.max(1, s * (1 + 4 * nah * nah));
    g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + vx / l * lang, p[1] + vy / l * lang); g.stroke();
  }
}

function blitz(g, W, H, s, kam, gier, nah, k, farbe, sicht, t) {
  // Jeder Strahl flackert in eigenem Takt; je naeher, desto oefter
  const takt = Math.floor(t * 9 + zufall(k) * 50);
  if (zufall(takt * 3.7 + k) > 0.08 + nah * 0.5) return 0;
  const oben = aufSchirm(kam, richtung(gier, 0.5), W, H), unten = aufSchirm(kam, richtung(gier, -0.08), W, H);
  if (!oben || !unten) return 0;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.strokeStyle = `rgba(215,225,255,${0.35 + 0.6 * sicht * nah})`;
  g.shadowColor = "rgba(150,170,255,0.9)"; g.shadowBlur = 18 * s;
  g.lineWidth = Math.max(1, s * (1.5 + 4 * nah));
  g.beginPath();
  let x = oben[0], y = oben[1];
  g.moveTo(x, y);
  for (let i = 1; i <= 9; i++) {
    const u = i / 9;
    x = oben[0] + (unten[0] - oben[0]) * u + (zufall(takt + k + i) - 0.5) * s * 60 * (1 - u * 0.5);
    y = oben[1] + (unten[1] - oben[1]) * u;
    g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
  return 0.12 + 0.3 * nah * nah;
}

function reiter(g, W, H, s, kam, gier, nah, k, farbe, sicht, t) {
  const nick = -0.02 + (zufall(k + 7) - 0.4) * 0.12 + Math.sin(t * 1.3 + k) * 0.01;
  const p = aufSchirm(kam, richtung(gier, nick), W, H);
  if (!p) return;
  const gr = s * 1000 * (0.008 + 0.11 * Math.pow(Math.min(nah, 1.2), 2.3));
  const schlag = Math.sin(t * 5 + k * 3);
  const [x, y] = p;
  g.fillStyle = rgb(farbe, sicht);
  g.beginPath();
  // Fluegel als flaches M, Koerper als Spindel
  g.moveTo(x - gr * 1.6, y - gr * 0.35 * schlag);
  g.quadraticCurveTo(x - gr * 0.8, y - gr * (0.2 + 0.4 * schlag), x - gr * 0.15, y);
  g.lineTo(x + gr * 0.15, y);
  g.quadraticCurveTo(x + gr * 0.8, y - gr * (0.2 + 0.4 * schlag), x + gr * 1.6, y - gr * 0.35 * schlag);
  g.quadraticCurveTo(x + gr * 0.8, y + gr * 0.15, x, y + gr * 0.25);
  g.quadraticCurveTo(x - gr * 0.8, y + gr * 0.15, x - gr * 1.6, y - gr * 0.35 * schlag);
  g.fill();
  g.beginPath(); g.ellipse(x, y + gr * 0.1, gr * 0.14, gr * 0.6, 0, 0, Math.PI * 2); g.fill();
}

// --- Regen ---------------------------------------------------------------------------
// Schraege Striche im Flugwind. Beim Wenden und Rollen kippen sie mit.
const tropfen = Array.from({ length: 420 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }));

/** Ein grauer Schleier hinter dem Drachen: Regen nimmt dem Himmel die Tiefe. */
export function regenSchleier(g, W, H, staerke) {
  if (staerke <= 0.01) return;
  g.fillStyle = `rgba(70,78,92,${0.24 * staerke})`; g.fillRect(0, 0, W, H);
}

/** Die Tropfen selbst, vor dem Drachen. */
export function regenZeichnen(g, W, H, staerke, flug, dt, drehrate) {
  if (staerke <= 0.01) return;
  const n = Math.round(tropfen.length * 0.7 * staerke);
  const neig = flug.rolle * 1.4 + drehrate * 0.25 + 0.25;
  g.save();
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const p = tropfen[i];
    p.y += dt * (1.6 + p.z * 1.8);
    p.x += dt * neig * 0.6 * p.z;
    if (p.y > 1.05) { p.y -= 1.1; p.x = Math.random(); }
    if (p.x < -0.05) p.x += 1.1; if (p.x > 1.05) p.x -= 1.1;
    const x = p.x * W, y = p.y * H, l = H * (0.012 + 0.03 * p.z);
    g.strokeStyle = `rgba(205,214,232,${(0.06 + 0.2 * p.z * p.z) * Math.min(1, staerke * 1.5)})`;
    g.lineWidth = Math.max(1, H / 1000 * (0.6 + 1.2 * p.z));
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - neig * l * 0.35, y - l); g.stroke();
  }
  g.restore();
}

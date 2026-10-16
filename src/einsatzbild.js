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
export function hindernisseZeichnen(g, W, H, e, kam, licht, t, flug) {
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
    if (h.art === "hoch") { salveZeichnen(g, W, H, s, kam, h, nah, farbe, sicht, t, flug.hoehe); continue; }
    if (h.art === "tief") { patrouilleZeichnen(g, W, H, s, kam, h, nah, farbe, sicht, t, flug.hoehe); continue; }
    const rand = h.toleranz + 0.04;
    luekeZeichnen(g, W, H, s, kam, h, nah, sicht);
    for (const seite of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const k = h.saat + i * 13.7 + (seite > 0 ? 500 : 0);
        const abstand = rand + i * ({ felsen: 0.11, blitz: 0.17, staffel: 0.16 }[h.typ]) + zufall(k) * 0.04;
        // Beim Vorbeiziehen weichen die Dinge nach aussen aus dem Bild
        const gier = h.ziel + seite * (abstand + vorbei * 0.5);
        const art = { felsen, blitz, staffel: reiter }[h.typ];
        blitzlicht = Math.max(blitzlicht, art(g, W, H, s, kam, gier, nah, k, farbe, sicht, t, seite, licht.himmel) || 0);
      }
    }
  }
  return blitzlicht;
}

/** Ein leichter Lichtschein in der Luecke: dort ist der Himmel frei. */
function luekeZeichnen(g, W, H, s, kam, h, nah, sicht) {
  const p = aufSchirm(kam, richtung(h.ziel, 0.05), W, H);
  if (!p) return;
  const breit = Math.max(s * 60, Math.tan(h.toleranz) * brennweite(W, H) * H);
  const schein = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], breit * 1.4);
  schein.addColorStop(0, `rgba(255,244,220,${0.16 * sicht * Math.min(1, nah * 2)})`); schein.addColorStop(1, "rgba(255,244,220,0)");
  g.save(); g.fillStyle = schein; g.translate(p[0], p[1]); g.scale(1, 2.2); g.translate(-p[0], -p[1]);
  g.beginPath(); g.arc(p[0], p[1], breit * 1.4, 0, Math.PI * 2); g.fill(); g.restore();
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

// --- Hoehe: Salven von unten, Patrouillen auf eurer Hoehe -----------------------
// Entfernung voraus, aus der Naehe der Gefahr; daraus der Blickwinkel einer Hoehe.
const entfernung = (nah) => 0.35 + (1 - Math.min(nah, 1)) * 6;
const CLOUD = -0.75;   // Wolkenobergrenze wie im Shader (OBEN)

/**
 * Die Grenze sichtbar machen: eine Linie in der Hoehe, ab der man sicher ist,
 * und ein Dunst auf der gefaehrlichen Seite. Bei den Salven warm wie die
 * Funken, bei den Reitern kalt. gefahr: "unten" | "oben".
 */
function grenzeZeichnen(g, W, H, s, kam, hoehe, ziel, d, farbe, a, gefahr) {
  const punkte = [];
  for (let i = 0; i <= 24; i++) {
    const p = aufSchirm(kam, richtung(kam[0] + (i / 24 - 0.5) * 3.4, Math.atan2(ziel - hoehe, d)), W, H);
    if (p) punkte.push(p);
  }
  if (punkte.length < 2) return;
  g.save();
  // Dunst auf der Seite der Gefahr, zum Bildrand hin auslaufend
  const rand = gefahr === "unten" ? H * 1.2 : -H * 0.2;
  const mitteY = punkte[punkte.length >> 1][1];
  const dunst = g.createLinearGradient(0, mitteY, 0, mitteY + (rand - mitteY) * 0.6);
  const dunkel = gefahr === "oben" ? farbe.map((x) => x * 0.35) : farbe;   // ueber den Wolken: dunkler Schleier, nicht heller
  dunst.addColorStop(0, rgb(dunkel, 0.3 * a)); dunst.addColorStop(1, rgb(dunkel, 0));
  g.fillStyle = dunst;
  g.beginPath(); g.moveTo(punkte[0][0], rand);
  for (const p of punkte) g.lineTo(p[0], p[1]);
  g.lineTo(punkte[punkte.length - 1][0], rand); g.closePath(); g.fill();
  // Die Linie selbst, leicht schimmernd
  g.strokeStyle = rgb(farbe, 0.95 * a);
  g.lineWidth = Math.max(2, s * 3.2);
  g.shadowColor = rgb(farbe, a); g.shadowBlur = s * 16;
  g.setLineDash([s * 16, s * 9]); g.lineDashOffset = -performance.now() * 0.03 * s;
  g.beginPath(); punkte.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  // Pfeilspitzen zur sicheren Seite: hinauf ueber die Salve, hinab unter die Reiter
  g.setLineDash([]); g.shadowBlur = s * 8;
  const r = gefahr === "unten" ? -1 : 1, gr = s * 17;
  g.lineWidth = Math.max(2, s * 3.5);
  for (const i of [3, 6, 9, 12, 15, 18, 21]) {
    const p = punkte[Math.min(i, punkte.length - 1)];
    const y = p[1] + r * gr * 1.4;
    g.beginPath(); g.moveTo(p[0] - gr, y - r * gr * 0.6); g.lineTo(p[0], y + r * gr * 0.4); g.lineTo(p[0] + gr, y - r * gr * 0.6); g.stroke();
  }
  g.restore();
}

/**
 * Ballistenbolzen steigen in Bogen aus den Wolken bis knapp unter die Grenze
 * h.hoehe und zerstieben dort. Wer darueber fliegt, sieht sie unter sich.
 */
function salveZeichnen(g, W, H, s, kam, h, nah, farbe, sicht, t, hoehe) {
  const d = entfernung(nah), gross = s * 1000;
  // Die Funkenlinie: darueber ist es sicher; darunter liegt roetlicher Dunst
  grenzeZeichnen(g, W, H, s, kam, hoehe, h.hoehe, d, [1, 0.62, 0.35], sicht * Math.min(1, nah * 3), "unten");
  g.save();
  g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const k = h.saat + i * 3.17;
    const gier = kam[0] + (i / 69 - 0.5) * 3.2 + (zufall(k) - 0.5) * 0.04;
    const dd = d * (0.8 + zufall(k + 1) * 0.45);
    const u = (t * (0.9 + zufall(k + 2) * 0.5) + zufall(k + 3)) % 1;
    // Hoehe auf dem Bogen: schnell aus den Wolken, langsamer zum Scheitel
    const auf = (v) => CLOUD + (h.hoehe - 0.03 - CLOUD) * (1 - Math.pow(1 - v, 2));
    // ...und kommen dabei naeher: so stehen sie schraeg, wie auf einen gezielt
    const weg = (v) => dd * (1.35 - 0.55 * v);
    const punkt = (v) => aufSchirm(kam, richtung(gier, Math.atan2(auf(v) - hoehe, weg(v))), W, H);
    const kopf = punkt(u), schweif = punkt(Math.max(0, u - 0.3)), schaft = punkt(Math.max(0, u - 0.1));
    if (!kopf || !schweif || !schaft) continue;
    const dicke = Math.max(1.2, s * (1.5 + 4 * nah * nah) * (d / dd));
    // Rauchspur: hell, ausfransend
    const spur = g.createLinearGradient(schweif[0], schweif[1], kopf[0], kopf[1]);
    spur.addColorStop(0, "rgba(225,228,236,0)"); spur.addColorStop(1, `rgba(225,228,236,${0.6 * sicht})`);
    g.strokeStyle = spur; g.lineWidth = dicke * 2.4;
    g.beginPath(); g.moveTo(schweif[0], schweif[1]); g.lineTo(kopf[0], kopf[1]); g.stroke();
    // Schaft dunkel, Spitze mit einem Glanz
    g.strokeStyle = rgb(farbe, sicht); g.lineWidth = dicke;
    g.beginPath(); g.moveTo(schaft[0], schaft[1]); g.lineTo(kopf[0], kopf[1]); g.stroke();
    g.fillStyle = `rgba(255,236,200,${0.8 * sicht})`;
    g.beginPath(); g.arc(kopf[0], kopf[1], dicke * 0.9, 0, Math.PI * 2); g.fill();
    // Am Scheitel zerstiebt der Bolzen in ein paar Funken - dort ist die Grenze
    if (u > 0.92) {
      g.fillStyle = `rgba(255,200,140,${(1 - (u - 0.92) / 0.08) * 0.7 * sicht})`;
      for (let j = 0; j < 3; j++) g.fillRect(kopf[0] + (zufall(k + j) - 0.5) * gross * 0.02, kopf[1] - zufall(k + j + 5) * gross * 0.012, dicke, dicke);
    }
  }
  g.restore();
}

/** Feindliche Reiter auf eurer Hoehe und darueber; wer tief genug geht, hat sie ueber sich. */
function patrouilleZeichnen(g, W, H, s, kam, h, nah, farbe, sicht, t, hoehe) {
  const d = entfernung(nah);
  // Eine kalte Linie zeigt, wie tief man muss; darueber liegt ihr Blickfeld
  grenzeZeichnen(g, W, H, s, kam, hoehe, h.hoehe + 0.04, d, [0.78, 0.88, 1], sicht * Math.min(1, nah * 3), "oben");
  for (let i = 0; i < 16; i++) {
    const k = h.saat + i * 5.3;
    const gier = kam[0] + (i / 15 - 0.5) * 2.8 + (zufall(k) - 0.5) * 0.1;
    const dd = d * (0.8 + zufall(k + 1) * 0.5);
    const wy = h.hoehe + 0.08 + zufall(k + 2) * 0.45 + Math.sin(t * 1.1 + k) * 0.03;
    const p = aufSchirm(kam, richtung(gier, Math.atan2(wy - hoehe, dd)), W, H);
    if (!p) continue;
    const gr = s * 1000 * 0.05 / dd;
    reiterForm(g, p[0], p[1], gr, Math.sin(t * 5 + k * 3), rgb(farbe, sicht));
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
  reiterForm(g, p[0], p[1], gr, Math.sin(t * 5 + k * 3), rgb(farbe, sicht));
}

/** Ein Drache mit Reiter, von vorn gesehen: Fluegel als flaches M, Koerper als Spindel. */
function reiterForm(g, x, y, gr, schlag, farbe) {
  g.fillStyle = farbe;
  g.beginPath();
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

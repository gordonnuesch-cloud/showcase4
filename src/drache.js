// Der Drache als Silhouette vorn im Bild, dazu Glut und Asche im Flugwind.
// Gezeichnet im 2D-Canvas ueber dem WebGL-Himmel. Keine Gesichter, keine
// Details, die Code-Grafik verraten wuerden: dunkle Form, Lichtsaum in der
// Farbe der Sonne, und bei hoher Bindung gluehende Fugen zwischen den Schuppen.

import { brennweite } from "./himmel.js";

// --- Wo steht die Sonne auf dem Schirm? -----------------------------------------
// Dieselbe Drehung wie im Shader (Spalten wie GLSL), nur umgekehrt angewandt.
function drehen(m, v) { return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]]; }
function mal(a, b) {
  const r = new Array(9);
  for (let c = 0; c < 3; c++) for (let z = 0; z < 3; z++) r[c * 3 + z] = a[z] * b[c * 3] + a[3 + z] * b[c * 3 + 1] + a[6 + z] * b[c * 3 + 2];
  return r;
}
const dY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
const dX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
const dZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };

/** Eine Richtung (Sonne, Hindernis) in Schirmkoordinaten (Pixel), oder null, wenn sie hinter einem liegt. */
export function aufSchirm(kamera, sonne, W, H) {
  const m = mal(mal(dY(kamera[0]), dX(kamera[1])), dZ(kamera[2]));
  const mt = [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];   // Transponierte = Umkehrung
  const v = drehen(mt, sonne);
  if (v[2] <= 0.05) return null;
  const b = brennweite(W, H) * H;
  return [W / 2 + v[0] / v[2] * b, H / 2 - v[1] / v[2] * b];
}

// --- Silhouette ---------------------------------------------------------------
// Alles wird zuerst in eine eigene Ebene gezeichnet. Daraus entsteht der
// Lichtsaum: die Form, zur Sonne hin verschoben, von sich selbst abgezogen -
// uebrig bleibt nur die beleuchtete Aussenkante.

let ebene = null, saumEbene = null;
function ebenen(W, H) {
  if (!ebene || ebene.width !== W || ebene.height !== H) {
    ebene = document.createElement("canvas"); ebene.width = W; ebene.height = H;
    saumEbene = document.createElement("canvas"); saumEbene.width = W; saumEbene.height = H;
  }
  return [ebene.getContext("2d"), saumEbene.getContext("2d")];
}

/** Punkt und Richtung auf einer kubischen Bezierkurve. */
function bez(p0, p1, p2, p3, u) {
  const v = 1 - u;
  const x = v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0];
  const y = v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1];
  const dx = 3 * v * v * (p1[0] - p0[0]) + 6 * v * u * (p2[0] - p1[0]) + 3 * u * u * (p3[0] - p2[0]);
  const dy = 3 * v * v * (p1[1] - p0[1]) + 6 * v * u * (p2[1] - p1[1]) + 3 * u * u * (p3[1] - p2[1]);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / l, ny: dx / l };
}

/** Zeichnet alle Teile des Drachen als eine Form in g (Farbe vorher setzen). */
function formZeichnen(g, W, H, f, t) {
  // Hochkant nach der Breite bemessen, sonst fuellt der Hals das ganze Bild
  const s = Math.min(H, W * 1.25) / 1000;
  const mitte = W / 2 + f.rolle * 50 * s;
  const kx = mitte + f.kopf * 90 * s, ky = H * 0.56 - f.neigung * 130 * s;
  const atem = Math.sin(t * 1.4) * 5 * s;

  // Fluegel: Schulter am Halsansatz, Handgelenk, Spitze weit ausserhalb des Bildes
  const schlag = Math.sin(f.schlag * 2.0);
  for (const seite of [-1, 1]) {
    // Flach und tief im Bild: der Himmel bleibt die Hauptsache
    const sx = mitte + seite * 110 * s, sy = H * 1.0;
    const hx = mitte + seite * W * 0.29, hy = H * (0.81 - schlag * 0.04);
    const tx = mitte + seite * W * 0.64, ty = H * (0.87 - schlag * 0.07);
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(mitte + seite * W * 0.13, H * (0.8 - schlag * 0.02), hx, hy);   // Knochenkante
    g.quadraticCurveTo(mitte + seite * W * 0.5, H * (0.78 - schlag * 0.06), tx, ty);
    // Gefranste Hinterkante: Bogen zwischen den Fingerknochen
    const zacken = 5;
    for (let i = 1; i <= zacken; i++) {
      const u = i / zacken;
      const ex = tx + (sx - tx) * u, ey = ty + (H * 1.06 - ty) * u;
      const mx = tx + (sx - tx) * (u - 0.5 / zacken), my = ty + (H * 1.06 - ty) * (u - 0.5 / zacken) - H * 0.022;
      g.quadraticCurveTo(mx, my, ex, ey);
    }
    g.closePath(); g.fill();
  }

  // Hals: entlang einer geschwungenen Mittellinie, Muskelbreite zum Kopf hin abnehmend
  const p0 = [mitte, H + 60 * s], p1 = [mitte - f.kopf * 40 * s, H * 0.86], p2 = [kx - f.kopf * 20 * s, ky + 200 * s + atem], p3 = [kx, ky + 30 * s];
  const links = [], rechts = [];
  for (let i = 0; i <= 28; i++) {
    const u = i / 28, q = bez(p0, p1, p2, p3, u);
    const b = (175 * Math.pow(1 - u, 1.25) + 30 + 10 * Math.sin(u * 9) * (1 - u)) * s;
    links.push([q.x + q.nx * b, q.y + q.ny * b]); rechts.push([q.x - q.nx * b, q.y - q.ny * b]);
  }
  g.beginPath();
  links.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = rechts.length - 1; i >= 0; i--) g.lineTo(rechts[i][0], rechts[i][1]);
  g.closePath(); g.fill();

  // Rueckenplatten: ragen nur dort ueber die Kontur, wo der Hals fern und flach ist
  for (let i = 0; i < 7; i++) {
    const u = 0.5 + i * 0.07, q = bez(p0, p1, p2, p3, u);
    const h = (26 - i * 2.5) * s, b = (9 - i * 0.7) * s;
    g.beginPath(); g.moveTo(q.x - b, q.y + 4 * s); g.lineTo(q.x + f.kopf * 4 * s, q.y - h); g.lineTo(q.x + b, q.y + 4 * s); g.fill();
  }

  // Schaedel von hinten-oben; die Schnauze zeigt vom Betrachter weg
  g.beginPath(); g.ellipse(kx, ky + 8 * s, 46 * s, 34 * s, 0, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(kx - 26 * s, ky);
  g.quadraticCurveTo(kx - 20 * s, ky - 52 * s, kx, ky - 64 * s);
  g.quadraticCurveTo(kx + 20 * s, ky - 52 * s, kx + 26 * s, ky);
  g.fill();
  // Hoerner: vom Hinterkopf nach hinten-aussen, Spitzen zur Reiterin hin
  for (const seite of [-1, 1]) {
    for (const [lang, dick, hoch] of [[1, 15, 0], [0.62, 9, 22]]) {
      const bx = kx + seite * 30 * s, by = ky + (4 + hoch) * s;
      g.beginPath();
      g.moveTo(bx, by - dick * s);
      // Nach hinten-unten geschwungen, die Spitze zur Reiterin
      g.bezierCurveTo(bx + seite * 50 * lang * s, by - 14 * lang * s, bx + seite * 96 * lang * s, by + 18 * lang * s,
                      bx + seite * 118 * lang * s, by + 84 * lang * s);
      g.bezierCurveTo(bx + seite * 82 * lang * s, by + 34 * lang * s, bx + seite * 46 * lang * s, by + 12 * s,
                      bx - seite * 6 * s, by + dick * s);
      g.fill();
    }
    // Nackenstacheln hinter den Hoernern
    g.beginPath();
    g.moveTo(kx + seite * 40 * s, ky + 26 * s); g.lineTo(kx + seite * 78 * s, ky + 50 * s); g.lineTo(kx + seite * 34 * s, ky + 40 * s); g.fill();
  }
  return { mitte, kx, ky, p: [p0, p1, p2, p3], s };
}

/**
 * Zeichnet den Drachen. f = Flugzustand,
 * licht = { sonne: [x,y]|null, farbe: [r,g,b] 0..1, himmel: [r,g,b] 0..1, waerme 0..1 }
 */
export function dracheZeichnen(g, W, H, f, licht, t) {
  const [e, se] = ebenen(W, H);
  const rgb = (c, a) => `rgba(${c.map((x) => Math.round(Math.min(1, x) * 255)).join(",")},${a})`;

  // 1. Form in die Ebene
  e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  e.save(); e.translate(W / 2, H); e.rotate(f.rolle * 0.3); e.translate(-W / 2, -H);
  e.fillStyle = "#000";
  const geo = formZeichnen(e, W, H, f, t);
  e.restore();

  // 2. Lichtsaum: Form farbig, davon die zur Sonne verschobene Form abziehen
  const s = geo.s;
  let dx = 0, dy = -1;
  if (licht.sonne) { const vx = licht.sonne[0] - geo.kx, vy = licht.sonne[1] - geo.ky; const l = Math.hypot(vx, vy) || 1; dx = vx / l; dy = vy / l; }
  const breite = (licht.waerme > 0.5 ? 4 : 3) * s;
  se.globalCompositeOperation = "source-over";
  se.clearRect(0, 0, W, H);
  se.drawImage(ebene, 0, 0);
  se.globalCompositeOperation = "source-in";
  const saumFarbe = licht.waerme > 0.45 ? rgb(licht.farbe, 0.9) : `rgba(165,200,255,${0.55 + 0.3 * (1 - licht.waerme)})`;
  se.fillStyle = saumFarbe; se.fillRect(0, 0, W, H);
  se.globalCompositeOperation = "destination-out";
  se.drawImage(ebene, -dx * breite, -dy * breite);

  // 3. Koerper: fast schwarz, mit einem Hauch Himmelslicht von oben
  e.globalCompositeOperation = "source-in";
  const koerper = e.createLinearGradient(0, H * 0.5, 0, H);
  koerper.addColorStop(0, rgb(licht.himmel.map((x) => x * 0.22), 1));
  koerper.addColorStop(1, "rgb(6,5,9)");
  e.fillStyle = koerper; e.fillRect(0, 0, W, H);
  e.globalCompositeOperation = "source-over";

  // 4. Glut: feine Adern entlang der Halsseiten, im Herzschlag - nur bei Naehe
  if (licht.waerme > 0.3) {
    const puls = 0.55 + 0.45 * Math.pow(Math.max(0, Math.sin(t * 2.3)), 5);
    e.save();
    e.globalCompositeOperation = "source-atop";
    e.translate(W / 2, H); e.rotate(f.rolle * 0.3); e.translate(-W / 2, -H);
    e.lineCap = "round";
    e.shadowColor = "rgba(255,110,30,1)"; e.shadowBlur = 16 * s * licht.waerme;
    e.strokeStyle = `rgba(255,${Math.round(120 + 70 * licht.waerme)},50,${(licht.waerme - 0.3) * 0.9 * puls})`;
    e.lineWidth = 2.2 * s;
    for (const seite of [-1, 1]) for (const lage of [0.55, 0.8]) {
      e.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = i / 20, q = bez(...geo.p, u);
        const b = (175 * Math.pow(1 - u, 1.25) + 30) * s * lage;
        const zitter = Math.sin(u * 37 + seite * 3 + lage * 11) * 4 * s;
        const x = q.x + seite * q.nx * b + zitter, y = q.y + seite * q.ny * b;
        i ? e.lineTo(x, y) : e.moveTo(x, y);
      }
      e.stroke();
    }
    e.restore();
  }

  g.drawImage(ebene, 0, 0);
  g.drawImage(saumEbene, 0, 0);
}

// --- Glut und Asche -------------------------------------------------------------
// Teilchen im Raum vor der Kamera; sie fliegen einem entgegen und ziehen beim
// Wenden zur Seite. Bei Naehe Glut, bei Distanz kalte Ascheflocken.

export function teilchenErstellen(n = 180) {
  const t = [];
  for (let i = 0; i < n; i++) t.push(neuesTeilchen({}, true));
  return t;
}
function neuesTeilchen(p, verteilt) {
  p.x = (Math.random() - 0.5) * 6; p.y = (Math.random() - 0.3) * 3.5;
  p.z = verteilt ? Math.random() * 8 + 0.5 : 8 + Math.random() * 2;
  p.flacker = Math.random() * 6.28; p.groesse = 0.5 + Math.random();
  return p;
}

let funke = null;
function funkenbild(farbe) {
  // Ein weicher Lichtpunkt, einmal vorbereitet und dann nur noch kopiert
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), v = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  v.addColorStop(0, farbe); v.addColorStop(0.35, farbe.replace(/[\d.]+\)$/, "0.5)")); v.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = v; g.fillRect(0, 0, 32, 32);
  return c;
}

export function teilchenZeichnen(g, W, H, teilchen, f, dt, waerme, drehrate) {
  if (!funke) funke = { glut: funkenbild("rgba(255,170,70,1)"), asche: funkenbild("rgba(200,215,240,1)") };
  const aktiv = Math.round(teilchen.length * (0.25 + 0.75 * waerme));
  const s = H;
  g.save();
  g.globalCompositeOperation = waerme > 0.4 ? "lighter" : "source-over";
  for (let i = 0; i < teilchen.length; i++) {
    const p = teilchen[i];
    p.z -= f.tempo * dt * (waerme > 0.4 ? 2.4 : 1.6);
    p.x -= drehrate * p.z * dt * 0.9;               // beim Wenden ziehen sie zur Seite
    p.y += (waerme > 0.4 ? -0.15 : 0.1) * dt;        // Glut steigt, Asche sinkt
    if (p.z < 0.3 || Math.abs(p.x) > 6) neuesTeilchen(p, false);
    if (i >= aktiv) continue;
    const sx = W / 2 + p.x / p.z * 1.35 * s * 0.5, sy = H / 2 - p.y / p.z * 1.35 * s * 0.5;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    const r = p.groesse * 10 / p.z * (s / 1000) * (waerme > 0.4 ? 1 : 0.7);
    const a = Math.min(1, (8 - p.z) / 3) * (0.55 + 0.45 * Math.sin(f.zeit * 9 + p.flacker));
    g.globalAlpha = Math.max(0, a) * (waerme > 0.4 ? 0.9 : 0.5);
    g.drawImage(waerme > 0.4 ? funke.glut : funke.asche, sx - r * 2, sy - r * 2, r * 4, r * 4);
  }
  g.restore();
}

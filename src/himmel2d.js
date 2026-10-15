// Der Himmel ohne WebGL: eine ruhige 2D-Fassung mit derselben Schnittstelle
// wie himmel.js. Verlauf statt Streuung, gemalte Wolkenballen statt
// abgetastetem Volumen - aber dieselben Farben, dieselbe Sonne, dieselbe
// Kamera. Das Spiel darueber merkt keinen Unterschied.

import { brennweite } from "./himmel.js";
import { aufSchirm } from "./drache.js";

const srgb = (c) => c.map((x) => Math.round(Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2) * 255));
const rgba = (c, a = 1) => `rgba(${srgb(c).join(",")},${a})`;
const misch = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const zufall = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const richtung = (gier, nick) => [Math.sin(gier) * Math.cos(nick), Math.sin(nick), Math.cos(gier) * Math.cos(nick)];

const STERNE = Array.from({ length: 160 }, (_, i) => ({ gier: zufall(i) * 6.283, nick: 0.03 + Math.pow(zufall(i + 99), 0.7) * 1.2, hell: 0.3 + zufall(i + 7) * 0.7 }));
const BAENKE = Array.from({ length: 14 }, (_, i) => ({ gier: i / 14 * 6.283 + zufall(i) * 0.3, nick: 0.04 + zufall(i + 3) * 0.2, breit: 0.25 + zufall(i + 5) * 0.4 }));

export function himmel2dErstellen(canvas) {
  const g = canvas.getContext("2d");
  if (!g) return null;
  let ballen = null, ballenSchluessel = "";

  // Ein Wolkenballen, oben hell, unten im Schatten - einmal je Stimmung gemalt
  function ballenBild(st) {
    const schluessel = srgb(st.wolkeHell).join() + srgb(st.wolkeDunkel).join();
    if (ballen && schluessel === ballenSchluessel) return ballen;
    ballen = document.createElement("canvas"); ballen.width = ballen.height = 64;
    const b = ballen.getContext("2d");
    const licht = b.createLinearGradient(0, 8, 0, 60);
    licht.addColorStop(0, rgba(st.wolkeHell)); licht.addColorStop(1, rgba(misch(st.wolkeDunkel, st.wolkeHell, 0.25)));
    b.fillStyle = licht;
    b.beginPath(); b.ellipse(32, 36, 30, 22, 0, 0, Math.PI * 2); b.fill();
    b.globalCompositeOperation = "destination-in";
    const rand = b.createRadialGradient(32, 36, 8, 32, 36, 31);
    rand.addColorStop(0, "rgba(0,0,0,1)"); rand.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = rand; b.fillRect(0, 0, 64, 64);
    ballenSchluessel = schluessel;
    return ballen;
  }

  return {
    zeichnen(st, zeit, pos, hoehe, kam, q) {
      const W = canvas.width, H = canvas.height, f = brennweite(W, H) * H;
      // Horizont als Linie: zwei Punkte geradeaus, links und rechts
      const a = aufSchirm(kam, richtung(kam[0] - 0.3, 0), W, H) || [0, H / 2], b = aufSchirm(kam, richtung(kam[0] + 0.3, 0), W, H) || [W, H / 2];
      const hx = (a[0] + b[0]) / 2, hy = (a[1] + b[1]) / 2, winkel = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const tag = Math.max(0.15, Math.min(1, st.sonne[1] * 4 + 0.3)) * (st.sterne ? 0.35 : 1);

      g.save();
      g.translate(hx, hy); g.rotate(winkel);
      const R = Math.hypot(W, H);
      // Himmel: vom Horizont zum Zenit
      const himmel = g.createLinearGradient(0, 0, 0, -H * 1.3);
      const saum = misch(st.horizont, st.dunst, 0.5);
      himmel.addColorStop(0, rgba(saum)); himmel.addColorStop(0.08, rgba(st.horizont)); himmel.addColorStop(0.35, rgba(misch(st.horizont, st.zenit, 0.7)));
      himmel.addColorStop(1, rgba(st.zenit));
      g.fillStyle = himmel; g.fillRect(-R, -R * 2, R * 2, R * 2 + 3);   // leicht ueberlappend: keine Naht
      // Wolkenmeer: Dunst am Horizont, nach vorn heller und koerniger
      const meer = g.createLinearGradient(0, 0, 0, H);
      meer.addColorStop(0, rgba(saum)); meer.addColorStop(0.12, rgba(st.dunst)); meer.addColorStop(0.5, rgba(misch(st.dunst, st.wolkeHell, 0.45)));
      meer.addColorStop(1, rgba(misch(st.wolkeDunkel, st.wolkeHell, 0.5)));
      g.fillStyle = meer; g.fillRect(-R, 0, R * 2, R * 2);
      g.restore();

      // Sterne
      if (st.sterne) {
        g.fillStyle = "#fff";
        for (const s of STERNE) {
          const p = aufSchirm(kam, richtung(s.gier, s.nick), W, H);
          if (!p) continue;
          g.globalAlpha = s.hell * st.sterne * (0.7 + 0.3 * Math.sin(zeit * 2 + s.gier * 9));
          g.fillRect(p[0], p[1], 1.5, 1.5);
        }
        g.globalAlpha = 1;
      }

      // Sonne oder Mond mit Hof; bei Waerme ein breiterer, gluehender Schein
      const sp = aufSchirm(kam, st.sonne, W, H);
      if (sp) {
        const hof = g.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], H * (0.35 + 0.35 * st.waerme));
        hof.addColorStop(0, rgba(st.sonnenFarbe, 0.55 * tag + 0.1)); hof.addColorStop(1, rgba(st.sonnenFarbe, 0));
        g.fillStyle = hof; g.fillRect(0, 0, W, H);
        g.fillStyle = rgba(misch(st.sonnenFarbe, [1, 1, 1], 0.5), 0.9);
        g.beginPath(); g.arc(sp[0], sp[1], f * 0.012, 0, Math.PI * 2); g.fill();
      }

      // Gewitterwand: dunkle Tuerme in Richtung der Sonne
      if (st.wand) {
        const sgier = Math.atan2(st.sonne[0], st.sonne[2]);
        g.fillStyle = rgba(misch(st.wolkeDunkel, st.dunst, 0.2), 0.85 * st.wand);
        for (let i = 0; i < 9; i++) {
          const p = aufSchirm(kam, richtung(sgier - 1 + i * 0.25, 0.06 + zufall(i) * 0.08), W, H);
          if (p) { g.beginPath(); g.ellipse(p[0], p[1], f * (0.18 + zufall(i + 2) * 0.12), f * (0.1 + zufall(i + 4) * 0.08), winkel, 0, Math.PI * 2); g.fill(); }
        }
      }

      // Wolkenbaenke ueber dem Horizont, die langsam ziehen
      for (const w of BAENKE) {
        const gier = w.gier + zeit * 0.004;
        for (let j = 0; j < 7; j++) {
          const p = aufSchirm(kam, richtung(gier + (j - 3) * w.breit * 0.16, w.nick + Math.sin(j * 2.1 + w.gier) * 0.012), W, H);
          if (!p) continue;
          const r = f * w.breit * (0.08 + zufall(j + w.gier * 10) * 0.1);
          const c = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
          c.addColorStop(0, rgba(misch(st.wolkeHell, st.dunst, 0.35), 0.5 * st.bedeckung)); c.addColorStop(1, rgba(st.wolkeHell, 0));
          g.fillStyle = c;
          g.beginPath(); g.ellipse(p[0], p[1], r, r * (0.25 + zufall(j * 3 + w.gier) * 0.2), winkel, 0, Math.PI * 2); g.fill();
        }
      }

      // Wolkenballen auf dem Meer, von fern nach nah, im Flug vorbeiziehend
      const bild = ballenBild(st);
      const raster = q.voll ? 0.9 : 1.4, weit = 11, augHoehe = 1 + hoehe;
      const cs = Math.cos(kam[0]), sn = Math.sin(kam[0]);
      const liste = [];
      const gx0 = Math.floor((pos[0] - weit) / raster), gz0 = Math.floor((pos[1] - weit) / raster);
      for (let i = 0; i <= 2 * weit / raster; i++) for (let j = 0; j <= 2 * weit / raster; j++) {
        const cx = gx0 + i, cz = gz0 + j;
        const wx = (cx + zufall(cx * 31 + cz * 17) * 0.8) * raster, wz = (cz + zufall(cx * 13 - cz * 7) * 0.8) * raster;
        const dx = wx - pos[0], dz = wz - pos[1];
        const tiefe = dx * sn + dz * cs, seite = dx * cs - dz * sn;
        if (tiefe < 0.4 || tiefe > weit) continue;
        liste.push([tiefe, seite, zufall(cx * 7 + cz * 3)]);
      }
      liste.sort((x, y) => y[0] - x[0]);
      g.save();
      g.translate(hx, hy); g.rotate(winkel);
      for (const [tiefe, seite, z] of liste) {
        const x = seite / tiefe * f, y = augHoehe / tiefe * f * 0.55;
        const r = (0.55 + z * 0.5) / tiefe * f * raster;
        if (Math.abs(x) > R || y > R) continue;
        g.globalAlpha = Math.min(1, (weit - tiefe) / (weit * 0.6)) * (0.55 + 0.45 * st.bedeckung);
        g.drawImage(bild, x - r, y - r * 0.8, r * 2, r * 1.5);
      }
      g.restore();
      g.globalAlpha = 1;

      // Stimmung: kalt legt sich ein blauer Hauch darueber, warm ein Gluehen am Horizont
      const glut = g.createLinearGradient(0, hy - H * 0.3, 0, hy + H * 0.1);
      glut.addColorStop(0, "rgba(255,120,40,0)"); glut.addColorStop(0.75, `rgba(255,130,50,${0.22 * st.waerme * tag})`); glut.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = glut; g.fillRect(0, 0, W, H);
      if (st.waerme < 0.5) { g.fillStyle = `rgba(120,150,210,${0.1 * (1 - st.waerme * 2)})`; g.fillRect(0, 0, W, H); }
      // Vignette
      const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
  };
}

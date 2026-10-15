// Tageszeiten und Wetter als Daten, dazu die Mischung mit der Waerme.
// Farben in sRGB-Hex; der Shader rechnet linear, deshalb die Umrechnung.

const lin = (hex) => [1, 3, 5].map((i) => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
const richtung = (azimut, hoehe) => {
  const a = azimut * Math.PI / 180, h = hoehe * Math.PI / 180;
  return [Math.sin(a) * Math.cos(h), Math.sin(h), Math.cos(a) * Math.cos(h)];
};

export const TAGESZEITEN = [
  { name: "Morgengrauen über den Klippen", azimut: -35, hoehe: 4, bedeckung: 0.42,
    zenit: "#1f2d5a", horizont: "#e89a6e", sonnenFarbe: "#ffc68a", wolkeHell: "#ffd2b0", wolkeDunkel: "#3c3f66", dunst: "#9d8090" },
  { name: "Mittag über dem Wolkenmeer", azimut: 25, hoehe: 48, bedeckung: 0.5,
    zenit: "#1f5bb8", horizont: "#a9c8ea", sonnenFarbe: "#fff0d0", wolkeHell: "#ffffff", wolkeDunkel: "#5f7aa3", dunst: "#9fb6d4" },
  { name: "Gewitterfront am Abend", azimut: 60, hoehe: 6, bedeckung: 0.72, wand: 1,
    zenit: "#151a26", horizont: "#c27a4c", sonnenFarbe: "#ff8a40", wolkeHell: "#8e93a3", wolkeDunkel: "#171a23", dunst: "#2c303b" },
  { name: "Mondnacht hinter der Linie", azimut: -20, hoehe: 22, bedeckung: 0.45, sterne: 1,
    zenit: "#02040c", horizont: "#121c34", sonnenFarbe: "#c8d6ff", wolkeHell: "#9fb3d8", wolkeDunkel: "#070c18", dunst: "#0e1528" },
  { name: "Morgenrot vor der Schlacht", azimut: 10, hoehe: 3, bedeckung: 0.55,
    zenit: "#2a1e3e", horizont: "#ff6e30", sonnenFarbe: "#ffa860", wolkeHell: "#ffb88c", wolkeDunkel: "#3a2232", dunst: "#7a4a4a" }
];

/** Stimmung fuer den Shader: Tageszeit plus Waerme (0 kalt .. 1 warm). */
export function stimmung(index, waerme) {
  const z = TAGESZEITEN[index];
  // Kaelte macht den Himmel klarer: etwas weniger Wolken, mehr Blau im Dunst
  const kalt = 1 - waerme;
  const misch = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  return {
    sonne: richtung(z.azimut, z.hoehe),
    zenit: lin(z.zenit), horizont: misch(lin(z.horizont), lin("#9ab4d8"), kalt * 0.15),
    sonnenFarbe: lin(z.sonnenFarbe), wolkeHell: lin(z.wolkeHell), wolkeDunkel: lin(z.wolkeDunkel),
    dunst: misch(lin(z.dunst), lin("#7f97bf"), kalt * 0.2),
    bedeckung: z.bedeckung * (0.85 + 0.15 * waerme), sterne: z.sterne || 0, wand: z.wand || 0, waerme
  };
}

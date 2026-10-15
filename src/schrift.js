// Text im Canvas: Zeilen waehrend des Flugs, Momente mit zwei Moeglichkeiten,
// Titelkarten. Ruhig gesetzt, eine Schrift, kein Rahmen, kein Kasten.

const SCHRIFT = '"Cormorant Garamond", Georgia, serif';
const ORDNUNG = ["Erster Einsatz", "Zweiter Einsatz", "Dritter Einsatz", "Vierter Einsatz", "Letzter Einsatz"];

/** Schriftgroesse, die quer und hochkant lesbar bleibt. */
const groesse = (W, H, f = 1) => Math.round(Math.min(H * 0.034, W * 0.052) * f);

function umbrechen(g, text, breite) {
  const zeilen = [];
  let zeile = "";
  for (const wort of text.split(" ")) {
    const probe = zeile ? zeile + " " + wort : wort;
    if (g.measureText(probe).width > breite && zeile) { zeilen.push(zeile); zeile = wort; } else zeile = probe;
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

function absatz(g, text, x, y, breite, hoehe, farbe, a) {
  const zeilen = umbrechen(g, text, breite);
  g.fillStyle = farbe.replace("A", a);
  // Zweimal mit weichem Schatten: lesbar auch vor hellem Mittagshimmel
  g.shadowColor = `rgba(10,8,14,${0.8 * a})`; g.shadowBlur = hoehe * 0.6;
  zeilen.forEach((z, i) => g.fillText(z, x, y + i * hoehe));
  zeilen.forEach((z, i) => g.fillText(z, x, y + i * hoehe));
  g.shadowBlur = 0;
  return zeilen.length * hoehe;
}

const blende = (alter, dauer) => Math.max(0, Math.min(1, alter / 0.8, (dauer - alter) / 1.2));

/** Eine Zeile waehrend des Flugs. Ilvars Stimme kursiv und warm, Funk mit Absender. */
export function zeileZeichnen(g, W, H, zeile, uhr) {
  if (!zeile) return;
  const dauer = 3.2 + zeile.text.length * 0.055;
  const a = blende(uhr - zeile.seit, dauer);
  if (a <= 0) return;
  const fs = groesse(W, H, zeile.wer === "hinweis" ? 0.8 : 1);
  const stil = {
    ilvar: [`italic 500 ${fs}px ${SCHRIFT}`, "rgba(255,214,170,A)"],
    hinweis: [`600 ${fs}px ${SCHRIFT}`, "rgba(235,235,240,A)"],
    folge: [`italic 500 ${fs}px ${SCHRIFT}`, "rgba(250,244,232,A)"]
  }[zeile.wer] || [`500 ${fs}px ${SCHRIFT}`, "rgba(250,244,232,A)"];
  g.save();
  const band = g.createLinearGradient(0, 0, 0, H * 0.3);
  band.addColorStop(0, `rgba(6,6,12,${0.3 * a})`); band.addColorStop(1, "rgba(6,6,12,0)");
  g.fillStyle = band; g.fillRect(0, 0, W, H * 0.3);
  g.font = stil[0]; g.textAlign = "center"; g.textBaseline = "alphabetic";
  const text = zeile.wer === "vey" ? `Hauptfrau Vey: »${zeile.text}«` : zeile.text;
  absatz(g, text, W / 2, H * 0.13, Math.min(W * 0.8, fs * 26), fs * 1.3, stil[1], zeile.wer === "hinweis" ? a * 0.8 : a);
  g.restore();
}

/**
 * Ein Moment: die Lage oben, die zwei Moeglichkeiten links und rechts.
 * Links liegt immer die Distanz, rechts die Naehe.
 */
export function momentZeichnen(g, W, H, moment, seit) {
  const a = Math.min(1, seit / 1.0), b = Math.max(0, Math.min(1, (seit - 0.4) / 0.5));
  // Das Bild tritt etwas zurueck, ohne zu verschwinden
  g.save();
  const schleier = g.createLinearGradient(0, 0, 0, H);
  schleier.addColorStop(0, `rgba(4,5,10,${0.5 * a})`); schleier.addColorStop(0.55, `rgba(4,5,10,${0.15 * a})`); schleier.addColorStop(1, `rgba(4,5,10,${0.35 * a})`);
  g.fillStyle = schleier; g.fillRect(0, 0, W, H);
  const fs = groesse(W, H, 1.08);
  g.font = `italic 500 ${fs}px ${SCHRIFT}`; g.textAlign = "center";
  absatz(g, moment.lage, W / 2, H * 0.16, Math.min(W * 0.84, fs * 24), fs * 1.32, "rgba(252,247,238,A)", a);

  if (b > 0) {
    const fw = groesse(W, H, 1), breite = Math.min(W * 0.38, fw * 13), y = H * 0.44;
    g.font = `600 ${fw}px ${SCHRIFT}`;
    g.textAlign = "left";
    absatz(g, "←\u00a0\u00a0" + moment.distanz.wahl, W * 0.06, y, breite, fw * 1.3, "rgba(200,215,240,A)", b);
    g.textAlign = "right";
    absatz(g, moment.naehe.wahl + "\u00a0\u00a0→", W * 0.94, y, breite, fw * 1.3, "rgba(255,212,165,A)", b);
  }
  g.restore();
}

/** Titel am Anfang eines Einsatzes. */
export function titelZeichnen(g, W, H, e) {
  const a = blende(e.uhr, 7);
  if (a <= 0) return;
  g.save();
  g.textAlign = "center";
  const fs = groesse(W, H);
  g.font = `600 ${Math.round(fs * 0.7)}px ${SCHRIFT}`;
  g.fillStyle = `rgba(240,232,220,${a * 0.75})`;
  g.fillText(ORDNUNG[e.nr].toUpperCase().split("").join(" "), W / 2, H * 0.36);
  g.font = `500 ${Math.round(fs * 1.9)}px ${SCHRIFT}`;
  g.shadowColor = `rgba(0,0,0,${0.5 * a})`; g.shadowBlur = fs;
  g.fillStyle = `rgba(255,250,242,${a})`;
  g.fillText(e.d.titel, W / 2, H * 0.36 + fs * 2.1);
  g.font = `italic 500 ${fs}px ${SCHRIFT}`;
  absatz(g, e.d.auftrag, W / 2, H * 0.36 + fs * 3.6, Math.min(W * 0.8, fs * 26), fs * 1.3, "rgba(245,238,226,A)", a * 0.9);
  g.restore();
  return true;
}

/**
 * Eine Textseite fuer Titel, Zwischenszenen und Ausgaenge: Kopf, Absaetze, die
 * nacheinander erscheinen, darunter ggf. zwei Moeglichkeiten.
 * s = { kopf, gross, absaetze: [{ text, stil, t }], wahl: { links, rechts, t } | null,
 *       fuss, jetzt, schleier 0..1, seit }
 */
export function seiteZeichnen(g, W, H, s) {
  const a = Math.min(1, s.seit / 1.2);
  g.save();
  g.fillStyle = `rgba(5,6,12,${s.schleier * a})`; g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  const fs = groesse(W, H), breite = Math.min(W * 0.84, fs * 27), zh = fs * 1.36;
  let y = H * (s.gross ? 0.2 : 0.16);
  if (s.kopf) {
    if (s.gross) {
      g.font = `500 ${Math.round(fs * 2.3)}px ${SCHRIFT}`;
      absatz(g, s.kopf, W / 2, y, W * 0.9, fs * 2.4, "rgba(255,250,242,A)", a);
      y += fs * 2.4;
    } else {
      g.font = `600 ${Math.round(fs * 0.72)}px ${SCHRIFT}`;
      absatz(g, s.kopf.toUpperCase().split("").join(" "), W / 2, y, W * 0.9, fs, "rgba(236,226,212,A)", a * 0.8);
      y += fs * 1.6;
    }
  }
  // Was nicht mehr passt, faellt oben heraus - die neuesten Absaetze bleiben
  const stilFont = (stil) => (stil === "folge" || stil === "gefahr" || stil === "lage" ? `italic 500 ${fs}px ${SCHRIFT}` : `500 ${fs}px ${SCHRIFT}`);
  const hoehen = s.absaetze.map((p) => { g.font = stilFont(p.stil); return umbrechen(g, p.text, breite).length * zh + fs * 0.7; });
  const platz = H * (s.wahl ? 0.7 : 0.82) - y;
  let von = 0, summe = hoehen.reduce((x, h) => x + h, 0);
  while (summe > platz && von < hoehen.length - 1) summe -= hoehen[von++];
  for (let i = von; i < s.absaetze.length; i++) {
    const p = s.absaetze[i];
    const b = Math.min(1, (s.jetzt - p.t) / 0.9) * a;
    const farbe = { folge: "rgba(250,238,220,A)", gefahr: "rgba(255,200,180,A)", lage: "rgba(255,228,196,A)" }[p.stil] || "rgba(250,246,238,A)";
    g.font = stilFont(p.stil);
    absatz(g, p.text, W / 2, y, breite, zh, farbe, Math.max(0, b));
    y += hoehen[i];
  }
  if (s.wahl) {
    const b = Math.max(0, Math.min(1, (s.jetzt - s.wahl.t - 0.3) / 0.5));
    const fw = groesse(W, H, 1), bw = Math.min(W * 0.4, fw * 13), wy = H * 0.8;
    g.font = `600 ${fw}px ${SCHRIFT}`;
    g.textAlign = "left";
    absatz(g, "←\u00a0\u00a0" + s.wahl.links, W * 0.06, wy, bw, fw * 1.3, "rgba(200,215,240,A)", b);
    g.textAlign = "right";
    absatz(g, s.wahl.rechts + "\u00a0\u00a0→", W * 0.94, wy, bw, fw * 1.3, "rgba(255,212,165,A)", b);
  } else if (s.fuss) {
    const b = Math.max(0, Math.min(1, (s.jetzt - (s.absaetze.at(-1)?.t ?? 0) - 1.5) / 1)) * 0.6;
    g.font = `italic 500 ${Math.round(fs * 0.75)}px ${SCHRIFT}`;
    g.textAlign = "center";
    absatz(g, s.fuss, W / 2, H * 0.93, W * 0.9, fs, "rgba(232,226,216,A)", b);
  }
  g.restore();
}

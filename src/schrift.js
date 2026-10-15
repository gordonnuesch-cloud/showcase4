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
  const a = Math.min(1, seit / 1.2), b = Math.max(0, Math.min(1, (seit - 1.4) / 0.8));
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
    absatz(g, "←  " + moment.distanz.wahl, W * 0.06, y, breite, fw * 1.3, "rgba(200,215,240,A)", b);
    g.textAlign = "right";
    absatz(g, moment.naehe.wahl + "  →", W * 0.94, y, breite, fw * 1.3, "rgba(255,212,165,A)", b);
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

/** Eine ruhige Karte mit Text in der Mitte, etwa zwischen zwei Einsaetzen. */
export function karteZeichnen(g, W, H, zeilen, a) {
  g.save();
  g.fillStyle = `rgba(4,5,10,${0.62 * a})`; g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  const fs = groesse(W, H);
  let y = H * 0.4;
  for (const [text, stil] of zeilen) {
    g.font = stil === "gross" ? `500 ${Math.round(fs * 1.6)}px ${SCHRIFT}` : stil === "leise" ? `italic 500 ${Math.round(fs * 0.8)}px ${SCHRIFT}` : `500 ${fs}px ${SCHRIFT}`;
    y += absatz(g, text, W / 2, y, Math.min(W * 0.8, fs * 26), fs * (stil === "gross" ? 2 : 1.35), stil === "leise" ? "rgba(230,224,214,A)" : "rgba(252,247,238,A)", stil === "leise" ? a * 0.7 : a) + fs * 0.6;
  }
  g.restore();
}

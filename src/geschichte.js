// Zwischenszenen und Ausgaenge, ohne Grafik. Wie einsatz.js: reine Funktionen,
// damit tools/balance.mjs genau das spielt, was das Spiel spielt.
//
// Zahlen, die der Spieler nie sieht:
//   zwischen zwei Einsaetzen      Verdacht -5 (man vergisst); Bindung ueber 20: -3,
//                                 darunter 60 % des Wegs zurueck zu 20 (Pflichtfluege)
//   Inspektion                    Verdacht +3 je Narbe, hoechstens +12
//   Entdeckungsgefahr             (Verdacht - 25) / 55, hoechstens 90 %
//   entdeckt werden               Verdacht +10, dann einer der Auswege:
//   Tamsin deckt dich             Verdacht -15, in der naechsten Szene +10
//   Distanz zeigen                Bindung -15, Verdacht -10
//   Verdacht ab 45                die Szene zeigt einen zusaetzlichen, wachsamen Absatz
//   Verdacht ab 85                Verhaftung

import { SZENEN } from "./data/szenen.js";
import { wahlWirkung } from "./einsatz.js";

export const REGELN = {
  vergessen: -5, pflicht: -3, narbe: 3, narbenHoechstens: 12,
  deckt: { verdacht: -15, schuld: 10 }, distanz: { bindung: -15, verdacht: -10 },
  verhaftung: 85, entdeckt: 10, wachsam: 45, sturz: 5, dienst: 30
};

const begrenzt = (x) => Math.max(0, Math.min(100, x));
export const gefahr = (verdacht) => Math.max(0, Math.min(0.9, (verdacht - 25) / 55));

/**
 * Beginnt die Zwischenszene nach Einsatz nr (0..3). Die Szene ist eine kleine
 * Zustandsmaschine; zeilen waechst, waehrend der Spieler weiterblaettert.
 */
export function szeneBeginnen(nr, spiel) {
  const d = SZENEN[nr];
  spiel.verdacht = begrenzt(spiel.verdacht + REGELN.vergessen + (spiel.schuld || 0));
  // Pflichtfluege: ueber dem Dienstniveau zehren sie, darunter halten sie ein Mindestmass
  spiel.bindung = begrenzt(spiel.bindung < REGELN.dienst
    ? spiel.bindung + (REGELN.dienst - spiel.bindung) * 0.6
    : Math.max(REGELN.dienst, spiel.bindung + REGELN.pflicht));
  spiel.schuld = 0;
  const absaetze = [...d.absaetze];
  if (nr === 1) {
    // Bei der Inspektion zaehlen die Narben: wer schlecht fliegt, faellt auf
    const narben = spiel.narben.reduce((a, b) => a + (b || 0), 0);
    if (narben) { absaetze.push(d.narben); spiel.verdacht = begrenzt(spiel.verdacht + Math.min(REGELN.narbenHoechstens, narben * REGELN.narbe)); }
  }
  // Hoher Verdacht: die Welt sieht genauer hin, bevor etwas passiert
  if (spiel.verdacht >= REGELN.wachsam && d.wachsam) absaetze.splice(1, 0, d.wachsam);
  return { nr, d, vorrat: absaetze, zeilen: [], wahl: null, stufe: "lesen", fertig: false };
}

/**
 * Ein Schritt weiter: naechster Absatz, dann ggf. die Tuer, dann die Probe.
 * zufall() liefert 0..1. Gibt nichts zurueck; der Zustand steht in sz.
 */
export function szeneWeiter(sz, spiel, zufall = Math.random) {
  if (sz.wahl || sz.fertig) return;
  if (sz.vorrat.length) { sz.zeilen.push({ text: sz.vorrat.shift() }); return; }
  if (sz.stufe === "lesen" && sz.d.tuer) {
    sz.stufe = "tuer";
    sz.zeilen.push({ text: sz.d.tuer.lage, stil: "lage" });
    sz.wahl = { art: "tuer", links: sz.d.tuer.distanz.wahl, rechts: sz.d.tuer.naehe.wahl };
    return;
  }
  if (sz.stufe === "lesen" || sz.stufe === "tuer") {
    sz.stufe = "probe";
    if (zufall() < gefahr(spiel.verdacht)) {
      const e = sz.d.entdeckt;
      spiel.verdacht = begrenzt(spiel.verdacht + REGELN.entdeckt);
      sz.zeilen.push({ text: e.text, stil: "gefahr" });
      sz.wahl = { art: "entdeckt", links: e.distanz.wahl, rechts: e.deckt.wahl };
    } else sz.zeilen.push({ text: sz.d.ruhig });
    return;
  }
  sz.fertig = true;
}

/** Entscheidung in einer Szene. seite: "links" | "rechts". */
export function szeneWaehlen(sz, spiel, seite) {
  const w = sz.wahl;
  if (!w) return;
  if (w.art === "tuer") {
    const naehe = seite === "rechts", t = sz.d.tuer;
    const w = wahlWirkung(naehe ? "naehe" : "distanz", t.zeugen, spiel.zufall);
    spiel.bindung = begrenzt(spiel.bindung + w.bindung);
    spiel.verdacht = begrenzt(spiel.verdacht + w.verdacht);
    spiel.wahlen.push({ szene: sz.nr, seite: naehe ? "naehe" : "distanz" });
    sz.zeilen.push({ text: t[naehe ? "naehe" : "distanz"].folge, stil: "folge" });
    if (w.verdacht > 0 && sz.d.bemerkt) sz.zeilen.push({ text: sz.d.bemerkt, stil: "gefahr" });
    sz.bemerkt = w.verdacht > 0;
  } else {
    const deckt = seite === "rechts", e = sz.d.entdeckt;
    if (deckt) { spiel.verdacht = begrenzt(spiel.verdacht + REGELN.deckt.verdacht); spiel.schuld = REGELN.deckt.schuld; }
    else { spiel.bindung = begrenzt(spiel.bindung + REGELN.distanz.bindung); spiel.verdacht = begrenzt(spiel.verdacht + REGELN.distanz.verdacht); }
    spiel.wahlen.push({ szene: sz.nr, seite: deckt ? "deckt" : "distanz" });
    sz.zeilen.push({ text: e[deckt ? "deckt" : "distanz"].folge, stil: "folge" });
  }
  sz.wahl = null;
}

/** Ist es vorbei, bevor der naechste Einsatz beginnt? */
export const verhaftet = (spiel) => spiel.verdacht >= REGELN.verhaftung;

/** Welcher Ausgang nach dem letzten Einsatz (oder nach einer Verhaftung). */
export function ausgang(spiel) {
  // Tamsins letzte Gefaelligkeit wird nach der Schlacht faellig
  const verdacht = spiel.verdacht + (spiel.schuld || 0);
  if (verdacht >= REGELN.verhaftung) return "tribunal";
  if ((spiel.narben[4] || 0) >= REGELN.sturz) return "sturz";
  if (spiel.bindung >= 60) return verdacht >= 60 ? "grenze" : "geheimnis";
  return verdacht >= 60 ? "tribunal" : "pflicht";
}

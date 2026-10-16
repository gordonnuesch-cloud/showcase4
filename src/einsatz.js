// Ablauf eines Einsatzes, ohne Grafik: Zeilen, Hindernisse, Momente.
// Reine Funktionen auf einfachen Objekten, damit tools/ denselben Code
// durchspielen kann wie das Spiel.

import { EINSAETZE, HINDERNISSE } from "./data/einsaetze.js";
import { fliegen } from "./flug.js";

/**
 * Was eine Entscheidung kostet. Naehe kostet Verdacht nur, wenn sie bemerkt
 * wird - wie wahrscheinlich, haengt davon ab, wer zusieht. Allein am Himmel
 * merkt es selten jemand, in Formation oft, im Lager fast immer.
 */
export const WIRKUNG = {
  naehe: { bindung: 14, verdacht: { allein: 8, formation: 12, lager: 15 }, bemerkt: { allein: 0.35, formation: 0.75, lager: 0.9 } },
  distanz: { bindung: -4, verdacht: -3 }
};

/** Wirkung einer Wahl auf Bindung und Verdacht. zufall() liefert 0..1. */
export function wahlWirkung(seite, zeugen, zufall = Math.random) {
  if (seite !== "naehe") return { ...WIRKUNG.distanz };
  const n = WIRKUNG.naehe;
  return { bindung: n.bindung, verdacht: zufall() < n.bemerkt[zeugen] ? n.verdacht[zeugen] : 0 };
}

const begrenzt = (x) => Math.max(0, Math.min(100, x));
/** Winkelunterschied auf -PI..PI gefaltet. */
export const winkel = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function neuesSpiel() {
  return { bindung: 30, verdacht: 5, narben: [], wahlen: [] };
}

export function einsatzBeginnen(nr) {
  const d = EINSAETZE[nr];
  return {
    nr, d, uhr: 0,
    offen: d.ablauf.map((x, i) => ({ ...x, i })),
    hindernisse: [], zeile: null, moment: null, momentSeit: 0,
    treffer: 0, ende: false, ereignisse: []
  };
}

/**
 * Ein Zeitschritt. Gibt Ereignisse zurueck ("treffer", "knapp", "frei",
 * "moment", "zeile", "auftauchen"), die Grafik und Ton aufgreifen koennen.
 */
export function einsatzSchritt(e, dt, flug) {
  const ereignisse = [];
  if (e.moment) { e.momentSeit += dt; return ereignisse; }   // die Uhr steht
  e.uhr += dt;

  for (let k = 0; k < e.offen.length; k++) {
    const x = e.offen[k];
    const faellig = x.hindernis ? x.t - HINDERNISSE[x.hindernis].vorlauf : x.t;
    if (e.uhr < faellig) continue;
    e.offen.splice(k--, 1);
    if (x.hindernis) {
      const h = HINDERNISSE[x.hindernis];
      // Hoehenziel: um stufe ueber bzw. unter der Hoehe beim Auftauchen,
      // aber innerhalb dessen, was der Drache erreichen kann
      // Jede Salve, jede Patrouille anders hoch: mal reicht ein kurzes Steigen,
      // mal muss er alles geben
      const stufe = (h.stufe || 0) * (0.65 + 0.7 * ((x.i * 0.618) % 1));
      const hoehe = h.art === "hoch" ? Math.min(1.3, flug.hoehe + stufe) : h.art === "tief" ? Math.max(-0.45, flug.hoehe - stufe) : 0;
      e.hindernisse.push({ typ: x.hindernis, art: h.art, ankunft: x.t, vorlauf: h.vorlauf, toleranz: h.toleranz,
        basis: flug.kurs + (x.versatz || 0), ziel: flug.kurs + (x.versatz || 0), weite: h.weite || 0, takt: h.takt || 0, hoehe, hoeheBasis: hoehe,
        phase: (x.i * 2.39) % 6.28, saat: x.i * 7.31, vorbei: null });
      ereignisse.push({ art: "auftauchen", typ: x.hindernis });
    } else if (x.moment) {
      e.moment = x.moment; e.momentSeit = 0; e.momentNr = x.i;
      ereignisse.push({ art: "moment" });
      break;
    } else {
      e.zeile = { text: x.text, wer: x.wer, seit: e.uhr };
      ereignisse.push({ art: "zeile", wer: x.wer });
    }
  }

  // Hindernisse: die Luecke wandert (seitlich) oder die Grenze steigt und
  // faellt (Hoehe); bei Ankunft zaehlt nur, ob man richtig liegt
  for (const h of e.hindernisse) {
    if (h.vorbei === null) {
      const s = e.uhr - (h.ankunft - h.vorlauf);
      const welle = h.weite * (Math.sin(h.takt * s + h.phase) - Math.sin(h.phase));
      if (h.art === "seitlich") h.ziel = h.basis + welle;
      else h.hoehe = Math.max(-0.45, Math.min(1.3, h.hoeheBasis + (h.art === "hoch" ? 1 : -1) * Math.abs(welle)));
    }
    if (h.vorbei === null && e.uhr >= h.ankunft) {
      // Wie weit liegt man daneben? Seitlich im Winkel, sonst in der Hoehe
      const abw = h.art === "hoch" ? h.hoehe - flug.hoehe : h.art === "tief" ? flug.hoehe - h.hoehe : Math.abs(winkel(flug.kurs - h.ziel));
      const knapp = h.art === "seitlich" ? h.toleranz * 0.6 : -0.1;
      h.vorbei = abw > h.toleranz ? "treffer" : abw > knapp ? "knapp" : "frei";
      if (h.vorbei === "treffer") e.treffer++;
      ereignisse.push({ art: h.vorbei, typ: h.typ });
    }
  }
  e.hindernisse = e.hindernisse.filter((h) => e.uhr < h.ankunft + 0.8);

  // Er sieht die Luecke - ob er sie zeigt, entscheidet die Bindung (flug.js)
  const naechstes = e.hindernisse.find((h) => h.vorbei === null);
  const seitlich = naechstes?.art === "seitlich";
  flug.hinweis = seitlich ? Math.max(-1, Math.min(1, winkel(naechstes.ziel - flug.kurs) * 2)) : 0;
  flug.hinweisHoch = naechstes && !seitlich ? Math.max(-1, Math.min(1, (naechstes.hoehe - flug.hoehe) * 2.5)) : 0;

  if (!e.offen.length && e.uhr >= e.d.dauer) e.ende = true;
  for (const x of ereignisse) e.ereignisse.push(x);
  return ereignisse;
}

/** Entscheidung in einem offenen Moment. seite: "naehe" | "distanz". */
export function waehlen(e, spiel, seite) {
  const m = e.moment;
  if (!m) return;
  const w = wahlWirkung(seite, m.zeugen, spiel.zufall);
  spiel.bindung = begrenzt(spiel.bindung + w.bindung);
  spiel.verdacht = begrenzt(spiel.verdacht + w.verdacht);
  spiel.wahlen.push({ einsatz: e.nr, moment: e.momentNr, seite });
  e.zeile = { text: m[seite].folge, wer: "folge", seit: e.uhr };
  e.moment = null;
}

/** Narben zaehlen fuer die Inspektion und den Sturz; jeder Treffer zehrt auch an der Bindung. */
export const TREFFER_KOSTET = 2;
/** Regenstaerke 0..1 zur aktuellen Einsatzuhr, aus den Stuetzpunkten der Daten. */
export function regenStaerke(e) {
  const r = e.d.regen;
  if (!r) return 0;
  for (let i = 1; i < r.length; i++) {
    if (e.uhr <= r[i][0]) { const [t0, a] = r[i - 1], [t1, b] = r[i]; return a + (b - a) * (e.uhr - t0) / (t1 - t0); }
  }
  return r[r.length - 1][1];
}

export function einsatzAbschliessen(e, spiel) {
  spiel.narben[e.nr] = e.treffer;
  spiel.bindung = begrenzt(spiel.bindung - e.treffer * TREFFER_KOSTET);
}

// --- Fuer Tests und Testbilder ----------------------------------------------------
// Ein gedachter Spieler an der Tastatur: sieht die Luecke mit menschlicher
// Verzoegerung, drueckt die Taste, solange er daneben liegt, und laesst los,
// wenn er drin ist. So spielen Menschen - und genau dabei merkt man, ob der
// Drache nachzieht. Er misst den Drachen, nicht den Spieler.

export function autopilot(reaktion = 0.25, vorhalt = 0.3, stufig = false, saat = 0) {
  const gesehen = [];
  let kursVorher = null, hoeheVorher = null, taste = 0;
  return (e, flug, dt) => {
    const h = e.hindernisse.find((x) => x.vorbei === null);
    const rate = kursVorher === null ? 0 : (flug.kurs - kursVorher) / dt;
    const steig = hoeheVorher === null ? 0 : (flug.hoehe - hoeheVorher) / dt;
    kursVorher = flug.kurs; hoeheVorher = flug.hoehe;
    // Er rechnet mit, wie weit der Drache nach dem Loslassen noch dreht -
    // so, wie es ein gut verbundener Drache tun wuerde (vorhalt). In der
    // Hoehe zielt er etwas ueber die Grenze hinaus, wie man es eben tut.
    // Menschen schaetzen falsch: je Hindernis ein eigener kleiner Irrtum
    // (saat waehlt die Irrtuemer; 0 heisst keiner)
    const irrtum = h && saat ? ((Math.sin(h.saat * 12.9898 + saat * 78.233) * 43758.5453) % 1) : 0;
    let fx = 0, fy = 0;
    if (h?.art === "seitlich") fx = winkel(h.ziel - flug.kurs) - rate * vorhalt + irrtum * 0.16;
    else if (h) fy = h.hoehe + (h.art === "hoch" ? 1 : -1) * (0.1 + irrtum * 0.12) - flug.hoehe - steig * vorhalt;
    gesehen.push([fx, fy]);
    const [ax, ay] = gesehen.length > Math.round(reaktion / dt) ? gesehen.shift() : [0, 0];
    const y = Math.max(-1, Math.min(1, ay * 4));
    if (!stufig) return { x: Math.max(-1, Math.min(1, ax * 2.5)), y };   // Maus oder Finger
    // Tastatur: an oder aus, mit demselben Anlauf wie im Spiel (tastenAnlauf)
    taste = tastenAnlauf(taste, Math.abs(ax) < 0.1 ? 0 : Math.sign(ax), dt);
    return { x: taste, y: Math.abs(ay) < 0.05 ? 0 : Math.sign(ay) };
  };
}

/** Eine gehaltene Taste lenkt erst sanft, dann voll - so geht auch ein kurzes Antippen. */
export function tastenAnlauf(wert, richtung, dt) {
  if (!richtung) return 0;
  if (Math.sign(wert) !== richtung) wert = richtung * 0.3;
  return richtung * Math.min(1, Math.abs(wert) + dt * 1.8);
}

/**
 * Spielt einen Einsatz ohne Grafik durch. waehle(moment) -> "naehe"|"distanz".
 * Gibt den fertigen Einsatz zurueck; Spielwerte werden in spiel fortgeschrieben.
 */
export function einsatzDurchspielen(nr, spiel, flug, waehle, pilot = autopilot(), dt = 1 / 60) {
  const e = einsatzBeginnen(nr);
  for (let i = 0; i < 60 * 600 && !e.ende; i++) {
    fliegen(flug, dt, e.moment ? { x: 0, y: 0 } : pilot(e, flug, dt), spiel.bindung);
    einsatzSchritt(e, dt, flug);
    if (e.moment && e.momentSeit > 2) waehlen(e, spiel, waehle(e.moment, spiel));
  }
  einsatzAbschliessen(e, spiel);
  return e;
}

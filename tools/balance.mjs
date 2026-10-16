// Spielt das ganze Spiel viele Male durch, je Strategie, mit genau der Logik
// aus src/einsatz.js und src/geschichte.js. Die Fluege fliegen gedachte
// Spieler (Maus/Tastatur, flink/langsam, zufaellig gewaehlt).
//
// Ziel: Kein sicherer Weg. Jeder Ausgang kommt vor, keine Strategie fuehrt
// verlaesslich zu einem Ende, jede traegt ein Risiko.

import { EINSAETZE } from "../src/data/einsaetze.js";
import { einsatzDurchspielen, neuesSpiel, autopilot, wahlWirkung } from "../src/einsatz.js";
import { szeneBeginnen, szeneWeiter, szeneWaehlen, verhaftet, ausgang } from "../src/geschichte.js";
import { neuerFlug } from "../src/flug.js";

const RUNDEN = Number(process.argv[2] || 400);
// Spieler: Reaktionszeit 0,18-0,36 s, Vorhalt 0,15-0,35 s, Maus oder Tastatur,
// dazu je Partie eine von zwoelf Arten, sich zu verschaetzen
const SPIELER = [];
for (const r of [0.18, 0.24, 0.3, 0.36]) for (const v of [0.15, 0.25, 0.35]) for (const t of [false, true]) SPIELER.push([r, v, t]);

// Strategie: moment(zeugen, einsatz, zufall) -> "naehe"|"distanz"; tuer -> "rechts"|"links"; entdeckt -> "rechts" (deckt)|"links"
const STRATEGIEN = {
  "Immer Distanz": { moment: () => "distanz", tuer: "links", entdeckt: "links" },
  "Immer Nähe": { moment: () => "naehe", tuer: "rechts", entdeckt: "rechts" },
  "Nähe nur allein": { moment: (z) => (z === "allein" ? "naehe" : "distanz"), tuer: "links", entdeckt: "rechts" },
  "Nähe, aber Distanz zeigen": { moment: () => "naehe", tuer: "rechts", entdeckt: "links" },
  "Erst Distanz, dann Nähe": { moment: (z, nr) => (nr >= 2 ? "naehe" : "distanz"), tuer: "rechts", entdeckt: "rechts" },
  "Erst Nähe, dann Distanz": { moment: (z, nr) => (nr >= 2 ? "distanz" : "naehe"), tuer: "links", entdeckt: "links" },
  "Zufall": { moment: (z, nr, r) => (r() < 0.5 ? "naehe" : "distanz"), tuer: "zufall", entdeckt: "zufall" }
};

// Ein Einsatz haengt nur von Spieler, Bindung zu Beginn und den Entscheidungen ab
const ablage = new Map();
function einsatz(nr, spiel, sp, irrt, strategie, r) {
  const momente = EINSAETZE[nr].ablauf.filter((x) => x.moment);
  const entscheide = momente.map((x) => strategie.moment(x.moment.zeugen, nr, r));
  const schluessel = `${nr}|${sp}|${irrt}|${spiel.bindung}|${entscheide.join("")}`;
  let erg = ablage.get(schluessel);
  if (!erg) {
    // Der Flug haengt nicht am Verdacht; den wuerfelt jede Partie selbst (unten)
    const probe = { ...neuesSpiel(), bindung: spiel.bindung, zufall: () => 1 };
    let i = 0;
    einsatzDurchspielen(nr, probe, neuerFlug(), () => entscheide[i++], autopilot(...SPIELER[sp], irrt), 1 / 30);
    erg = { treffer: probe.narben[nr], bindung: probe.bindung };
    ablage.set(schluessel, erg);
  }
  spiel.bindung = erg.bindung;
  momente.forEach((x, i) => { spiel.verdacht = Math.max(0, Math.min(100, spiel.verdacht + wahlWirkung(entscheide[i], x.moment.zeugen, r).verdacht)); });
  spiel.narben[nr] = erg.treffer;
}

function partie(strategie, r) {
  const spiel = { ...neuesSpiel(), zufall: r };
  const sp = Math.floor(r() * SPIELER.length), irrt = 1 + Math.floor(r() * 12);
  for (let nr = 0; nr < 5; nr++) {
    einsatz(nr, spiel, sp, irrt, strategie, r);
    if (nr === 4) break;
    const sz = szeneBeginnen(nr, spiel);
    for (let i = 0; i < 20 && !sz.fertig; i++) {
      if (sz.wahl) {
        const w = sz.wahl.art === "tuer" ? strategie.tuer : strategie.entdeckt;
        szeneWaehlen(sz, spiel, w === "zufall" ? (r() < 0.5 ? "links" : "rechts") : w);
      } else szeneWeiter(sz, spiel, r);
    }
    if (verhaftet(spiel)) return { ende: "tribunal", spiel, frueh: true };
  }
  return { ende: ausgang(spiel), spiel };
}

// Reproduzierbarer Zufall
function zufallsquelle(saat) { let s = saat >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const ENDEN = ["grenze", "geheimnis", "tribunal", "pflicht", "sturz"];
const fehler = [];
const gesamt = Object.fromEntries(ENDEN.map((e) => [e, 0]));
console.log(`${RUNDEN} Partien je Strategie\n`);
console.log("".padEnd(28) + ENDEN.map((e) => e.padStart(10)).join("") + "   davon früh verhaftet");
for (const [name, strategie] of Object.entries(STRATEGIEN)) {
  const r = zufallsquelle(name.length * 7919);
  const z = Object.fromEntries(ENDEN.map((e) => [e, 0]));
  let frueh = 0;
  for (let i = 0; i < RUNDEN; i++) { const p = partie(strategie, r); z[p.ende]++; gesamt[p.ende]++; if (p.frueh) frueh++; }
  console.log(name.padEnd(28) + ENDEN.map((e) => `${Math.round(z[e] / RUNDEN * 100)} %`.padStart(10)).join("") + `${Math.round(frueh / RUNDEN * 100)} %`.padStart(12));
  // Kein sicherer Weg: keine Strategie fuehrt verlaesslich zu einem Ende, und
  // jede traegt ein Risiko (Tribunal oder Sturz). Die Ausgaenge sind nicht
  // gewonnen oder verloren - auch "Ueber die Grenze" heisst: gejagt.
  const haupt = Math.max(...Object.values(z)) / RUNDEN, schlimm = (z.tribunal + z.sturz) / RUNDEN;
  if (haupt > 0.8) fehler.push(`${name}: ein Ausgang in ${Math.round(haupt * 100)} % der Partien`);
  if (schlimm < 0.05) fehler.push(`${name}: kaum Risiko (${Math.round(schlimm * 100)} % Tribunal oder Sturz)`);
}
const alle = Object.keys(STRATEGIEN).length * RUNDEN;
console.log("Alle".padEnd(28) + ENDEN.map((e) => `${Math.round(gesamt[e] / alle * 100)} %`.padStart(10)).join(""));
for (const e of ENDEN) if (gesamt[e] / alle < 0.04) fehler.push(`Ausgang ${e} kommt kaum vor (${(gesamt[e] / alle * 100).toFixed(1)} %)`);

if (fehler.length) { console.error("\nFehler:"); fehler.forEach((f) => console.error("  " + f)); process.exit(1); }
console.log("\nKeine Fehler.");

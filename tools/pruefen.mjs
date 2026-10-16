// Prueft die Einsaetze ohne Browser: Aufbau der Daten und ob die Bindung
// beim Ausweichen wirklich den Unterschied macht. Gespielt wird mit genau
// der Logik aus src/einsatz.js und src/flug.js, von gedachten Spielern mit
// verschiedener Reaktionszeit, mit Maus und mit Tastatur.

import { EINSAETZE, HINDERNISSE } from "../src/data/einsaetze.js";
import { einsatzDurchspielen, neuesSpiel, autopilot } from "../src/einsatz.js";
import { neuerFlug } from "../src/flug.js";

const fehler = [];

// --- Daten ---------------------------------------------------------------------------
const SOLL_MOMENTE = [2, 3, 2, 3, 2];
EINSAETZE.forEach((d, nr) => {
  const momente = d.ablauf.filter((x) => x.moment);
  const hindernisse = d.ablauf.filter((x) => x.hindernis);
  if (momente.length !== SOLL_MOMENTE[nr]) fehler.push(`Einsatz ${nr + 1}: ${momente.length} Momente statt ${SOLL_MOMENTE[nr]}`);
  for (const m of momente) {
    for (const k of ["lage", "distanz", "naehe", "zeugen"]) if (!m.moment[k]) fehler.push(`Einsatz ${nr + 1}, ${m.t} s: Moment ohne ${k}`);
    // Ein Moment haelt die Uhr an; dabei darf nichts in der Luft haengen
    for (const h of hindernisse) {
      const von = h.t - HINDERNISSE[h.hindernis].vorlauf, bis = h.t + 1;
      if (m.t >= von && m.t <= bis) fehler.push(`Einsatz ${nr + 1}: Moment bei ${m.t} s fällt in das Hindernis bei ${h.t} s`);
    }
  }
  const letzte = Math.max(...d.ablauf.map((x) => x.t));
  if (d.dauer < letzte + 5) fehler.push(`Einsatz ${nr + 1}: Dauer ${d.dauer} s zu kurz für das letzte Ereignis bei ${letzte} s`);
  for (const x of d.ablauf) if (!x.hindernis && !x.moment && !x.text) fehler.push(`Einsatz ${nr + 1}, ${x.t} s: leerer Eintrag`);
  for (const x of d.ablauf) if (x.hindernis && !HINDERNISSE[x.hindernis]) fehler.push(`Einsatz ${nr + 1}: unbekanntes Hindernis ${x.hindernis}`);
});

// --- Ausweichen nach Bindung -------------------------------------------------------------
const SPIELER = [
  ["Maus, flink", () => autopilot(0.2, 0.3, false, 1)],
  ["Maus, langsam", () => autopilot(0.3, 0.3, false, 2)],
  ["Tastatur, flink", () => autopilot(0.2, 0.3, true, 3)],
  ["Tastatur, langsam", () => autopilot(0.3, 0.2, true, 4)]
];
const STUFEN = [0, 20, 40, 60, 80, 100];
const gesamt = EINSAETZE.reduce((n, d) => n + d.ablauf.filter((x) => x.hindernis).length, 0);
console.log(`Treffer in % aller ${gesamt} Hindernisse, nach Bindung zu Beginn jedes Einsatzes\n`);
console.log("".padEnd(20) + STUFEN.map((b) => String(b).padStart(6)).join(""));
const mittel = STUFEN.map(() => 0);
for (const [name, pilot] of SPIELER) {
  const zeile = STUFEN.map((b, i) => {
    let treffer = 0;
    EINSAETZE.forEach((_, nr) => {
      const spiel = neuesSpiel(); spiel.bindung = b;
      treffer += einsatzDurchspielen(nr, spiel, neuerFlug(), () => "distanz", pilot()).treffer;
    });
    const q = treffer / gesamt;
    mittel[i] += q / SPIELER.length;
    return q;
  });
  console.log(name.padEnd(20) + zeile.map((q) => `${Math.round(q * 100)}`.padStart(6)).join(""));
}
console.log("Mittel".padEnd(20) + mittel.map((q) => `${Math.round(q * 100)}`.padStart(6)).join(""));

// Kein sicherer Weg: ohne Bindung wird es schwer, mit Bindung leicht - aber nie umgekehrt
for (let i = 1; i < STUFEN.length; i++) if (mittel[i] > mittel[i - 1] + 0.03) fehler.push(`Bei Bindung ${STUFEN[i]} trifft es öfter als bei ${STUFEN[i - 1]}`);
if (mittel[0] < 0.4) fehler.push("Ohne Bindung ist das Ausweichen zu leicht");
if (mittel[STUFEN.length - 1] > 0.15) fehler.push("Mit voller Bindung ist das Ausweichen zu schwer");

if (fehler.length) { console.error("\nFehler:"); fehler.forEach((f) => console.error("  " + f)); process.exit(1); }
console.log("\nKeine Fehler.");

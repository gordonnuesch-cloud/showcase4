// Ton, ganz aus Web Audio: Rauschen, Filter, ein paar Sinustoene. Keine Dateien.
//
// Dauerschichten: Wind (folgt Tempo, Kurve, Bindung), Regen, Herzschlag bei
// hoher Bindung, Fluegelschlaege im Takt des Drachen.
// Einzelklaenge: vorbei, Pfeile, Donner, Treffer, Moment, Wahl, Seite, Ausgang.
//
// Der Klang folgt der Bindung wie das Bild: kalt heisst duenner, hoeher,
// zischender Wind; warm heisst tiefer, weicher, mit einem Puls darunter.

let k = null, haupt, windBand, windTief, windGain, tiefGain, regenGain, momentGain = null;
let stumm = false, mitMusik = true, letzterSchlag = 0, letzterPuls = 0;
try {
  stumm = localStorage.getItem("schwingen-stumm") === "1";
  mitMusik = localStorage.getItem("schwingen-musik") !== "0";
} catch { /* ohne Speicher eben laut */ }
if (new URLSearchParams(location.search).has("ohnemusik")) mitMusik = false;

const LAUTSTAERKE = 0.7;

function rauschen(sek = 2) {
  const b = k.createBuffer(1, k.sampleRate * sek, k.sampleRate), d = b.getChannelData(0);
  // Rosa getoent: weicher als weisses Rauschen
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
  }
  return b;
}
let rauschPuffer = null;
function quelle() {
  const q = k.createBufferSource(); q.buffer = rauschPuffer; q.loop = true;
  q.loopStart = Math.random(); q.start(0, Math.random() * 1.5);
  return q;
}

/** Erst nach einer Geste des Spielers moeglich (Autoplay-Regeln der Browser). */
export function tonStarten() {
  if (k) { if (k.state === "suspended") k.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  k = new AC();
  rauschPuffer = rauschen();
  haupt = k.createGain(); haupt.gain.value = stumm ? 0 : LAUTSTAERKE;
  // Ein sanfter Begrenzer, damit Donner und Treffer nicht uebersteuern
  const begrenzer = k.createDynamicsCompressor();
  begrenzer.threshold.value = -14; begrenzer.ratio.value = 6;
  haupt.connect(begrenzer).connect(k.destination);
  musikAufbauen(begrenzer);

  // Wind: ein Band, das mit der Kaelte nach oben wandert, und ein tiefes Grollen
  windBand = k.createBiquadFilter(); windBand.type = "bandpass"; windBand.Q.value = 0.7; windBand.frequency.value = 700;
  windGain = k.createGain(); windGain.gain.value = 0;
  quelle().connect(windBand).connect(windGain).connect(haupt);
  windTief = k.createBiquadFilter(); windTief.type = "lowpass"; windTief.frequency.value = 180;
  tiefGain = k.createGain(); tiefGain.gain.value = 0;
  quelle().connect(windTief).connect(tiefGain).connect(haupt);

  // Regen: hell, dicht, ohne Ton
  const hp = k.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
  const lp = k.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000;
  regenGain = k.createGain(); regenGain.gain.value = 0;
  quelle().connect(hp).connect(lp).connect(regenGain).connect(haupt);
}

/** Drei Stufen: Ton mit Musik → Ton ohne Musik → stumm → wieder von vorn. */
export function stummSchalten() {
  if (!stumm && mitMusik) mitMusik = false;
  else if (!stumm) stumm = true;
  else { stumm = false; mitMusik = true; }
  try { localStorage.setItem("schwingen-stumm", stumm ? "1" : "0"); localStorage.setItem("schwingen-musik", mitMusik ? "1" : "0"); } catch { /* egal */ }
  if (k) {
    haupt.gain.setTargetAtTime(stumm ? 0 : LAUTSTAERKE, k.currentTime, 0.1);
    musikBus.gain.setTargetAtTime(stumm || !mitMusik ? 0 : MUSIK, k.currentTime, 0.4);
  }
  return stumm;
}
export const istStumm = () => stumm;
export const hatMusik = () => mitMusik && !stumm;

/**
 * Jeden Frame: Dauerschichten nachfuehren.
 * z = { tempo, drehrate, waerme, laut 0..1 (Phase), regen 0..1, schlag, zeit }
 */
export function tonFuehren(z) {
  if (!k || k.state !== "running") return;
  musikFuehren(z);
  const t = k.currentTime;
  const kalt = 1 - z.waerme, kurve = Math.min(1, Math.abs(z.drehrate) * 1.5);
  windBand.frequency.setTargetAtTime(380 + kalt * 900 + kurve * 400, t, 0.3);
  windGain.gain.setTargetAtTime(z.laut * (0.18 + kalt * 0.16 + kurve * 0.12), t, 0.25);
  tiefGain.gain.setTargetAtTime(z.laut * (0.25 + z.waerme * 0.25), t, 0.4);
  regenGain.gain.setTargetAtTime(z.regen * 0.32, t, 0.6);

  // Fluegelschlag: beim Abwaertsschlag ein weiches, tiefes Schieben der Luft
  const phase = Math.sin(z.schlag * 2);
  if (z.drache && letzterSchlag > 0 && phase <= 0) schub(0.1 + 0.08 * z.laut);
  letzterSchlag = phase;
  // Herzschlag, im selben Takt wie die Glutadern - nur bei Naehe
  const puls = Math.sin(z.zeit * 2.3);
  if (z.drache && z.waerme > 0.45 && letzterPuls < 0.97 && puls >= 0.97) herz((z.waerme - 0.45) * 0.6);
  letzterPuls = puls;
}

// --- Bausteine -----------------------------------------------------------------------
function huelle(g, t, an, halten, aus, spitze) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(spitze, t + an);
  g.gain.setValueAtTime(spitze, t + an + halten);
  g.gain.exponentialRampToValueAtTime(0.0001, t + an + halten + aus);
}
function stoss(dauer, filterTyp, von, bis, spitze, q = 1, verzoegert = 0) {
  const t = k.currentTime + verzoegert;
  const s = k.createBufferSource(); s.buffer = rauschPuffer;
  const f = k.createBiquadFilter(); f.type = filterTyp; f.Q.value = q;
  f.frequency.setValueAtTime(von, t); f.frequency.exponentialRampToValueAtTime(bis, t + dauer);
  const g = k.createGain();
  huelle(g, t, dauer * 0.25, 0, dauer * 0.75, spitze);
  s.connect(f).connect(g).connect(haupt);
  s.start(t, Math.random() * 1.5); s.stop(t + dauer + 0.05);
}
function sinus(freq, dauer, spitze, an = 0.01, ziel = null, verzoegert = 0, ausgang = haupt) {
  const t = k.currentTime + verzoegert;
  const o = k.createOscillator(); o.frequency.setValueAtTime(freq, t);
  if (ziel) o.frequency.exponentialRampToValueAtTime(ziel, t + dauer);
  const g = k.createGain();
  huelle(g, t, an, 0, dauer, spitze);
  o.connect(g).connect(ausgang);
  o.start(t); o.stop(t + an + dauer + 0.05);
}
const schub = (s) => stoss(0.45, "lowpass", 260, 90, s, 0.8);
const herz = (s) => { sinus(58, 0.18, s, 0.008, 40); sinus(52, 0.22, s * 0.7, 0.008, 38, 0.24); };

// --- Einzelklaenge ------------------------------------------------------------------
/** art: vorbei | knapp | treffer | pfeile | donner | moment | naehe | distanz | bemerkt | antwort | aufatmen | seite | ausgang */
export function tonEreignis(art, wert) {
  if (!k || k.state !== "running") return;
  switch (art) {
    case "vorbei": stoss(0.7, "bandpass", 300, 1400, 0.25, 1.2); break;
    case "knapp": stoss(0.6, "bandpass", 500, 2600, 0.45, 1.5); break;
    case "treffer":
      sinus(75, 0.4, 0.7, 0.005, 38);
      stoss(0.35, "lowpass", 1400, 200, 0.6, 0.7);
      stoss(0.08, "highpass", 2500, 2000, 0.25, 0.7);
      break;
    case "pfeile":
      // Ein dumpfes Abschlagen tief unten, dann pfeifende Bolzen
      sinus(90, 0.15, 0.25, 0.004, 60);
      for (let i = 0; i < 5; i++) stoss(0.3, "bandpass", 3800 - i * 200, 1600, 0.09, 14, 0.5 + i * 0.07 + Math.random() * 0.05);
      break;
    case "donner": {
      const nah = wert ?? 0.5;
      stoss(0.07, "highpass", 3000, 1500, 0.3 * nah, 0.7);
      stoss(2.8, "lowpass", 260, 60, 0.5 + 0.4 * nah, 0.9, 0.15 + (1 - nah) * 0.8);
      break;
    }
    case "moment":
      // Die Welt wird leiser; zwei tiefe Toene, offen, ohne Aufloesung
      if (momentGain) momentGain.gain.setTargetAtTime(0.0001, k.currentTime, 0.3);
      momentGain = k.createGain(); momentGain.gain.value = 1; momentGain.connect(haupt);
      sinus(146.8, 5, 0.06, 1.6, null, 0, momentGain);
      sinus(220, 5, 0.04, 2.2, null, 0, momentGain);
      break;
    case "naehe":
      herz(0.45);
      if (momentGain) { sinus(185, 3.5, 0.05, 0.8, null, 0, momentGain); sinus(293.7, 3.5, 0.03, 1.2, null, 0.2, momentGain); }
      break;
    case "distanz":
      // Ein kalter Windstoss; die Toene des Moments verwehen
      stoss(1.1, "bandpass", 2400, 900, 0.3, 0.9);
      if (momentGain) momentGain.gain.setTargetAtTime(0.0001, k.currentTime, 0.5);
      break;
    case "bemerkt":
      // Kalt und kurz: zwei hohe, leicht verstimmte Toene, die schnell vergehen
      sinus(1318, 0.9, 0.025, 0.01, 1240); sinus(1325, 0.9, 0.02, 0.01, 1250, 0.03);
      stoss(0.5, "highpass", 5000, 3500, 0.04, 0.7);
      break;
    case "antwort":
      // Er antwortet: ein kraeftiger Fluegelschlag und ein warmer Ton darunter
      stoss(0.6, "lowpass", 340, 80, 0.35, 0.9);
      sinus(220, 1.4, 0.05, 0.08); sinus(330, 1.2, 0.03, 0.12, null, 0.08);
      break;
    case "aufatmen": stoss(0.9, "lowpass", 700, 250, 0.08, 0.6); break;
    case "seite": stoss(0.05, "highpass", 2400, 1800, 0.05, 0.6); break;
    case "ausgang": {
      const akkord = { grenze: [146.8, 220, 293.7, 370, 440], geheimnis: [146.8, 220, 277.2, 329.6],
        pflicht: [110, 165, 220], tribunal: [98, 146.8, 174.6], sturz: [87.3, 130.8, 155.6] }[wert] || [110, 165];
      akkord.forEach((f, i) => sinus(f, 7, 0.05, 2 + i * 0.4, null, i * 0.35));
      break;
    }
  }
}

/** Alles einmal anspielen - fuer den Rauchtest. */
export function tonProbe() {
  ["vorbei", "knapp", "treffer", "pfeile", "donner", "moment", "naehe", "distanz", "bemerkt", "antwort", "aufatmen", "seite"].forEach((a) => tonEreignis(a, 0.7));
  ["grenze", "geheimnis", "pflicht", "tribunal", "sturz"].forEach((a) => tonEreignis("ausgang", a));
  return k ? k.state : "fehlt";
}

// --- Musik (Versuch) ---------------------------------------------------------------
// Ein Klangteppich aus langsamen Akkorden in d-Moll (d - B - F - C), dazu ein
// Motiv aus fuenf Toenen auf einer weichen Glocke, alles mit Nachhall. Die
// Bindung entscheidet, wie viel davon da ist: kalt nur leere Quinten und ein
// Motiv, das nach drei Toenen abbricht; warm volle Akkorde mit Terz und Bass,
// das Motiv vollstaendig und aufgeloest. Im Moment haelt die Musik den Atem
// an, am Boden ist sie kaum zu hoeren.

const MUSIK = 0.4;
const AKKORDE = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64]];
const MOTIV = [[69, 0.7], [74, 0.7], [76, 0.7], [77, 1.4], [76, 2.2]];
const AUFLOESUNG = [[74, 3]];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let musikBus = null, hall = null, musikLaut = null, naechsterAkkord = 0, akkordNr = 0, motivZaehler = 0;

function nachhall(sek = 3.2) {
  // Rauschen, das exponentiell verklingt - ein Raum aus Code
  const n = k.sampleRate * sek, b = k.createBuffer(2, n, k.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  const v = k.createConvolver(); v.buffer = b; return v;
}

function musikAufbauen(ziel) {
  musikBus = k.createGain(); musikBus.gain.value = stumm || !mitMusik ? 0 : MUSIK;
  musikLaut = k.createGain(); musikLaut.gain.value = 0;          // folgt der Phase
  hall = nachhall();
  const nass = k.createGain(); nass.gain.value = 0.55;
  musikLaut.connect(musikBus);
  musikLaut.connect(hall).connect(nass).connect(musikBus);
  musikBus.connect(ziel);
  naechsterAkkord = k.currentTime + 0.5;
}

function flaeche(midi, beginn, dauer, laut, hell) {
  // Zwei leicht verstimmte Dreiecke durch einen weichen Tiefpass
  const f = k.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500 + hell * 1700; f.Q.value = 0.3;
  const g = k.createGain();
  g.gain.setValueAtTime(0.0001, beginn);
  g.gain.exponentialRampToValueAtTime(laut, beginn + dauer * 0.35);
  g.gain.setValueAtTime(laut, beginn + dauer * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, beginn + dauer * 1.25);
  f.connect(g).connect(musikLaut);
  for (const verstimmt of [-4, 4]) {
    const o = k.createOscillator(); o.type = "triangle"; o.frequency.value = hz(midi); o.detune.value = verstimmt;
    o.connect(f); o.start(beginn); o.stop(beginn + dauer * 1.3);
  }
}

function glocke(midi, beginn, laut) {
  const g = k.createGain();
  g.gain.setValueAtTime(0.0001, beginn);
  g.gain.exponentialRampToValueAtTime(laut, beginn + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, beginn + 2.8);
  g.connect(musikLaut);
  [[1, 1], [2.01, 0.25], [3.02, 0.08]].forEach(([teil, anteil]) => {
    const o = k.createOscillator(); o.frequency.value = hz(midi) * teil;
    const a = k.createGain(); a.gain.value = anteil;
    o.connect(a).connect(g); o.start(beginn); o.stop(beginn + 2.9);
  });
}

function musikFuehren(z) {
  const t = k.currentTime;
  const ziel = { einsatz: z.imMoment ? 0.55 : 1, frei: 0.8, titel: 0.9, szene: 0.35, ausgang: 0.25 }[z.phase] ?? 0.8;
  musikLaut.gain.setTargetAtTime(ziel, t, z.imMoment ? 0.8 : 1.5);
  if (t < naechsterAkkord - 0.1) return;

  // Naechster Akkord, etwas im Voraus geplant
  const beginn = Math.max(t, naechsterAkkord), dauer = 9, w = z.waerme;
  const akkord = AKKORDE[akkordNr % AKKORDE.length];
  // Kalt: nur Grundton und Quinte. Warm: alle Toene, dazu der Bass eine Oktave tiefer
  const toene = w < 0.35 ? [akkord[0] + 12, akkord[1] + 12] : w < 0.7 ? akkord.slice(0, 3) : [akkord[0] - 12, ...akkord];
  toene.forEach((m) => flaeche(m, beginn, dauer, 0.028 + 0.012 * w, w));
  // Im Moment kein Motiv - die Musik haelt den Atem an
  if (!z.imMoment && akkordNr % 2 === 0 && z.phase !== "szene") {
    let s = beginn + 1.5;
    const phrase = w < 0.35 ? MOTIV.slice(0, 3) : w < 0.7 ? MOTIV : [...MOTIV, ...AUFLOESUNG];
    for (const [m, l] of phrase) { glocke(m + (w > 0.7 && motivZaehler % 2 ? -12 : 0), s, 0.045); s += l; }
    motivZaehler++;
  }
  akkordNr++;
  naechsterAkkord = beginn + dauer * 0.85;     // Akkorde ueberlappen sanft
}

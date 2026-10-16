// Das Flugmodell, ohne Grafik. Die Bindung ist hier keine Zahl auf dem
// Schirm, sondern das Verhalten des Drachen:
//
//   Verzoegerung   wie lange eine Eingabe braucht, bis er sie aufnimmt
//   Traegheit      wie weich er ihr dann folgt (Zeitkonstante)
//   Wendigkeit     wie eng er wenden kann
//   Unruhe         wie sehr er von sich aus schlingert
//
// Bei hoher Bindung ist er sofort da. Bei niedriger zieht er nach, ist
// schwer und eigenwillig. Der Spieler soll das merken, bevor er es benennt.

const lerp = (a, b, t) => a + (b - a) * t;

/** Alle Wirkungen der Bindung an einer Stelle. b = Bindung 0..100. */
export function kennwerte(b) {
  const k = Math.max(0, Math.min(1, b / 100));
  return {
    verzoegerung: lerp(0.22, 0.0, k),     // Sekunden
    traegheit: lerp(0.55, 0.1, k),        // Zeitkonstante in Sekunden
    wendigkeit: lerp(0.6, 1.3, k),        // Bogenmass pro Sekunde
    unruhe: lerp(0.35, 0.0, k),
    waerme: k * k * (3 - 2 * k)           // Stimmung im Bild
  };
}

/** Reisehoehe ueber dem Wolkenmeer: Platz nach oben fuer Salven, nach unten fuer Patrouillen. */
export const REISEHOEHE = 0.3;

export function neuerFlug() {
  return {
    zeit: 0, kurs: 0, neigung: 0, rolle: 0, hoehe: REISEHOEHE, pos: [0, 0], tempo: 1.3,
    puffer: [], folge: { x: 0, y: 0 }, kopf: 0, blick: 0, schlag: 0, hinweis: 0, hinweisHoch: 0, lehne: 0
  };
}

// Langsame, unregelmaessige Schwankung aus drei Sinus - kein Muster erkennbar
const schlingern = (t) => Math.sin(t * 1.3) * 0.5 + Math.sin(t * 2.7 + 1.1) * 0.3 + Math.sin(t * 0.6 + 2.3) * 0.2;

/** Ein Zeitschritt. eingabe = { x: -1..1 (links/rechts), y: -1..1 (steigen/sinken) }. */
export function fliegen(f, dt, eingabe, bindung) {
  const kw = kennwerte(bindung);
  f.zeit += dt;
  // Die Reiterin lehnt sich sofort in die Kurve - so spuert man, dass die
  // Eingabe angekommen ist, auch wenn der Drache noch nicht folgt
  f.lehne += (eingabe.x - f.lehne) * (1 - Math.exp(-dt / 0.07));
  // Verzoegerung: die Eingabe kommt erst nach kw.verzoegerung an
  f.puffer.push({ t: f.zeit, x: eingabe.x, y: eingabe.y });
  let jetzt = f.puffer[0];
  while (f.puffer.length > 1 && f.puffer[1].t <= f.zeit - kw.verzoegerung) { f.puffer.shift(); jetzt = f.puffer[0]; }
  if (kw.verzoegerung === 0) jetzt = f.puffer[f.puffer.length - 1];
  // Traegheit: weich hinterher
  const a = 1 - Math.exp(-dt / kw.traegheit);
  f.folge.x += (jetzt.x - f.folge.x) * a;
  f.folge.y += (jetzt.y - f.folge.y) * a;
  // Unruhe: er schlingert von sich aus
  const sx = f.folge.x + schlingern(f.zeit) * kw.unruhe;
  const sy = f.folge.y + schlingern(f.zeit + 40) * kw.unruhe * 0.5;

  f.kurs += sx * kw.wendigkeit * dt;
  f.rolle += (-sx * 0.6 - f.rolle) * Math.min(1, dt * 3);
  f.neigung += (sy * 0.35 - f.neigung) * Math.min(1, dt * 3);
  // Steigen und Sinken so wendig wie das Kurven; ohne Zutun zurueck auf Reisehoehe
  let steig = Math.sin(f.neigung) * f.tempo * 0.9 * kw.wendigkeit;
  if (Math.abs(f.folge.y) < 0.15) steig -= (f.hoehe - REISEHOEHE) * 0.12;
  f.hoehe = Math.max(-0.5, Math.min(1.4, f.hoehe + steig * dt));
  f.pos[0] += Math.sin(f.kurs) * f.tempo * dt;
  f.pos[1] += Math.cos(f.kurs) * f.tempo * dt;
  // Der Kopf nimmt die Richtung vorweg - aber nur, wenn er die Reiterin versteht.
  // Und er zeigt die Luecke, die er sieht (hinweis), nur wenn sie verbunden sind.
  const ziel = jetzt.x * (0.4 + 0.6 * kw.waerme) + (f.hinweis || 0) * Math.max(0, kw.waerme - 0.3) * 1.1;
  f.kopf += (Math.max(-1.2, Math.min(1.2, ziel)) - f.kopf) * Math.min(1, dt * (2 + 8 * kw.waerme));
  // Ebenso nickt er nach oben oder unten, wenn er die Gefahr in der Hoehe sieht
  const nick = (f.hinweisHoch || 0) * Math.max(0, kw.waerme - 0.3) * 1.1;
  f.blick += (nick - f.blick) * Math.min(1, dt * (2 + 8 * kw.waerme));
  f.schlag += dt * (1.1 + Math.abs(sy) * 0.8);
  return kw;
}

/**
 * Kamera fuer den Himmel: gieren, nicken, rollen. Grundstellung leicht nach
 * oben (negativ = hinauf), damit der Himmel das Bild traegt. Beim Steigen hebt
 * sich der Blick, beim Abtauchen senkt er sich - halb so stark wie der Drache,
 * sonst verschwindet beim Tauchen der Himmel. Der Blick der Reiterin geht in
 * die Kurve voraus.
 */
export const kamera = (f) => [f.kurs + f.lehne * 0.07, -0.13 - f.neigung * 0.5, f.rolle - f.lehne * 0.08];

/**
 * Misst, wie lange der Drache braucht, um einem plotzlichen Lenkbefehl zu
 * 63 % zu folgen. Fuer Tests - so ist "fuehlt sich traeger an" eine Zahl.
 */
export function reaktionszeit(bindung) {
  const f = neuerFlug();
  const dt = 1 / 120;
  for (let t = 0; t < 1; t += dt) fliegen(f, dt, { x: 0, y: 0 }, bindung);   // erst geradeaus
  const start = f.zeit;
  for (let t = 0; t < 3; t += dt) {
    fliegen(f, dt, { x: 1, y: 0 }, bindung);
    if (f.folge.x >= 0.63) return f.zeit - start;
  }
  return Infinity;
}

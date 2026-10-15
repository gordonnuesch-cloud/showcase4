// Der Himmel: ein einziger Fragment-Shader in rohem WebGL2.
//
// Kein echtes Volumen-Raymarching - das ist auf Konferenzlaptops zu teuer.
// Stattdessen vier perspektivische Wolkenschichten als Ebenen in der Welt
// (Zirren hoch oben, Haufenwolken darueber, Wolkenmeer darunter, Nebelfetzen
// auf Flughoehe). Jede Schicht: fraktales Rauschen mit Verwirbelung, eine
// zweite Probe in Sonnenrichtung fuer Licht und Schatten, Silberraender im
// Gegenlicht. Die Schichten ziehen unterschiedlich schnell - das macht Tiefe.
//
// `waerme` (0..1) ist die Stimmung: kalt, blau, klar <-> warm, Bernstein,
// gluehender Horizont. Spaeter haengt daran die Bindung.

const VS = `#version 300 es
void main() {
  // Ein Dreieck, das den ganzen Schirm bedeckt
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
out vec4 ausgabe;

uniform vec2  uAufl;
uniform float uZeit;
uniform float uFlug;          // zurueckgelegte Strecke
uniform vec3  uKamera;        // gieren, nicken, rollen (Bogenmass)
uniform vec3  uSonne;         // Richtung zur Sonne (oder zum Mond)
uniform vec3  uZenit, uHorizont, uSonnenFarbe, uWolkeHell, uWolkeDunkel, uDunst;
uniform float uBedeckung;     // 0..1
uniform float uSterne;        // 0..1, nur nachts
uniform float uWaerme;        // 0..1 Stimmung
uniform int   uOktaven;       // Qualitaet
uniform int   uVoll;          // 1 = alle Schichten und Verwirbelung
uniform float uWand;          // 0..1 Gewittertuerme am Horizont

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float rausch(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p, int okt) {
  float s = 0.0, a = 0.5;
  mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 8; i++) {
    if (i >= okt) break;
    s += a * rausch(p);
    p = r * p;
    a *= 0.5;
  }
  return s;
}
// Zellulaeres Rauschen (Worley): Abstand zum naechsten Zufallspunkt.
// Invertiert ergibt es runde Kuppen - die Blumenkohlform von Haufenwolken.
float zellen(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float m = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y);
    vec2 r = o + vec2(hash(i + o), hash(i + o + 17.3)) - f;
    m = min(m, dot(r, r));
  }
  return sqrt(m);
}
// Quellende Kuppen: zwei Zellgroessen uebereinander, etwas Rauschen fuer die Raender
float kuppen(vec2 p, int okt) {
  float k = (1.0 - zellen(p)) * 0.55 + (1.0 - zellen(p * 2.3 + 3.1)) * 0.3;
  return k * 0.75 + fbm(p * 1.7, max(okt - 2, 2)) * 0.45;
}

// Verwirbelte Dichte: macht aus Rauschen Wolkenformen
float dichte(vec2 p, int okt, float drift) {
  vec2 q = p;
  if (uVoll == 1) q += 1.4 * vec2(fbm(p + vec2(0.0, drift), 3), fbm(p + vec2(5.2, 1.3 - drift), 3));
  return fbm(q, okt);
}

mat3 drehX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 drehY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 drehZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }

vec3 himmelsfarbe(vec3 rd) {
  float h = rd.y;
  vec3 c = mix(uHorizont, uZenit, 1.0 - exp(-max(h, 0.0) * 5.0));
  if (h < 0.0) c = mix(uHorizont, uDunst, clamp(-h * 3.0, 0.0, 1.0));
  float sd = max(dot(rd, uSonne), 0.0);
  c += uSonnenFarbe * (pow(sd, 5.0) * 0.22 + pow(sd, 48.0) * 0.55);
  c += uSonnenFarbe * smoothstep(0.9990, 0.9994, sd) * 2.2;
  // Gewittertuerme: eine dunkle, gebuckelte Wand ueber dem Horizont
  if (uWand > 0.0) {
    float az = atan(rd.x, rd.z);
    float wand = uWand * (0.1 + 0.26 * fbm(vec2(az * 2.4, 1.7), 5) + 0.09 * (1.0 - zellen(vec2(az * 7.0, 0.5))));
    float in_wand = smoothstep(wand, wand - 0.015, h) * step(-0.05, h);
    vec3 wandFarbe = mix(uWolkeDunkel, uWolkeHell * 0.55, smoothstep(wand - 0.06, wand, h) * 0.7);
    wandFarbe += uSonnenFarbe * pow(max(dot(rd, uSonne), 0.0), 8.0) * 0.4;
    c = mix(c, wandFarbe, in_wand);
  }
  // Gluehender Horizont bei Waerme, klarer kalter Saum bei Distanz
  // Die Glut ist so stark, wie der Himmel hell ist - nachts nur ein Hauch
  vec3 glut = vec3(1.0, 0.42, 0.14);
  float tag = clamp(dot(uHorizont, vec3(0.3, 0.59, 0.11)) * 3.0, 0.08, 1.0);
  c += glut * uWaerme * exp(-abs(h) * 6.0) * 0.6 * tag;
  c += vec3(0.25, 0.45, 0.8) * (1.0 - uWaerme) * exp(-abs(h) * 14.0) * 0.12;
  // Sterne in der Nacht
  if (uSterne > 0.0 && h > 0.0) {
    vec2 sp = rd.xz / (rd.y + 0.3) * 180.0;
    vec2 zelle = floor(sp), lage = fract(sp) - 0.5;
    float st = step(0.9975, hash(zelle)) * smoothstep(0.0, 0.25, h) * smoothstep(0.35, 0.0, length(lage));
    c += vec3(st) * uSterne * (0.6 + 0.4 * sin(uZeit * 3.0 + hash(floor(sp)) * 40.0));
  }
  return c;
}

// Eine Wolkenschicht als Ebene in Hoehe hoehe. Gibt Farbe und Deckkraft.
// Unter uns (hoehe < 0) wird die Dichte als Hoehenfeld gelesen: aus ihrem
// Gefaelle entsteht eine Oberflaeche, die die Sonne beleuchtet - so bekommen
// die Wolkenkuppen Relief. Ueber uns faellt das Licht durch duenne Stellen.
vec4 schicht(vec3 rd, float hoehe, float massstab, float tempo, float bedeckung, float deck, float streck, vec3 grund, int relief) {
  if (rd.y * hoehe <= 0.0 || abs(rd.y) < 0.004) return vec4(0.0);
  float t = hoehe / rd.y;
  vec2 p = rd.xz * t + vec2(0.0, uFlug * tempo);
  p.x *= streck;
  p *= massstab;
  float drift = uZeit * 0.02;
  float d = relief == 1 ? kuppen(p + vec2(drift, 0.0), uOktaven) : dichte(p, uOktaven, drift);
  float schwelle = 1.0 - bedeckung;
  float c = smoothstep(schwelle - 0.05, schwelle + 0.18, d);
  if (c <= 0.001) return vec4(0.0);
  float sd = max(dot(rd, uSonne), 0.0);
  vec3 col;
  if (relief == 1) {
    // Hoehenfeld: Normale aus dem Gefaelle der Dichte
    float e = 0.06;
    int okt = max(uOktaven - 1, 3);
    vec2 q = p + vec2(drift, 0.0);
    float dx = kuppen(q + vec2(e, 0.0), okt) - kuppen(q - vec2(e, 0.0), okt);
    float dz = kuppen(q + vec2(0.0, e), okt) - kuppen(q - vec2(0.0, e), okt);
    vec3 n = normalize(vec3(-dx * 10.0, 1.0, -dz * 10.0));
    // Flacher Sonnenstand gibt lange Schatten; die Sonne wird fuer das
    // Relief etwas abgesenkt, damit auch mittags Formen entstehen
    vec3 L = normalize(vec3(uSonne.x, min(uSonne.y, 0.45), uSonne.z));
    float lambert = clamp(dot(n, L), 0.0, 1.0);
    // Taeler zwischen den Kuppen liegen im Schatten
    float tal = smoothstep(schwelle - 0.02, schwelle + 0.5, d);
    float licht = (lambert * 0.8 + 0.2) * mix(0.3, 1.0, tal);
    col = mix(uWolkeDunkel, uWolkeHell, licht);
    col += uZenit * (1.0 - licht) * 0.35;                          // Himmelsblau in den Schatten
    col += uSonnenFarbe * pow(lambert, 8.0) * 0.3;
  } else {
    // Von unten: Licht faellt durch duenne Stellen (Beer-Lambert-Annaeherung)
    vec2 ls = normalize(uSonne.xz + 1e-4) * 0.18;
    float d2 = dichte(p + ls, max(uOktaven - 2, 2), drift);
    float dick = max(d + d2 - 2.0 * schwelle, 0.0);
    float durch = exp(-dick * 5.0);
    col = mix(uWolkeDunkel, uWolkeHell, clamp(durch * 0.85 + 0.1, 0.0, 1.0));
    col += uSonnenFarbe * pow(sd, 3.0) * durch * 1.2;               // Silberrand im Gegenlicht
  }
  col = mix(col, col * vec3(1.3, 0.85, 0.6), uWaerme * 0.4);       // Glut faerbt die Wolken
  // Ferne Wolken gehen in den Dunst ueber - spaet, damit die Formen bleiben
  float nebel = 1.0 - exp(-abs(t) * 0.022);
  col = mix(col, grund, nebel);
  return vec4(col, c * deck * (1.0 - nebel * 0.5));
}

// Das Wolkenmeer als Hoehenrelief, abgetastet wie eine Landschaft: Der
// Blickstrahl laeuft schrittweise durch die Wolkenschicht, bis er auf eine
// Kuppe trifft. Billiger als Volumen-Raymarching, aber mit echten
// Silhouetten am Horizont und Verdeckung.
const float OBEN = -0.75, UNTEN = -1.55;
float relief(vec2 xz) {
  vec2 p = (xz + vec2(0.0, uFlug)) * 0.38 + vec2(uZeit * 0.02, 0.0);
  float k = kuppen(p, uOktaven);
  return UNTEN + (OBEN - UNTEN) * smoothstep(0.25, 1.05, k);
}
vec4 wolkenmeer(vec3 rd, vec3 grund, vec3 dunst) {
  if (rd.y >= -0.002) return vec4(0.0);
  // Weiche Wolken statt harter Flaeche: entlang des Strahls wird Dichte
  // aufgesammelt, die unter der Kuppenoberflaeche weich ansteigt. Jede
  // Probe bekommt Licht nach Hoehe und einen Blick Richtung Sonne.
  float t0 = OBEN / rd.y, t1 = UNTEN / rd.y;
  float dt = (t1 - t0) / 40.0;
  vec3 L = normalize(vec3(uSonne.x, min(uSonne.y, 0.5), uSonne.z));
  vec2 lv = normalize(L.xz + 1e-4) * 0.12;
  float sd = max(dot(rd, uSonne), 0.0);
  vec3 summe = vec3(0.0);
  float T = 1.0, tTreffer = t1;
  // Zufaelliger Versatz je Pixel: aus den Treppenlinien der Abtastung wird
  // unsichtbares Rauschen
  // Interleaved Gradient Noise: gleichmaessiger als Zufall, wirkt wie feines Korn
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t = t0 + dt * ign;
  for (int i = 0; i < 40; i++) {
    vec3 p = rd * t;
    float h = relief(p.xz);
    float dichteHier = clamp((h - p.y) / 0.22, 0.0, 1.0);
    if (dichteHier > 0.0) {
      if (T > 0.98) tTreffer = t;
      // Eigenschatten: steht Richtung Sonne eine hoehere Kuppe, liegt man im Schatten
      float hs = relief(p.xz + lv);
      float schatten = clamp(1.0 - (hs - h) * 6.0, 0.25, 1.0);
      float hoehe = clamp((p.y - UNTEN) / (OBEN - UNTEN), 0.0, 1.0);
      float licht = schatten * mix(0.35, 1.0, hoehe) * (1.0 - dichteHier * 0.35);
      vec3 c = mix(uWolkeDunkel, uWolkeHell, licht);
      c += uZenit * (1.0 - licht) * 0.25;
      c += uSonnenFarbe * pow(sd, 5.0) * (1.0 - dichteHier) * 0.8;   // Gegenlicht an den Raendern
      float a = 1.0 - exp(-dichteHier * dt * 9.0);
      summe += T * a * c;
      T *= 1.0 - a;
      if (T < 0.03) break;
    }
    t += dt * (0.7 + float(i) * 0.03);
    if (t > t1) break;
  }
  // Was durchscheint und was fern liegt, geht in die Himmelsfarbe am Horizont ueber
  vec3 col = summe + T * mix(dunst, grund, 0.5);
  col = mix(col, col * vec3(1.3, 0.85, 0.6), uWaerme * 0.4);
  float nebel = 1.0 - exp(-tTreffer * 0.03);
  col = mix(col, mix(dunst, grund, 0.6), nebel);
  return vec4(col, 1.0);
}

vec3 tonemap(vec3 x) {
  // ACES-Annaeherung: weiche Lichter statt harter Kanten
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uAufl) / uAufl.y;
  vec3 rd = normalize(vec3(uv, 1.35));
  rd = drehY(uKamera.x) * drehX(uKamera.y) * drehZ(uKamera.z) * rd;

  vec3 grund = himmelsfarbe(rd);
  vec3 col = grund;
  vec3 dunst = mix(uHorizont, uDunst, 0.5);
  vec4 s;

  // Ueber uns: Zirren (fern), Haufenwolken, Nebelfetzen (nah)
  if (uVoll == 1) {
    s = schicht(rd, 7.0, 0.05, 0.15, uBedeckung * 0.7, 0.6, 0.25, grund, 0);
    col = mix(col, s.rgb, s.a);
  }
  s = schicht(rd, 1.7, 0.3, 0.5, uBedeckung * 0.9, 0.97, 1.0, dunst, 0);
  col = mix(col, s.rgb, s.a);
  // Unter uns: das Wolkenmeer - hoch als abgetastetes Relief, niedrig als Ebene
  if (uVoll == 1) s = wolkenmeer(rd, grund, dunst);
  else s = schicht(rd, -1.3, 0.38, 1.0, clamp(uBedeckung + 0.3, 0.0, 0.95), 1.0, 1.0, dunst, 1);
  col = mix(col, s.rgb, s.a);
  if (uVoll == 1) {
    s = schicht(rd, -0.22, 1.3, 4.0, uBedeckung * 0.45, 0.3, 1.0, dunst, 0);
    col = mix(col, s.rgb, s.a);
    s = schicht(rd, 0.3, 1.1, 3.4, uBedeckung * 0.35, 0.2, 1.0, dunst, 0);
    col = mix(col, s.rgb, s.a);
  }

  // Kaelte entsaettigt ins Blaue, Waerme legt einen Bernsteinschleier darueber
  float l = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, l * vec3(0.82, 0.95, 1.18), (1.0 - uWaerme) * 0.2);
  col *= mix(vec3(1.0), vec3(1.12, 0.98, 0.84), uWaerme * 0.6);

  col = tonemap(col * 1.1);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.35);            // etwas Kontrast
  vec2 v = gl_FragCoord.xy / uAufl - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;                               // Vignette
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy + uZeit) - 0.5) / 255.0;          // gegen Farbstufen
  ausgabe = vec4(col, 1.0);
}`;

function shader(gl, typ, quelle) {
  const s = gl.createShader(typ);
  gl.shaderSource(s, quelle);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

/** Legt den Himmel auf `canvas` an. Gibt null zurueck, wenn WebGL2 fehlt. */
export function himmelErstellen(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindVertexArray(gl.createVertexArray());
  const u = {};
  for (const n of ["uAufl", "uZeit", "uFlug", "uKamera", "uSonne", "uZenit", "uHorizont", "uSonnenFarbe",
    "uWolkeHell", "uWolkeDunkel", "uDunst", "uBedeckung", "uSterne", "uWaerme", "uOktaven", "uVoll", "uWand"]) u[n] = gl.getUniformLocation(prog, n);

  return {
    gl,
    /** Zeichnet ein Bild. st = Stimmung (Farben, Sonne, Bedeckung), q = Qualitaet. */
    zeichnen(st, zeit, flug, kamera, q) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uAufl, canvas.width, canvas.height);
      gl.uniform1f(u.uZeit, zeit);
      gl.uniform1f(u.uFlug, flug);
      gl.uniform3f(u.uKamera, kamera[0], kamera[1], kamera[2]);
      gl.uniform3fv(u.uSonne, st.sonne);
      for (const k of ["zenit", "horizont", "sonnenFarbe", "wolkeHell", "wolkeDunkel", "dunst"]) {
        gl.uniform3fv(u["u" + k[0].toUpperCase() + k.slice(1)], st[k]);
      }
      gl.uniform1f(u.uBedeckung, st.bedeckung);
      gl.uniform1f(u.uSterne, st.sterne || 0);
      gl.uniform1f(u.uWand, st.wand || 0);
      gl.uniform1f(u.uWaerme, st.waerme);
      gl.uniform1i(u.uOktaven, q.oktaven);
      gl.uniform1i(u.uVoll, q.voll ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}

/** Die beiden Qualitaetsstufen. skala = Anteil der Bildschirmaufloesung. */
export const QUALITAET = {
  hoch:    { name: "hoch",    skala: 0.75, oktaven: 6, voll: true },
  niedrig: { name: "niedrig", skala: 0.45, oktaven: 4, voll: false }
};

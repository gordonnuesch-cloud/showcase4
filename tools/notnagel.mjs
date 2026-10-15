// Der Notnagel: derselbe Text wie im Canvas, als schlichtes HTML. Er entsteht
// beim Bauen aus den Daten, steht unsichtbar in der Seite (fuer Vorleseprogramme
// und falls das Bild nicht kommt) und wird nie von Hand gepflegt.

import { EINSAETZE } from "../src/data/einsaetze.js";
import { TITEL, SZENEN, AUSGAENGE } from "../src/data/szenen.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s) => `<p>${esc(s)}</p>`;
const wahl = (links, rechts) => `<ul><li>${esc(links.wahl)}: ${esc(links.folge)}</li><li>${esc(rechts.wahl)}: ${esc(rechts.folge)}</li></ul>`;

export function notnagel() {
  const teile = [`<h1>${esc(TITEL.name)}</h1>`, ...TITEL.absaetze.map(p)];
  EINSAETZE.forEach((d, i) => {
    teile.push(`<h2>${esc(d.titel)}</h2>`, p(d.auftrag));
    for (const x of d.ablauf) {
      if (x.text && x.wer !== "hinweis") teile.push(p(x.wer === "vey" ? `Hauptfrau Vey: »${x.text}«` : x.text));
      if (x.moment) teile.push(p(x.moment.lage), wahl(x.moment.distanz, x.moment.naehe));
    }
    const sz = SZENEN[i];
    if (!sz) return;
    teile.push(`<h3>${esc(sz.ort)}</h3>`, ...sz.absaetze.map(p));
    if (sz.tuer) teile.push(p(sz.tuer.lage), wahl(sz.tuer.distanz, sz.tuer.naehe));
    teile.push(p(sz.ruhig), p(sz.entdeckt.text), wahl(sz.entdeckt.distanz, sz.entdeckt.deckt));
  });
  teile.push("<h2>Ausgänge</h2>");
  for (const a of Object.values(AUSGAENGE)) teile.push(`<h3>${esc(a.titel)}</h3>`, ...a.absaetze.map(p));
  return `<article id="notnagel" class="notnagel" lang="de">${teile.join("\n")}</article>`;
}

// Titel, Zwischenszenen und Ausgaenge als reine Daten.
//
// Eine Zwischenszene: Ort, Absaetze, die man nacheinander aufdeckt, optional
// eine eigene Entscheidung (tuer), dann die Probe auf Entdeckung. Wird man
// entdeckt, gibt es zwei Auswege: Tamsin deckt dich, oder du zeigst Distanz.
// wachsam: ein Absatz, der nur bei hohem Verdacht erscheint - die Welt sieht genauer hin.

export const TITEL = {
  name: "Schwingen",
  absaetze: [
    "Im Sturmregiment gilt das Gesetz der Horste: Reiterin und Drache sind gebunden, im Dienst und nicht darüber hinaus. Wer es bricht, stirbt.",
    "Dein Drache heißt Ilvar. Er ist nicht nur ein Drache."
  ],
  bedienung: "Lenken mit den Pfeiltasten oder mit Maus und Finger: dorthin drücken, wohin es gehen soll. Manchmal hält die Zeit an: links Distanz, rechts Nähe.",
  weiter: "Beginnen: Leertaste oder Tippen"
};

export const SZENEN = [
  {
    ort: "Die Horste, am Abend",
    absaetze: [
      "Tamsin Rheel wartet an der Mauer, auf der sie heute Morgen stand. Sie putzt einen Sattel, der schon sauber ist.",
      "»Ihr wart lange draußen«, sagt sie. »Für eine Patrouille.«"
    ],
    entdeckt: {
      text: "»Ich habe gesehen, wie ihr gelandet seid. Wie er den Flügel hält, damit du absteigen kannst. So hält man keinen Flügel für eine Reiterin.«",
      deckt: { wahl: "Tamsin ins Vertrauen ziehen", folge: "Tamsin sieht dich lange an. »Ich habe nichts gesehen. Diesmal.«" },
      distanz: { wahl: "Es abtun: Dienst ist Dienst", folge: "»Er ist ein Drache, ich bin seine Reiterin.« Du sagst es laut genug, dass die Stallwache es hört. Er hört es auch." }
    },
    ruhig: "Sie nickt, als hätte sie eine andere Antwort erwartet, und geht. Der Sattel bleibt liegen.",
    wachsam: "Auf dem Wehrgang stehen heute mehr Wachen als sonst."
  },
  {
    ort: "Die Horste, früh am Morgen",
    absaetze: [
      "Inspektion. Hauptfrau Vey geht die Reihe der Horste ab, mit einem Schreiber und einer Laterne, obwohl es hell ist.",
      "Sie sieht sich jeden Drachen an, jeden Sattel, jede Narbe. Vor eurem Horst bleibt sie länger stehen als vor den anderen."
    ],
    narben: "Sie zählt die Narben an seiner Flanke. Sie zählt sie zweimal.",
    entdeckt: {
      text: "»Er hat dir Platz gemacht, bevor du gekommen bist«, sagt sie. »Drachen tun das nicht für Reiterinnen.« Sie spricht nicht weiter.",
      deckt: { wahl: "Tamsin für dich sprechen lassen", folge: "Tamsin tritt vor: Sie habe ihn so abgerichtet, für die Formation. Vey schreibt es auf. Tamsin sieht dich nicht an." },
      distanz: { wahl: "Ihn vor allen zurechtweisen", folge: "Du weist ihn scharf zurecht, vor der ganzen Reihe. Er senkt den Kopf. Vey geht weiter." }
    },
    ruhig: "Vey nickt dem Schreiber zu und geht weiter. Erst als sie um die Ecke ist, merkst du, dass du die Luft angehalten hast.",
    wachsam: "Der Schreiber hat eine zweite Liste dabei. Euer Horst steht darauf."
  },
  {
    ort: "Das Zelt der Hauptfrau, nachts",
    absaetze: [
      "Vey lässt dich rufen. Auf ihrem Tisch liegt eine Karte des Passes, daneben das Buch, in das die Wache die Zeiten schreibt.",
      "»Durch die Front ohne einen Verlust«, sagt sie. »Das schafft man mit Können. Oder mit etwas anderem.«"
    ],
    entdeckt: {
      text: "Sie schlägt das Buch auf. »Ich frage dich nur einmal. Was ist er für dich?«",
      deckt: { wahl: "Tamsin als Zeugin nennen", folge: "Tamsin wird geholt und bezeugt, was du brauchst. Vey schreibt nichts auf. Das ist schlimmer." },
      distanz: { wahl: "»Ein Drache des Regiments.«", folge: "»Ein Drache des Regiments, Hauptfrau.« Sie sieht dich an, bis du wegsiehst. Dann lässt sie dich gehen." }
    },
    ruhig: "»Gut geflogen«, sagt sie und lässt das Buch zu. »Geh schlafen.«",
    wachsam: "Vor dem Zelt stehen zwei Wachen, wo sonst keine steht."
  },
  {
    ort: "Das Lager, nach Mitternacht",
    absaetze: [
      "Das Lager schläft. Draußen knirscht Kies, dann ist es still.",
      "Vor dem Zelt steht jemand. Kein Drache. Ein Mann, barfuß im Mondlicht, und du weißt, wer er ist, bevor du ihn ansiehst."
    ],
    tuer: {
      zeugen: "lager",
      lage: "Er sagt nichts. Er wartet.",
      distanz: { wahl: "Die Plane geschlossen lassen", folge: "Du lässt die Plane zu. Nach einer Weile knirscht der Kies wieder, leiser." },
      naehe: { wahl: "Die Plane zurückschlagen", folge: "Du schlägst die Plane zurück. Die Lampe geht aus." }
    },
    entdeckt: {
      text: "Am Morgen steht die Wache vor deinem Zelt. Sie hat in der Nacht etwas gesehen. Oder jemanden.",
      deckt: { wahl: "Tamsin sagen lassen, sie sei es gewesen", folge: "Tamsin sagt, sie habe nicht schlafen können und sei bei dir gewesen. Die Wache glaubt ihr. Oder tut so." },
      distanz: { wahl: "Vor der Wache über Drachen spotten", folge: "Du sagst etwas über Drachen, das man im Lager gern hört. Die Wache lacht. Irgendwo hört er es." }
    },
    ruhig: "Am Morgen ist der Kies vor deinem Zelt glatt gerecht. Niemand fragt.",
    wachsam: "Die Wachfeuer brennen heller als sonst. Jemand hat Holz nachgelegt.",
    bemerkt: "Irgendwo im Lager geht eine Laterne an."
  }
];

export const AUSGAENGE = {
  grenze: {
    titel: "Über die Grenze",
    absaetze: [
      "Nach der Schlacht fliegt ihr nicht zurück. Über die Linie, über die Berge, über alles hinaus, was ihr kennt.",
      "Man wird euch suchen. Er weiß das. Du auch.",
      "Über einem fremden Meer geht die Sonne auf. Zum ersten Mal fliegst du, ohne dich umzusehen."
    ]
  },
  geheimnis: {
    titel: "Das Geheimnis hält",
    absaetze: [
      "Die Linie ist verschoben, das Regiment feiert. Vey heftet dir eine Spange an und sieht dabei an dir vorbei.",
      "Niemand weiß es. Ihr wisst es.",
      "Nachts, wenn das Lager schläft, knirscht manchmal Kies."
    ]
  },
  tribunal: {
    titel: "Das Tribunal",
    absaetze: [
      "Sie holen dich vor Sonnenaufgang. Auf dem Tisch liegt das Buch der Wache, aufgeschlagen.",
      "Der Verdacht hat gereicht. Was ihr hattet, hat nicht gereicht, um ihm zuvorzukommen.",
      "Vom Horst her hörst du ihn. Dann hörst du nichts mehr."
    ]
  },
  pflicht: {
    titel: "Pflicht",
    absaetze: [
      "Die Schlacht ist gewonnen. Du wirst ausgezeichnet, für Disziplin.",
      "Er trägt dich weiter, jeden Einsatz, zuverlässig. Aber er dreht den Kopf nicht mehr nach dir.",
      "Manchmal glaubst du, das sei richtig so."
    ]
  },
  sturz: {
    titel: "Der Sturz",
    absaetze: [
      "Im entscheidenden Moment zieht er nach, einen Herzschlag zu spät.",
      "Die Bindung war nicht stark genug, um aufzufangen, was fällt.",
      "Das Regiment gewinnt die Schlacht. Beim Appell nennt man euch beide."
    ]
  }
};

export const NOCHMAL = "Noch einmal fliegen: Leertaste oder Tippen";

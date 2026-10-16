// Die fuenf Einsaetze als reine Daten. Zeiten in Sekunden Einsatzuhr; die Uhr
// steht still, solange ein Moment offen ist.
//
//   { t, text, wer? }              eine Zeile. wer: "ilvar" (nur sie hoert ihn),
//                                  "vey" (Funk der Hauptfrau), "hinweis" (Bedienung)
//   { t, hindernis, versatz }      Gefahr, die bei t ankommt. versatz: wo die
//                                  Luecke liegt, relativ zum Kurs beim Auftauchen
//                                  (nur seitliche Hindernisse)
//   { t, moment: {...} }           Distanz halten oder Naehe zulassen
//
// Optional je Einsatz: regen (Stuetzpunkte), wetterleuchten (ferne Blitze).
//
// Zeugen bestimmen, wie viel Verdacht Naehe kostet (siehe einsatz.js).

// Zwei Arten auszuweichen:
//   seitlich  (Felsen, Blitze): eine Luecke, die wandert, waehrend die Gefahr
//             naeherkommt. Wer nachzieht, verliert sie. weite: Ausschlag
//             (Bogenmass), takt: Kreisfrequenz.
//   hoch      (Pfeile): Ballisten schiessen aus den Wolken; nur wer um stufe
//             steigt, ist ueber der Salve. Die Salve steigt und faellt dabei.
//   tief      (Reiter): sie fliegen auf eurer Hoehe; nur wer um stufe abtaucht,
//             dicht ueber die Wolken, bleibt ungesehen. Auch sie wechseln die Hoehe.
//   Eine Staffel (Reiter in der Schlacht) weicht man seitlich aus.
// Auch hoch und runter folgt der Drache mit Verzoegerung - je nach Bindung.
export const HINDERNISSE = {
  felsen: { art: "seitlich", vorlauf: 5.5, toleranz: 0.23, weite: 0.13, takt: 1.3 },
  blitz: { art: "seitlich", vorlauf: 4.5, toleranz: 0.22, weite: 0.19, takt: 1.9 },
  pfeile: { art: "hoch", vorlauf: 3.4, stufe: 0.75, toleranz: 0.06, weite: 0.15, takt: 1.7 },
  reiter: { art: "tief", vorlauf: 3.4, stufe: 0.75, toleranz: 0.06, weite: 0.15, takt: 1.5 },
  // In der Schlacht kreuzen die Reiter in Formation: dort hilft nur die Luecke
  staffel: { art: "seitlich", vorlauf: 5, toleranz: 0.22, weite: 0.18, takt: 1.7 }
};

export const EINSAETZE = [
  {
    titel: "Morgengrauen über den Klippen",
    auftrag: "Patrouille entlang der Klippen. Beobachten und melden, nicht eingreifen.",
    dauer: 130,
    ablauf: [
      { t: 2, text: "Die Klippen liegen noch im Schatten. Unter dir atmet er langsam und gleichmäßig." },
      { t: 8, text: "Lenken: Pfeiltasten, oder dorthin drücken, wohin es gehen soll.", wer: "hinweis" },
      { t: 14, text: "Du hältst die Zügel zu fest. Ich lasse dich nicht fallen.", wer: "ilvar" },
      { t: 20, text: "Er hat es nicht laut gesagt. Er sagt nie etwas laut." },
      { t: 26, text: "Felsnadeln voraus. Lenke in die Lücke.", wer: "hinweis" },
      { t: 31, hindernis: "felsen", versatz: 0.35 },
      { t: 42, hindernis: "felsen", versatz: -0.45 },
      { t: 50, moment: {
        zeugen: "allein",
        lage: "Eine Böe reißt dich aus dem Sattel. Einen Herzschlag lang hält dich nur der Gurt.",
        distanz: { wahl: "Den Gurt nachziehen", folge: "Zwei Löcher enger, wie es die Vorschrift will. Er sagt nichts." },
        naehe: { wahl: "Die Hand auf seine Schuppen legen", folge: "Unter deiner Hand wird es warm. Er fliegt ruhiger, ohne dass du lenkst." }
      } },
      { t: 60, hindernis: "felsen", versatz: 0.55 },
      { t: 68, text: "Die Nebelbank im Norden. Da ist etwas.", wer: "ilvar" },
      { t: 76, hindernis: "felsen", versatz: -0.3 },
      { t: 86, hindernis: "felsen", versatz: 0.5 },
      { t: 94, moment: {
        zeugen: "allein",
        lage: "Auf dem Rückweg geht die Sonne auf. Er dreht den Kopf, gerade so weit, dass er dich sehen könnte.",
        distanz: { wahl: "Nach vorn sehen", folge: "Du siehst nach vorn, auf die Linie. Nach einer Weile tut er es auch." },
        naehe: { wahl: "Seinen Blick erwidern", folge: "Ihr seht euch an, länger als nötig. Über den Klippen ist niemand." }
      } },
      { t: 106, hindernis: "felsen", versatz: -0.5 },
      { t: 116, text: "Die Horste kommen in Sicht. Auf der Mauer steht jemand und sieht herauf." }
    ]
  },
  {
    titel: "Mittag über dem Wolkenmeer",
    auftrag: "Eskorte für den Kurier. Sechs Drachen im Keil, du fliegst links außen.",
    dauer: 134,
    ablauf: [
      { t: 2, text: "Die Sonne steht hoch. Keine Schatten, nirgends ein Versteck." },
      { t: 9, text: "Abstand halten. Ich will Lücken sehen.", wer: "vey" },
      { t: 16, text: "Sie sieht oft nach hinten.", wer: "ilvar" },
      { t: 22, text: "Ballisten unter den Wolken. Steig über die Salven: Pfeil nach oben, oder oben ins Bild drücken.", wer: "hinweis" },
      { t: 27, hindernis: "pfeile", versatz: 0.4 },
      { t: 36, hindernis: "pfeile", versatz: -0.5 },
      { t: 43, moment: {
        zeugen: "formation",
        lage: "Er schiebt sich an dich heran, näher als an die Formation. Ein Fehler, den man bemerken kann.",
        distanz: { wahl: "Ihn auf Abstand lenken", folge: "Er gehorcht, einen Takt zu spät." },
        naehe: { wahl: "Es geschehen lassen", folge: "Du lässt es geschehen. Tamsin, zwei Plätze weiter, wendet den Kopf ab." }
      } },
      { t: 55, hindernis: "pfeile", versatz: 0.6 },
      { t: 64, hindernis: "pfeile", versatz: -0.35 },
      { t: 71, text: "Der Kurier sackt ab. Die Formation zieht sich zusammen." },
      { t: 78, moment: {
        zeugen: "formation",
        lage: "Ein Bolzen streift seine Flanke. Du spürst es in der eigenen Schulter, bevor du es siehst.",
        distanz: { wahl: "Weiterfliegen, als wäre nichts", folge: "Du fliegst weiter. Die Schulter brennt bis zum Abend." },
        naehe: { wahl: "Nach der Wunde tasten", folge: "Deine Hand findet die Stelle sofort. Hinter dir fliegt die ganze Formation." }
      } },
      { t: 90, hindernis: "pfeile", versatz: 0.5 },
      { t: 99, hindernis: "pfeile", versatz: -0.6 },
      { t: 108, moment: {
        zeugen: "formation",
        lage: "Der Kurier ist durch, die Formation löst sich. Einen Augenblick lang fliegt ihr allein im Licht.",
        distanz: { wahl: "Wieder einreihen", folge: "Du reihst dich ein. Die Hauptfrau nickt, einmal." },
        naehe: { wahl: "Einen Bogen fliegen, nur einen", folge: "Ein weiter, langsamer Bogen über dem Wolkenmeer. Niemand fragt danach. Noch nicht." }
      } },
      { t: 122, text: "Zurück am Horst. Vey notiert etwas, bevor sie absteigt." }
    ]
  },
  {
    titel: "Gewitterfront am Abend",
    auftrag: "Durchbruch durch die Front über dem Pass. Dahinter liegt der Nachschub des Feindes.",
    dauer: 128,
    // Regen als Stuetzpunkte [Sekunde, Staerke]; dazwischen wird gemischt
    regen: [[0, 0.15], [20, 0.4], [40, 1], [88, 1], [93, 0.08], [128, 0]],
    wetterleuchten: true,
    ablauf: [
      { t: 2, text: "Die Front steht wie eine Wand. Darin wandert das Licht." },
      { t: 9, text: "Durch die Front oder gar nicht. Wer umdreht, erklärt es mir.", wer: "vey" },
      { t: 15, text: "Halt dich fest. Und lass mich sehen.", wer: "ilvar" },
      { t: 21, text: "Blitze. Flieg dorthin, wo es dunkel bleibt.", wer: "hinweis" },
      { t: 26, hindernis: "blitz", versatz: 0.3 },
      { t: 34, hindernis: "blitz", versatz: -0.45 },
      { t: 42, hindernis: "blitz", versatz: 0.5 },
      { t: 49, moment: {
        zeugen: "allein",
        lage: "Der Regen nimmt dir die Sicht. Du siehst nichts mehr. Er schon.",
        distanz: { wahl: "Nach Kompass und Vorschrift fliegen", folge: "Kompass, Höhe, ein Gefühl für den Wind. Es reicht, gerade so." },
        naehe: { wahl: "Die Augen schließen und ihm folgen", folge: "Du schließt die Augen. Er fliegt, als wäre der Himmel leer." }
      } },
      { t: 60, hindernis: "blitz", versatz: -0.55 },
      { t: 68, hindernis: "blitz", versatz: 0.4 },
      { t: 76, hindernis: "blitz", versatz: -0.3 },
      { t: 84, hindernis: "blitz", versatz: 0.6 },
      { t: 92, moment: {
        zeugen: "formation",
        lage: "Hinter der Front ist es plötzlich still. Er zittert, du spürst es durch den Sattel.",
        distanz: { wahl: "Den Durchbruch melden", folge: "Du meldest. Irgendwann hört das Zittern auf." },
        naehe: { wahl: "Leise mit ihm reden", folge: "Was du sagst, hört nur er. Die anderen sehen, dass du dich vorbeugst." }
      } },
      { t: 104, hindernis: "blitz", versatz: 0.45 },
      { t: 112, hindernis: "blitz", versatz: -0.5 },
      { t: 119, text: "Die Front zieht nach Osten ab. Hinter euch kommen die ersten Sterne." }
    ]
  },
  {
    titel: "Mondnacht hinter der Linie",
    auftrag: "Aufklärung hinter der Linie. Allein, ohne Licht, ohne Funk.",
    dauer: 120,
    ablauf: [
      { t: 2, text: "Nur das Geräusch der Flügel. Sonst nichts." },
      { t: 9, text: "So still war es lange nicht.", wer: "ilvar" },
      { t: 17, moment: {
        zeugen: "allein",
        lage: "Der Mond steht hoch. Niemand sieht euch hier oben, und ihr wisst es beide.",
        distanz: { wahl: "Schweigen", folge: "Ihr schweigt. Es ist ein gutes Schweigen, aber ein vorsichtiges." },
        naehe: { wahl: "Ihn fragen, wer er vorher war", folge: "Er antwortet lange nicht. Dann erzählt er von einem Haus am Wasser. Mehr nicht." }
      } },
      { t: 24, text: "Feindliche Reiter auf eurer Höhe. Tauch ab, dicht über die Wolken, bevor sie euch sehen.", wer: "hinweis" },
      { t: 30, hindernis: "reiter", versatz: 0.4 },
      { t: 40, hindernis: "reiter", versatz: -0.5 },
      { t: 50, hindernis: "reiter", versatz: 0.3 },
      { t: 57, text: "Feuer im Tal. Mehr Zelte, als gemeldet waren." },
      { t: 63, moment: {
        zeugen: "allein",
        lage: "Eine Patrouille zieht unter euch durch. Er legt sich flach in den Wind, und du liegst auf ihm.",
        distanz: { wahl: "Den Kopf senken, die Hände am Sattel", folge: "Sie ziehen vorbei. Deine Hände bleiben, wo sie hingehören." },
        naehe: { wahl: "Die Arme um seinen Hals legen", folge: "Sie ziehen vorbei. Du lässt nicht gleich los." }
      } },
      { t: 75, hindernis: "reiter", versatz: -0.6 },
      { t: 85, hindernis: "reiter", versatz: 0.5 },
      { t: 95, hindernis: "reiter", versatz: -0.35 },
      { t: 104, moment: {
        zeugen: "lager",
        lage: "Über dem eigenen Lager hält er in der Luft, ein langsamer Flügelschlag nach dem anderen. Unten brennen die Wachfeuer.",
        distanz: { wahl: "Landen", folge: "Ihr landet. Die Wache notiert die Zeit." },
        naehe: { wahl: "Noch eine Runde", folge: "Noch eine Runde, dann noch eine. Unten notiert die Wache die Zeit." }
      } },
      { t: 114, text: "Im Lager ist es dunkel. Bis auf ein Zelt." }
    ]
  },
  {
    titel: "Morgenrot vor der Schlacht",
    auftrag: "Das ganze Sturmregiment steigt auf. Heute wird die Linie verschoben.",
    dauer: 116,
    ablauf: [
      { t: 2, text: "Alle Staffeln in der Luft. So viele Flügel hast du noch nie gehört." },
      { t: 8, text: "Keiner fliegt heute für sich.", wer: "vey" },
      { t: 14, text: "Was auch passiert: Ich weiß, wo du bist.", wer: "ilvar" },
      { t: 21, hindernis: "pfeile", versatz: 0.4 },
      { t: 29, hindernis: "staffel", versatz: -0.5 },
      { t: 37, hindernis: "pfeile", versatz: 0.6 },
      { t: 45, hindernis: "staffel", versatz: -0.4 },
      { t: 52, moment: {
        zeugen: "formation",
        lage: "Tamsin ist getroffen, ihr Drache trudelt. Er wartet nicht auf einen Befehl. Er wartet auf dich.",
        distanz: { wahl: "Befehl: Formation halten", folge: "Er hält die Formation. Unter euch fängt sich Tamsin, knapp über den Wolken." },
        naehe: { wahl: "Ihn lassen", folge: "Er stürzt mit dir hinab, schneller als jeder Befehl, und fängt sie ab. Die halbe Staffel hat es gesehen." }
      } },
      { t: 64, hindernis: "pfeile", versatz: -0.55 },
      { t: 72, hindernis: "staffel", versatz: 0.5 },
      { t: 80, hindernis: "pfeile", versatz: -0.4 },
      { t: 88, hindernis: "staffel", versatz: 0.65 },
      { t: 96, moment: {
        zeugen: "formation",
        lage: "Die Linie hält. Es wird ruhig. Über dem Feld dreht er den Kopf zu dir, vor allen.",
        distanz: { wahl: "Wegsehen", folge: "Du siehst weg. Es ist das Schwerste, was du heute getan hast." },
        naehe: { wahl: "Hinsehen", folge: "Du siehst hin. Was danach kommt, kommt danach." }
      } },
      { t: 108, text: "Unter euch sammelt sich das Regiment zur Landung." }
    ]
  }
];

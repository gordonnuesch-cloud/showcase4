import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { notnagel } from "./tools/notnagel.mjs";

// Der Build buendelt alles in eine einzige dist/index.html.
// Das ist Absicht: Der Showcase soll ohne Server, ohne Installation
// und ohne externe Dateien laufen - genau das ist die Botschaft.
export default defineConfig({
  base: "./",
  plugins: [
    // Der ganze Text als verstecktes HTML, erzeugt aus denselben Daten
    { name: "notnagel", transformIndexHtml: (html) => html.replace("<!--notnagel-->", notnagel()) },
    viteSingleFile()
  ],
  build: {
    target: "es2022",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});

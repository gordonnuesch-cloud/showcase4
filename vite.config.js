import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Der Build buendelt alles in eine einzige dist/index.html.
// Das ist Absicht: Der Showcase soll ohne Server, ohne Installation
// und ohne externe Dateien laufen - genau das ist die Botschaft.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    target: "es2022",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});

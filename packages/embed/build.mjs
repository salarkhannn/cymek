import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: false,
  format: "iife",
  globalName: "Cymek",
  outfile: "dist/embed.js",
  sourcemap: true,
  platform: "browser",
  target: ["es2020"],
});

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "Cymek",
  outfile: "dist/embed.min.js",
  sourcemap: false,
  platform: "browser",
  target: ["es2020"],
});

console.log("✓ embed.js & embed.min.js built");

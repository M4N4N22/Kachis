import * as esbuild from "esbuild";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const outdir = join(__dirname, "dist");
const iconsSrc = join(__dirname, "icons");
const appRoot = join(__dirname, "..");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(join(outdir, "icons"), { recursive: true });

async function renderIcons() {
  const svg = readFileSync(join(iconsSrc, "icon.svg"));
  for (const size of [16, 48, 128]) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    writeFileSync(join(iconsSrc, `icon${size}.png`), png);
    writeFileSync(join(outdir, "icons", `icon${size}.png`), png);
  }
}

const common = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome120"],
  logLevel: "info",
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Resolve @huggingface/transformers from the Next app root.
  nodePaths: [join(appRoot, "node_modules")],
};

async function buildOnce() {
  await renderIcons();

  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, "src/background.ts")],
    outfile: join(outdir, "background.js"),
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, "src/content.ts")],
    outfile: join(outdir, "content.js"),
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, "src/options.ts")],
    outfile: join(outdir, "options.js"),
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, "src/popup.ts")],
    outfile: join(outdir, "popup.js"),
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(__dirname, "src/offscreen.ts")],
    outfile: join(outdir, "offscreen.js"),
    // Keep transformers internals that use dynamic require patterns.
    mainFields: ["browser", "module", "main"],
    conditions: ["browser", "import", "default"],
  });

  // ONNX Runtime assets must be packaged — MV3 CSP blocks CDN .mjs/.wasm.
  const ortOut = join(outdir, "ort");
  mkdirSync(ortOut, { recursive: true });
  const transformersDist = join(
    appRoot,
    "node_modules",
    "@huggingface",
    "transformers",
    "dist",
  );
  for (const name of [
    "ort-wasm-simd-threaded.jsep.mjs",
    "ort-wasm-simd-threaded.jsep.wasm",
  ]) {
    cpSync(join(transformersDist, name), join(ortOut, name));
  }

  cpSync(join(__dirname, "manifest.json"), join(outdir, "manifest.json"));
  cpSync(join(__dirname, "src/options.html"), join(outdir, "options.html"));
  cpSync(join(__dirname, "src/popup.html"), join(outdir, "popup.html"));
  cpSync(join(__dirname, "src/offscreen.html"), join(outdir, "offscreen.html"));
}

if (watch) {
  console.log("[kachis-extension] one-shot build (use rebuild for watch later)");
}
await buildOnce();
console.log("[kachis-extension] built → extension/dist");

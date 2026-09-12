import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const outdir = join(__dirname, "dist");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(join(outdir, "icons"), { recursive: true });

const common = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome120"],
  logLevel: "info",
};

async function buildOnce() {
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

  cpSync(join(__dirname, "manifest.json"), join(outdir, "manifest.json"));
  cpSync(join(__dirname, "src/options.html"), join(outdir, "options.html"));

  // Minimal placeholder PNG icons (1x1) so Chrome loads the package; replace before store.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W5W0AAAAASUVORK5CYII=",
    "base64",
  );
  for (const size of [16, 48, 128]) {
    writeFileSync(join(outdir, "icons", `icon${size}.png`), png);
  }
}

if (watch) {
  console.log("[kachis-extension] one-shot build (use rebuild for watch later)");
}
await buildOnce();
console.log("[kachis-extension] built → extension/dist");

import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, "icons", "icon.svg"));
const outDir = join(__dirname, "icons");
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(join(outDir, `icon${size}.png`), png);
}

console.log("[kachis-extension] icons → extension/icons");

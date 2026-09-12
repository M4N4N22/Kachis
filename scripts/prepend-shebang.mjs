/**
 * Ensure a single shebang on line 1 (esbuild --banner can double under some shells).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node prepend-shebang.mjs <file>");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), target);
let source = readFileSync(filePath, "utf8");
source = source.replace(/^(?:#!\/usr\/bin\/env node\r?\n)+/, "");
writeFileSync(filePath, `#!/usr/bin/env node\n${source}`, "utf8");

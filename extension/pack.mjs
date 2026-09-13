import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "dist");
const out = join(__dirname, "kachis-companion.zip");

try {
  statSync(join(dist, "manifest.json"));
} catch {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const packed = spawnSync("tar", ["-a", "-cf", out, "-C", dist, "."], {
  stdio: "inherit",
  shell: true,
});

if (packed.status !== 0) {
  console.error(
    "[kachis-extension] pack failed. Zip the contents of extension/dist manually for the store upload.",
  );
  process.exit(packed.status ?? 1);
}

console.log(`[kachis-extension] packed → ${out}`);

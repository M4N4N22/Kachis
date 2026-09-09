#!/usr/bin/env node
/**
 * Compile kachis-guardrail without --skip-zk.
 * Native Windows cannot run Midnight Compact; prefer WSL, else a local `compact compile`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "compact", "compile.sh").replaceAll("\\", "/");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
}

function wslAvailable() {
  const probe = spawnSync("wsl", ["-l", "-v"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) return false;
  const text = `${probe.stdout ?? ""}${probe.stderr ?? ""}`.replace(/\0/g, "");
  return /ubuntu|debian|linux/i.test(text);
}

const installHelp = [
  "Midnight Compact is not available on this machine.",
  "Windows: install WSL Ubuntu, then in that shell:",
  "  curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh",
  "  compact update 0.31.1",
  "  ./compact/compile.sh",
  "Linux/macOS: same installer, then npm run compact:compile.",
  "CI: .github/workflows/compact-compile.yml",
].join("\n");

if (process.platform === "win32") {
  if (wslAvailable()) {
    const wslPath = spawnSync("wsl", ["wslpath", "-a", script], { encoding: "utf8" });
    const posix = (wslPath.stdout ?? "").trim() || script;
    const result = run("wsl", ["-e", "bash", posix]);
    process.exit(result.status ?? 1);
  }
  console.error(installHelp);
  process.exit(1);
}

const result = run("bash", [script]);
process.exit(result.status ?? 1);

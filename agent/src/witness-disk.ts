import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { WitnessRecord } from "./witness-server.ts";

const SESSION_LIMIT = 64;

/**
 * Local disk cache for settle witnesses so Cursor MCP (stdio) and whichever
 * process bound :3847 share the same originals — originals never leave the machine.
 */
export function witnessDir(): string {
  const override = process.env.KACHIS_WITNESS_DIR?.trim();
  if (override) return override;
  return path.join(os.tmpdir(), "kachis-agent-witnesses");
}

function safeKey(cleanedHash: string): string {
  return cleanedHash.toLowerCase().replace(/[^a-f0-9x]/g, "_");
}

function fileFor(cleanedHash: string): string {
  return path.join(witnessDir(), `${safeKey(cleanedHash)}.json`);
}

export function persistWitness(record: WitnessRecord): void {
  const dir = witnessDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fileFor(record.cleanedHash), JSON.stringify(record), "utf8");
  pruneWitnessDir(dir);
}

export function readWitness(cleanedHash: string): WitnessRecord | null {
  try {
    const raw = fs.readFileSync(fileFor(cleanedHash), "utf8");
    const parsed = JSON.parse(raw) as WitnessRecord;
    if (
      !parsed?.originalHash ||
      !parsed?.cleanedHash ||
      !parsed?.binding ||
      parsed.cleanedHash.toLowerCase() !== cleanedHash.toLowerCase()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function countWitnessFiles(): number {
  try {
    return fs
      .readdirSync(witnessDir())
      .filter((name) => name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

function pruneWitnessDir(dir: string): void {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => {
        const full = path.join(dir, name);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    for (const stale of files.slice(SESSION_LIMIT)) {
      try {
        fs.unlinkSync(stale.full);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

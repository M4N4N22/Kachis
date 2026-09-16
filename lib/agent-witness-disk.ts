import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentWitness } from "@/lib/agent-witness";

/**
 * Same on-disk witness cache the MCP agent writes
 * (`os.tmpdir()/kachis-agent-witnesses` or `KACHIS_WITNESS_DIR`).
 * Used when the agent's HTTP bridge on :3847 is not listening
 * (common with Cursor MCP stdio hosts that drop the bind).
 */
export function witnessDiskDir(): string {
  const override = process.env.KACHIS_WITNESS_DIR?.trim();
  if (override) return override;
  return path.join(os.tmpdir(), "kachis-agent-witnesses");
}

function safeKey(cleanedHash: string): string {
  return cleanedHash.toLowerCase().replace(/[^a-f0-9x]/g, "_");
}

export function countDiskWitnesses(): number {
  try {
    return fs
      .readdirSync(witnessDiskDir())
      .filter((name) => name.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

export function readDiskWitness(cleanedHash: string): AgentWitness | null {
  try {
    const file = path.join(witnessDiskDir(), `${safeKey(cleanedHash)}.json`);
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as AgentWitness;
    if (
      !parsed?.originalHash ||
      !parsed?.cleanedHash ||
      !parsed?.binding ||
      parsed.cleanedHash.toLowerCase() !== cleanedHash.toLowerCase()
    ) {
      return null;
    }
    return {
      originalHash: parsed.originalHash,
      cleanedHash: parsed.cleanedHash,
      binding: parsed.binding,
      packFlags: parsed.packFlags,
      findings: parsed.findings,
      attestedAt: parsed.attestedAt,
    };
  } catch {
    return null;
  }
}

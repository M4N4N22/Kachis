import { bindingHex, sha256Hex } from "./commit";
import { sanitizeLocally } from "./scanner";
import {
  CIRCUIT_ID,
  packFlagsFromToggles,
  type GuardrailToggles,
  type ShieldResult,
} from "./types";

/**
 * Browser / MV3 path: rule packs only (no Transformers.js).
 * Full `runShield` with optional NER stays on Node (console + MCP).
 */
export async function runShieldLite(
  raw: string,
  toggles: GuardrailToggles,
): Promise<ShieldResult> {
  const { text, findings, tokenMap } = sanitizeLocally(raw, toggles);
  const originalHash = await sha256Hex(raw);
  const cleanedHash = await sha256Hex(text);
  const binding = await bindingHex(originalHash, cleanedHash);

  return {
    text,
    findings,
    tokenMap,
    packFlags: packFlagsFromToggles(toggles),
    cleanedHash,
    binding,
    circuit: CIRCUIT_ID,
    attestedAt: new Date().toISOString(),
  };
}

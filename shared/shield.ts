import { bindingHex, sha256Hex } from "./commit";
import { sanitizeLocally } from "./scanner";
import {
  CIRCUIT_ID,
  packFlagsFromToggles,
  type GuardrailToggles,
  type ShieldResult,
} from "./types";

export async function runShield(
  raw: string,
  toggles: GuardrailToggles,
): Promise<ShieldResult> {
  const { text, findings } = sanitizeLocally(raw, toggles);
  const originalHash = await sha256Hex(raw);
  const cleanedHash = await sha256Hex(text);
  const binding = await bindingHex(originalHash, cleanedHash);

  return {
    text,
    findings,
    packFlags: packFlagsFromToggles(toggles),
    cleanedHash,
    binding,
    circuit: CIRCUIT_ID,
    attestedAt: new Date().toISOString(),
  };
}

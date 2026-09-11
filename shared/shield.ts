import { bindingHex, sha256Hex } from "./commit";
import { detectNerHits } from "./ner";
import { sanitizeLocally, type ScanHit } from "./scanner";
import {
  CIRCUIT_ID,
  packFlagsFromToggles,
  type GuardrailToggles,
  type ShieldResult,
} from "./types";

export type RunShieldOptions = {
  /** Default true. Set false to force rule packs only. */
  ner?: boolean;
  /** Precomputed NER (or other) spans — skips a second detectNerHits call. */
  extraHits?: ScanHit[];
};

export async function runShield(
  raw: string,
  toggles: GuardrailToggles,
  opts?: RunShieldOptions,
): Promise<ShieldResult> {
  const nerOn = opts?.ner !== false;
  const extraHits =
    opts?.extraHits ??
    (nerOn ? await detectNerHits(raw, toggles) : []);
  const { text, findings, tokenMap } = sanitizeLocally(raw, toggles, {
    extraHits,
  });
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

import { PACK_BIT, packFlagsFromToggles, type GuardrailToggles } from "./types";

/** Institutional seats must attest all five packs (bits 0–4). */
export const REQUIRED_PACK_INSTITUTIONAL =
  PACK_BIT.pii |
  PACK_BIT.financial |
  PACK_BIT.secrets |
  PACK_BIT.code |
  PACK_BIT.client;

/** Sandbox has no minimum pack — toggles are optional. */
export const REQUIRED_PACK_SANDBOX = 0;

export function meetsRequiredPack(packFlags: number, required: number): boolean {
  return (packFlags & required) === required;
}

export function assertRequiredPack(
  packFlags: number,
  required: number,
): { ok: true } | { ok: false; error: string } {
  if (meetsRequiredPack(packFlags, required)) return { ok: true };
  return {
    ok: false,
    error:
      "Required policy not attested. Enable every mandatory filter before shield.",
  };
}

export function requiredPackForTier(tier: "freelancer" | "institutional"): number {
  return tier === "institutional"
    ? REQUIRED_PACK_INSTITUTIONAL
    : REQUIRED_PACK_SANDBOX;
}

/** Env override: KACHIS_REQUIRED_PACK bitmask. Unset or 0 = no API minimum. Institutional deploys use 31. */
export function requiredPackFromEnv(): number {
  const raw = process.env.KACHIS_REQUIRED_PACK;
  if (raw == null || raw.trim() === "") return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed & 0xff;
}

export function enforceRequiredPackEnabled(): boolean {
  const flag = process.env.KACHIS_ENFORCE_REQUIRED_PACK;
  if (flag == null || flag.trim() === "") return true;
  return flag === "1" || flag.toLowerCase() === "true";
}

export function defaultTogglesForTier(
  tier: "freelancer" | "institutional",
): GuardrailToggles {
  if (tier === "institutional") {
    return {
      piiStripping: true,
      financialMasking: true,
      secretsStripping: true,
      codeInsulation: true,
      clientRecords: true,
    };
  }
  return {
    piiStripping: true,
    financialMasking: true,
    secretsStripping: true,
    codeInsulation: false,
    clientRecords: false,
  };
}

export function togglesMeetRequired(
  toggles: GuardrailToggles,
  required: number,
): boolean {
  return meetsRequiredPack(packFlagsFromToggles(toggles), required);
}

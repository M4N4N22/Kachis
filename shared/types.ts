export type GuardrailToggles = {
  piiStripping: boolean;
  financialMasking: boolean;
  secretsStripping: boolean;
  codeInsulation: boolean;
  clientRecords: boolean;
};

export type GuardrailFindingKind =
  | "pii"
  | "financial"
  | "secrets"
  | "code"
  | "client";

export type GuardrailFinding = {
  id: string;
  kind: GuardrailFindingKind;
  label: string;
  count: number;
};

export type ShieldResult = {
  text: string;
  findings: GuardrailFinding[];
  packFlags: number;
  cleanedHash: string;
  binding: string;
  circuit: "kachis_guardrail_v0";
  attestedAt: string;
};

export const CIRCUIT_ID = "kachis_guardrail_v0" as const;

/** bit0 PII, bit1 financial, bit2 secrets, bit3 code, bit4 client */
export const PACK_BIT = {
  pii: 1,
  financial: 2,
  secrets: 4,
  code: 8,
  client: 16,
} as const;

export function packFlagsFromToggles(toggles: GuardrailToggles): number {
  return (
    (toggles.piiStripping ? PACK_BIT.pii : 0) |
    (toggles.financialMasking ? PACK_BIT.financial : 0) |
    (toggles.secretsStripping ? PACK_BIT.secrets : 0) |
    (toggles.codeInsulation ? PACK_BIT.code : 0) |
    (toggles.clientRecords ? PACK_BIT.client : 0)
  );
}

export function decodePackFlags(flags: number): GuardrailFindingKind[] {
  const kinds: GuardrailFindingKind[] = [];
  if (flags & PACK_BIT.pii) kinds.push("pii");
  if (flags & PACK_BIT.financial) kinds.push("financial");
  if (flags & PACK_BIT.secrets) kinds.push("secrets");
  if (flags & PACK_BIT.code) kinds.push("code");
  if (flags & PACK_BIT.client) kinds.push("client");
  return kinds;
}

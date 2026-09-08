export type GuardrailToggles = {
  piiStripping: boolean;
  financialMasking: boolean;
  enterpriseCompliance: boolean;
};

export type GuardrailFinding = {
  id: string;
  kind: "pii" | "financial" | "compliance";
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

/** bit0 PII, bit1 financial, bit2 compliance */
export function packFlagsFromToggles(toggles: GuardrailToggles): number {
  return (
    (toggles.piiStripping ? 1 : 0) |
    (toggles.financialMasking ? 2 : 0) |
    (toggles.enterpriseCompliance ? 4 : 0)
  );
}

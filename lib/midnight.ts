import type { GuardrailFinding, GuardrailToggles, ProofRecord } from "@/lib/types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const ACCOUNT = /\b\d{8,17}\b/g;
const AMOUNT = /\$[\d,]+(?:\.\d{2})?/g;
const SECRET =
  /\b(?:sk_live_|sk_test_|api[_-]?key|AKIA)[A-Za-z0-9/_+=-]{8,}\b/gi;
const NAME_LINE = /\b(?:Employee|Name)\s*:\s*.+$/gim;

export const SAMPLE_SENSITIVE_PROMPT = `Review this Q3 compensation packet before the board call.

Employee: Jane Doe
Email: jane.doe@northwind.io
SSN: 123-45-6789
Phone: +1 (415) 555-0134
Bank account: 9876543210
Routing: 121000248
Q3 bonus: $185,000
Salary band: $240,000–$265,000

Internal API key for payroll export:
test123

Summarize leak risk and draft a redacted briefing the CFO can circulate.`;

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

export function sanitizeLocally(input: string, guardrails: GuardrailToggles) {
  let text = input;
  const findings: GuardrailFinding[] = [];

  if (guardrails.piiStripping) {
    const emails = countMatches(text, EMAIL);
    const phones = countMatches(text, PHONE);
    const ssns = countMatches(text, SSN);
    const names = countMatches(text, NAME_LINE);

    text = text
      .replace(EMAIL, "[REDACTED_EMAIL]")
      .replace(SSN, "***-**-****")
      .replace(PHONE, "[REDACTED_PHONE]")
      .replace(NAME_LINE, "Employee: [REDACTED_NAME]");

    const count = emails + phones + ssns + names;
    if (count > 0) {
      findings.push({
        id: "pii",
        kind: "pii",
        label: "PII stripped locally",
        count,
      });
    }
  }

  if (guardrails.financialMasking) {
    const amounts = countMatches(text, AMOUNT);
    const accounts = countMatches(text, ACCOUNT);

    text = text
      .replace(AMOUNT, "[MASKED_AMOUNT]")
      .replace(ACCOUNT, "[MASKED_ACCOUNT]");

    const count = amounts + accounts;
    if (count > 0) {
      findings.push({
        id: "fin",
        kind: "financial",
        label: "Financial fields masked",
        count,
      });
    }
  }

  if (guardrails.enterpriseCompliance) {
    const secrets = countMatches(text, SECRET);
    text = text.replace(SECRET, "[COMPLIANCE_BLOCKED_SECRET]");

    if (secrets > 0) {
      findings.push({
        id: "cmp",
        kind: "compliance",
        label: "Secrets held behind policy",
        count: secrets,
      });
    }
  }

  return { text, findings };
}

function randomHex(length: number) {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateLocalProof(
  findings: GuardrailFinding[],
): Promise<ProofRecord> {
  await new Promise((resolve) => setTimeout(resolve, 420));

  return {
    hash: `0x${randomHex(16)}`,
    circuit: "kachina_guardrail_v0",
    attestedAt: new Date().toISOString(),
    findings,
  };
}

export function mockWalletAddress(provider: "lace" | "gero") {
  const suffix = randomHex(3);
  return provider === "lace"
    ? `addr_midnight1kchn${suffix}7xq2`
    : `gero1shield${suffix}m4n`;
}

export function mockAssistantReply(sanitizedPrompt: string) {
  const blocked = sanitizedPrompt.includes("[")
    ? "I only received the shielded version of your prompt — raw identifiers never left the device."
    : "Your prompt was attested locally. No additional redactions were required.";

  return `${blocked}

I can draft the CFO briefing from the sanitized fields only: compensation discussion, leak-risk framing, and a circulation-safe summary. Sensitive values stay represented as placeholders, which is what Midnight’s local proof already attested.`;
}

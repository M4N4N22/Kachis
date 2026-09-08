import type { GuardrailFinding, GuardrailToggles } from "./types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const ACCOUNT = /\b\d{8,17}\b/g;
const AMOUNT = /\$[\d,]+(?:\.\d{2})?/g;
const SECRET =
  /\b(?:sk_live_|sk_test_|kch_demo_|api[_-]?key|AKIA)[A-Za-z0-9/_+=-]{8,}\b/gi;
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
kch_demo_51NqX8wKachinaPayroll9f2e

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
        label: "Sensitive identifiers stripped locally",
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
        label: "Financial formats masked",
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
        label: "Secrets held by compliance audit",
        count: secrets,
      });
    }
  }

  return { text, findings };
}

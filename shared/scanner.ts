import type {
  GuardrailFinding,
  GuardrailFindingKind,
  GuardrailToggles,
} from "./types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const ACCOUNT = /\b\d{8,17}\b/g;
const AMOUNT = /\$[\d,]+(?:\.\d{2})?/g;
const NAME_LINE = /\b(?:Employee|Name)\s*:\s*.+$/gim;

const SECRET_TOKEN =
  /\b(?:sk_live_|sk_test_|kch_demo_|api[_-]?key[=:\s]|AKIA)[A-Za-z0-9/_+=-]{8,}\b/gi;
const JWT =
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const PEM_BLOCK =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;

const ENV_ASSIGN =
  /^(?:export\s+)?(?:[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*.+$/gim;
const CODE_SECRET_ASSIGN =
  /\b(?:password|passwd|secret|apiKey|api_key|private_key|accessToken)\s*[:=]\s*['"`][^'"`]{4,}['"`]/gi;
const INTERNAL_PATH =
  /\b(?:\/(?:Users|home)\/[^\s]+|C:\\(?:Users|dev)\\[^\s]+|@northwind\/[a-z0-9/_-]+)\b/gi;

const CLIENT_LINE =
  /\b(?:Customer|Client|Account|Opportunity|Deal)\s*:\s*.+$/gim;

/** Placeholders emitted by sanitizeLocally — used for badge rendering. */
const CLEAN_TOKEN =
  /\[(?:REDACTED|MASKED)_[A-Z0-9_]+\]|\*\*\*-\*\*-\*\*\*\*/g;

export type HighlightSegment = {
  kind: "text" | "warn";
  value: string;
  findingKind?: GuardrailFindingKind;
};

export type CleanRevealToken = {
  kind: "text" | "badge" | "break";
  value: string;
};

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

export const SAMPLE_CODE_CLIENT_PROMPT = `Debug this support export before we paste it into the analyst agent.

Customer: Acme Robotics Ltd
Account: ACME-20491
Opportunity: Enterprise renewal Q3
Client: Mira Chen <mira.chen@acmerobotics.example>

Snippet from packages/billing/src/secrets.ts on C:\\Users\\dev\\northwind\\billing:

const apiKey = "sk_live_northwindBilling9f2e";
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7
-----END PRIVATE KEY-----

import { ledger } from "@northwind/internal-ledger";

Return a safe summary with secrets removed.`;

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

function collectPatternMatches(
  source: string,
  pattern: RegExp,
  findingKind: GuardrailFindingKind,
) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const matches: { start: number; end: number; kind: GuardrailFindingKind }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: findingKind,
    });
    if (match[0].length === 0) re.lastIndex += 1;
  }
  return matches;
}

/** Amber highlight spans over sensitive spans in the raw paste (pre-rewrite). */
export function highlightSensitive(
  input: string,
  guardrails: GuardrailToggles,
): HighlightSegment[] {
  const hits: { start: number; end: number; kind: GuardrailFindingKind }[] = [];

  if (guardrails.piiStripping) {
    hits.push(
      ...collectPatternMatches(input, EMAIL, "pii"),
      ...collectPatternMatches(input, PHONE, "pii"),
      ...collectPatternMatches(input, SSN, "pii"),
      ...collectPatternMatches(input, NAME_LINE, "pii"),
    );
  }
  if (guardrails.financialMasking) {
    hits.push(
      ...collectPatternMatches(input, AMOUNT, "financial"),
      ...collectPatternMatches(input, ACCOUNT, "financial"),
    );
  }
  if (guardrails.secretsStripping) {
    hits.push(
      ...collectPatternMatches(input, SECRET_TOKEN, "secrets"),
      ...collectPatternMatches(input, JWT, "secrets"),
      ...collectPatternMatches(input, PEM_BLOCK, "secrets"),
    );
  }
  if (guardrails.codeInsulation) {
    hits.push(
      ...collectPatternMatches(input, ENV_ASSIGN, "code"),
      ...collectPatternMatches(input, CODE_SECRET_ASSIGN, "code"),
      ...collectPatternMatches(input, INTERNAL_PATH, "code"),
    );
  }
  if (guardrails.clientRecords) {
    hits.push(...collectPatternMatches(input, CLIENT_LINE, "client"));
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: typeof hits = [];
  for (const hit of hits) {
    const last = merged[merged.length - 1];
    if (last && hit.start < last.end) {
      if (hit.end > last.end) last.end = hit.end;
      continue;
    }
    merged.push({ ...hit });
  }

  if (merged.length === 0) {
    return input ? [{ kind: "text", value: input }] : [];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const hit of merged) {
    if (hit.start > cursor) {
      segments.push({ kind: "text", value: input.slice(cursor, hit.start) });
    }
    segments.push({
      kind: "warn",
      value: input.slice(hit.start, hit.end),
      findingKind: hit.kind,
    });
    cursor = hit.end;
  }
  if (cursor < input.length) {
    segments.push({ kind: "text", value: input.slice(cursor) });
  }
  return segments;
}

/** Tokenize cleaned prompt for word-by-word reveal with redaction badges. */
export function tokenizeCleanedPrompt(cleaned: string): CleanRevealToken[] {
  if (!cleaned) return [];
  const tokens: CleanRevealToken[] = [];
  const re = new RegExp(CLEAN_TOKEN.source, "g");
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(cleaned)) !== null) {
    if (match.index > cursor) {
      pushTextTokens(tokens, cleaned.slice(cursor, match.index));
    }
    tokens.push({ kind: "badge", value: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < cleaned.length) {
    pushTextTokens(tokens, cleaned.slice(cursor));
  }
  return tokens;
}

function pushTextTokens(tokens: CleanRevealToken[], chunk: string) {
  const parts = chunk.split(/(\n+)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\n+$/.test(part)) {
      tokens.push({ kind: "break", value: part });
      continue;
    }
    const words = part.split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      tokens.push({ kind: "text", value: word });
    }
  }
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

  if (guardrails.secretsStripping) {
    const tokens = countMatches(text, SECRET_TOKEN);
    const jwts = countMatches(text, JWT);
    const pems = countMatches(text, PEM_BLOCK);

    text = text
      .replace(PEM_BLOCK, "[REDACTED_PRIVATE_KEY]")
      .replace(JWT, "[REDACTED_JWT]")
      .replace(SECRET_TOKEN, "[REDACTED_SECRET]");

    const count = tokens + jwts + pems;
    if (count > 0) {
      findings.push({
        id: "sec",
        kind: "secrets",
        label: "Secrets held locally",
        count,
      });
    }
  }

  if (guardrails.codeInsulation) {
    const envLines = countMatches(text, ENV_ASSIGN);
    const assigns = countMatches(text, CODE_SECRET_ASSIGN);
    const paths = countMatches(text, INTERNAL_PATH);

    text = text
      .replace(ENV_ASSIGN, "[REDACTED_ENV_ASSIGNMENT]")
      .replace(CODE_SECRET_ASSIGN, "[REDACTED_CODE_SECRET]")
      .replace(INTERNAL_PATH, "[REDACTED_INTERNAL_PATH]");

    const count = envLines + assigns + paths;
    if (count > 0) {
      findings.push({
        id: "code",
        kind: "code",
        label: "Source and path markers insulated",
        count,
      });
    }
  }

  if (guardrails.clientRecords) {
    const clients = countMatches(text, CLIENT_LINE);

    text = text.replace(CLIENT_LINE, (line) => {
      const label = line.split(":")[0]?.trim() || "Client";
      return `${label}: [REDACTED_CLIENT_RECORD]`;
    });

    if (clients > 0) {
      findings.push({
        id: "client",
        kind: "client",
        label: "Client records stripped locally",
        count: clients,
      });
    }
  }

  return { text, findings };
}

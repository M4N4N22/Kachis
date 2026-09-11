import type {
  GuardrailFinding,
  GuardrailFindingKind,
  GuardrailToggles,
} from "./types";

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
/** International / US phones with separators, optional country code. */
const PHONE = /\+?\d[\d\s().-]{8,}\d/g;
const SSN_DASHED = /\b\d{3}-\d{2}-\d{4}\b/g;
/** Nine contiguous digits — common unlabeled SSN / tax-id paste. */
const SSN_PLAIN = /\b\d{9}\b/g;
const NAME_LINE = /\b(?:Employee|Name)\s*:\s*.+$/gim;

const ACCOUNT = /\b\d{8,17}\b/g;
const AMOUNT = /\$[\d,]+(?:\.\d{2})?/g;
/**
 * Written / mixed scale amounts: "fifteen million", "4.2 billion", "twenty-five thousand dollars".
 * Requires a scale word so everyday prose is not eaten.
 */
const WRITTEN_AMOUNT =
  /\b(?:(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-]+(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand))*)\s+(?:million|billion|trillion|thousand)(?:\s+(?:dollars?|usd))?\b/gi;
/** IBAN: 2-letter country + 2 check digits + up to 30 alphanumerics. */
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/gi;
/** Card-like digit runs (13–19 digits, optional spaces/dashes). */
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;

const SECRET_TOKEN =
  /\b(?:sk_live_|sk_test_|kch_demo_|ghp_|xox[baprs]-|AIza|api[_-]?key[=:\s]|AKIA)[A-Za-z0-9/_+=-]{8,}\b/gi;
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
  /\[(?:PERSON|ORG|LOC|EMAIL|PHONE|SSN|AMOUNT|ACCOUNT|SECRET|JWT|PRIVATE_KEY|ENV|CODE_SECRET|PATH|CLIENT)_\d+\]|\*\*\*-\*\*-\*\*\*\*/g;

export type ScanHitSource = "regex" | "ner";

export type ScanHit = {
  start: number;
  end: number;
  kind: GuardrailFindingKind;
  source?: ScanHitSource;
  /** Optional rewrite hint when content shape is ambiguous (e.g. NER person). */
  label?:
    | "email"
    | "phone"
    | "ssn"
    | "name"
    | "amount"
    | "account"
    | "iban"
    | "card"
    | "secret"
    | "jwt"
    | "pem"
    | "env"
    | "code_secret"
    | "path"
    | "client"
    | "person"
    | "org"
    | "loc";
};

export type HighlightSegment = {
  kind: "text" | "warn";
  value: string;
  findingKind?: GuardrailFindingKind;
};

export type CleanRevealToken = {
  kind: "text" | "badge" | "break";
  value: string;
};

export type SanitizeOptions = {
  extraHits?: ScanHit[];
};

export const SAMPLE_SENSITIVE_PROMPT = `Review this Q3 compensation packet before the board call.

Employee: Jane Doe
Email: jane.doe@northwind.io
SSN: 123-45-6789
Phone: +1 (415) 555-0134
Bank account: 9876543210
Routing: 121000248
IBAN: GB82WEST12345698765432
Q3 bonus: $185,000
Salary band: $240,000–$265,000

Internal API key for payroll export:
kch_demo_51NqX8wKachinaPayroll9f2e

Also loop in Mira Chen from Acme Robotics — she already saw the raw sheet in Slack.

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

/** Free-text deal memo — exercises NER people/orgs/locs + written money. */
export const SAMPLE_PROSE_PROMPT = `We are quietly looking to acquire an enterprise cybersecurity firm out of Austin called CypherCorp. Jordan Blake is leading the negotiation, and our legal team at Smith & Associates estimates the total transaction valuation will settle at roughly fifteen million by early next month.

Also loop in Mira Chen from Acme Robotics — jordan.blake@northwind.io — and keep Q3 bonus context ($185,000) out of the vendor model.`;

function countDigits(value: string) {
  return (value.match(/\d/g) ?? []).length;
}

function collectPatternMatches(
  source: string,
  pattern: RegExp,
  findingKind: GuardrailFindingKind,
  label?: ScanHit["label"],
): ScanHit[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const matches: ScanHit[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: findingKind,
      source: "regex",
      label,
    });
    if (match[0].length === 0) re.lastIndex += 1;
  }
  return matches;
}

function isLikelyPhone(value: string) {
  const digits = countDigits(value);
  if (digits < 10 || digits > 15) return false;
  // Bare digit runs are accounts/cards — phones need + or a separator.
  return /[+\s().-]/.test(value);
}

function isLikelyCard(value: string) {
  const digits = countDigits(value);
  if (digits < 13 || digits > 19) return false;
  // Prefer spaced/dashed card pastes; bare 13–19 runs still count.
  return true;
}

/** Pack priority for overlap resolution (higher wins). */
const KIND_PRIORITY: Record<GuardrailFindingKind, number> = {
  secrets: 5,
  code: 4,
  pii: 3,
  financial: 2,
  client: 1,
};

function hitPriority(hit: ScanHit) {
  // Prefer structured regex labels over loose NER on the same span.
  const sourceBoost = hit.source === "regex" ? 0.5 : 0;
  const labelBoost =
    hit.label === "iban" || hit.label === "email" || hit.label === "pem"
      ? 0.25
      : 0;
  return KIND_PRIORITY[hit.kind] + sourceBoost + labelBoost;
}

/**
 * Greedy non-overlapping merge: highest priority spans win;
 * losers that overlap are dropped (no span inflation).
 */
export function mergeHits(hits: ScanHit[]): ScanHit[] {
  if (hits.length === 0) return [];
  const ranked = [...hits].sort(
    (a, b) =>
      hitPriority(b) - hitPriority(a) ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );
  const accepted: ScanHit[] = [];
  for (const hit of ranked) {
    if (accepted.some((a) => hit.start < a.end && a.start < hit.end)) continue;
    accepted.push({ ...hit });
  }
  return accepted.sort((a, b) => a.start - b.start || b.end - a.end);
}

export function collectRegexHits(
  input: string,
  guardrails: GuardrailToggles,
): ScanHit[] {
  const hits: ScanHit[] = [];

  if (guardrails.piiStripping) {
    hits.push(
      ...collectPatternMatches(input, EMAIL, "pii", "email"),
      ...collectPatternMatches(input, SSN_DASHED, "pii", "ssn"),
      ...collectPatternMatches(input, NAME_LINE, "pii", "name"),
    );
    for (const hit of collectPatternMatches(input, PHONE, "pii", "phone")) {
      const value = input.slice(hit.start, hit.end);
      if (isLikelyPhone(value)) hits.push(hit);
    }
    for (const hit of collectPatternMatches(input, SSN_PLAIN, "pii", "ssn")) {
      // Avoid eating long account/card runs; plain SSN is exactly 9 digits.
      if (countDigits(input.slice(hit.start, hit.end)) === 9) hits.push(hit);
    }
  }

  if (guardrails.financialMasking) {
    hits.push(
      ...collectPatternMatches(input, AMOUNT, "financial", "amount"),
      ...collectPatternMatches(input, WRITTEN_AMOUNT, "financial", "amount"),
      ...collectPatternMatches(input, IBAN, "financial", "iban"),
    );
    for (const hit of collectPatternMatches(input, CARD, "financial", "card")) {
      if (isLikelyCard(input.slice(hit.start, hit.end))) hits.push(hit);
    }
    for (const hit of collectPatternMatches(input, ACCOUNT, "financial", "account")) {
      const value = input.slice(hit.start, hit.end);
      // Skip 9-digit spans that look like plain SSNs when PII is on.
      if (guardrails.piiStripping && countDigits(value) === 9) continue;
      hits.push(hit);
    }
  }

  if (guardrails.secretsStripping) {
    hits.push(
      ...collectPatternMatches(input, SECRET_TOKEN, "secrets", "secret"),
      ...collectPatternMatches(input, JWT, "secrets", "jwt"),
      ...collectPatternMatches(input, PEM_BLOCK, "secrets", "pem"),
    );
  }

  if (guardrails.codeInsulation) {
    hits.push(
      ...collectPatternMatches(input, ENV_ASSIGN, "code", "env"),
      ...collectPatternMatches(input, CODE_SECRET_ASSIGN, "code", "code_secret"),
      ...collectPatternMatches(input, INTERNAL_PATH, "code", "path"),
    );
  }

  if (guardrails.clientRecords) {
    hits.push(...collectPatternMatches(input, CLIENT_LINE, "client", "client"));
  }

  return hits;
}

function looksLikeEmail(value: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim());
}

function looksLikeSsn(value: string) {
  return /^\d{3}-\d{2}-\d{4}$/.test(value.trim()) || /^\d{9}$/.test(value.trim());
}

type PlaceholderFamily =
  | "PERSON"
  | "ORG"
  | "LOC"
  | "EMAIL"
  | "PHONE"
  | "SSN"
  | "AMOUNT"
  | "ACCOUNT"
  | "SECRET"
  | "JWT"
  | "PRIVATE_KEY"
  | "ENV"
  | "CODE_SECRET"
  | "PATH"
  | "CLIENT";

function nextPlaceholder(
  counters: Map<PlaceholderFamily, number>,
  family: PlaceholderFamily,
) {
  const n = (counters.get(family) ?? 0) + 1;
  counters.set(family, n);
  return `[${family}_${n}]`;
}

function familyForHit(input: string, hit: ScanHit): PlaceholderFamily {
  const value = input.slice(hit.start, hit.end);
  const label = hit.label;

  if (label === "email" || looksLikeEmail(value)) return "EMAIL";
  if (label === "ssn" || looksLikeSsn(value)) return "SSN";
  if (label === "phone") return "PHONE";
  if (label === "loc") return "LOC";
  if (label === "name" || label === "person") return "PERSON";
  if (label === "amount") return "AMOUNT";
  if (label === "iban" || label === "card" || label === "account") return "ACCOUNT";
  if (label === "secret") return "SECRET";
  if (label === "jwt") return "JWT";
  if (label === "pem") return "PRIVATE_KEY";
  if (label === "env") return "ENV";
  if (label === "code_secret") return "CODE_SECRET";
  if (label === "path") return "PATH";
  if (label === "client" || label === "org") return "ORG";

  switch (hit.kind) {
    case "pii":
      return "PERSON";
    case "financial":
      return "ACCOUNT";
    case "secrets":
      return "SECRET";
    case "code":
      return "CODE_SECRET";
    case "client":
      return "ORG";
  }
}

/** Keep labeled CRM / employee headers; enumerate only the sensitive value. */
function placeholderForHit(
  input: string,
  hit: ScanHit,
  counters: Map<PlaceholderFamily, number>,
): { replacement: string; token: string; original: string } {
  const value = input.slice(hit.start, hit.end);
  const family = familyForHit(input, hit);
  const token = nextPlaceholder(counters, family);

  if (
    (hit.label === "name" || hit.label === "person") &&
    /^\s*(?:Employee|Name)\s*:/i.test(value)
  ) {
    const original = value.split(":").slice(1).join(":").trim() || value;
    return { replacement: `Employee: ${token}`, token, original };
  }
  if (
    (hit.label === "client" || hit.label === "org") &&
    /^\s*(?:Customer|Client|Account|Opportunity|Deal)\s*:/i.test(value)
  ) {
    const header = value.split(":")[0]?.trim() || "Client";
    const original = value.split(":").slice(1).join(":").trim() || value;
    return { replacement: `${header}: ${token}`, token, original };
  }
  return { replacement: token, token, original: value };
}

const FINDING_META: Record<
  GuardrailFindingKind,
  { id: string; label: string }
> = {
  pii: { id: "pii", label: "Sensitive identifiers stripped locally" },
  financial: { id: "fin", label: "Financial formats masked" },
  secrets: { id: "sec", label: "Secrets held locally" },
  code: { id: "code", label: "Source and path markers insulated" },
  client: { id: "client", label: "Client records stripped locally" },
};

export function rewriteFromHits(input: string, hits: ScanHit[]) {
  const merged = mergeHits(hits);
  if (merged.length === 0) {
    return {
      text: input,
      findings: [] as GuardrailFinding[],
      tokenMap: {} as Record<string, string>,
    };
  }

  const parts: string[] = [];
  let cursor = 0;
  const counts: Partial<Record<GuardrailFindingKind, number>> = {};
  const counters = new Map<PlaceholderFamily, number>();
  const tokenMap: Record<string, string> = {};

  for (const hit of merged) {
    if (hit.start > cursor) {
      parts.push(input.slice(cursor, hit.start));
    }
    const { replacement, token, original } = placeholderForHit(
      input,
      hit,
      counters,
    );
    parts.push(replacement);
    tokenMap[token] = original;
    counts[hit.kind] = (counts[hit.kind] ?? 0) + 1;
    cursor = hit.end;
  }
  if (cursor < input.length) {
    parts.push(input.slice(cursor));
  }

  const findings: GuardrailFinding[] = [];
  for (const kind of Object.keys(FINDING_META) as GuardrailFindingKind[]) {
    const count = counts[kind] ?? 0;
    if (count > 0) {
      findings.push({
        id: FINDING_META[kind].id,
        kind,
        label: FINDING_META[kind].label,
        count,
      });
    }
  }

  return { text: parts.join(""), findings, tokenMap };
}

function segmentsFromHits(input: string, hits: ScanHit[]): HighlightSegment[] {
  const merged = mergeHits(hits);
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

/** Amber highlight spans over sensitive spans in the raw paste (pre-rewrite). */
export function highlightSensitive(
  input: string,
  guardrails: GuardrailToggles,
  options?: SanitizeOptions,
): HighlightSegment[] {
  const hits = [
    ...collectRegexHits(input, guardrails),
    ...(options?.extraHits ?? []),
  ];
  return segmentsFromHits(input, hits);
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

export function sanitizeLocally(
  input: string,
  guardrails: GuardrailToggles,
  options?: SanitizeOptions,
) {
  const hits = [
    ...collectRegexHits(input, guardrails),
    ...(options?.extraHits ?? []),
  ];
  return rewriteFromHits(input, hits);
}

/** Drop NER spans fully covered by an existing regex hit. */
export function filterUncoveredHits(
  candidates: ScanHit[],
  coveredBy: ScanHit[],
): ScanHit[] {
  if (candidates.length === 0) return [];
  if (coveredBy.length === 0) return candidates;
  return candidates.filter(
    (c) => !coveredBy.some((r) => c.start >= r.start && c.end <= r.end),
  );
}

import type { GuardrailToggles } from "./types";
import {
  collectRegexHits,
  filterUncoveredHits,
  type ScanHit,
} from "./scanner";

const NER_MODEL = "Xenova/bert-base-NER";
const CHUNK_CHARS = 1800;
const CHUNK_OVERLAP = 120;
const MIN_SCORE = 0.55;

type NerToken = {
  entity?: string;
  score?: number;
  index?: number;
  word?: string;
};

type TokenClassificationPipeline = (
  text: string,
  options?: { ignore_labels?: string[] },
) => Promise<NerToken[]>;

type AggregatedEntity = {
  group: "PER" | "ORG" | "LOC";
  word: string;
  score: number;
};

let pipelinePromise: Promise<TokenClassificationPipeline | null> | null = null;
let warnedFailure = false;

function warnOnce(error: unknown) {
  if (warnedFailure) return;
  warnedFailure = true;
  console.warn(
    "[kachis] on-device NER unavailable; continuing with rule packs only",
    error,
  );
}

async function getNerPipeline(): Promise<TokenClassificationPipeline | null> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const { pipeline } = await import("@huggingface/transformers");
        const ner = await pipeline("token-classification", NER_MODEL, {
          // Quantized ONNX — lighter download for browser / Node.
          dtype: "q8",
        });
        return ner as unknown as TokenClassificationPipeline;
      } catch (error) {
        warnOnce(error);
        return null;
      }
    })();
  }
  return pipelinePromise;
}

function chunkRanges(length: number) {
  if (length <= CHUNK_CHARS) {
    return [{ start: 0, end: length }];
  }
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  while (start < length) {
    const end = Math.min(length, start + CHUNK_CHARS);
    ranges.push({ start, end });
    if (end >= length) break;
    start = Math.max(0, end - CHUNK_OVERLAP);
  }
  return ranges;
}

function entityGroup(raw: string): "PER" | "ORG" | "LOC" | null {
  const stripped = raw.toUpperCase().replace(/^[BI]-/, "");
  if (stripped === "PER" || stripped === "PERSON") return "PER";
  if (stripped === "ORG" || stripped === "ORGANIZATION") return "ORG";
  if (stripped === "LOC" || stripped === "LOCATION" || stripped === "GPE") {
    return "LOC";
  }
  return null;
}

function isBegin(raw: string) {
  return /^B-/i.test(raw);
}

/**
 * Transformers.js v3 token-classification does not yet return char offsets or
 * aggregation_strategy. Rebuild surface forms from wordpieces, then locate them
 * in the source string.
 */
export function aggregateNerTokens(tokens: NerToken[]): AggregatedEntity[] {
  const entities: AggregatedEntity[] = [];
  let current: AggregatedEntity | null = null;

  for (const token of tokens) {
    const label = token.entity ?? "";
    const group = entityGroup(label);
    const piece = token.word ?? "";
    const score = typeof token.score === "number" ? token.score : 0;
    if (!group || !piece || score < MIN_SCORE) {
      if (current) {
        entities.push(current);
        current = null;
      }
      continue;
    }

    const subword = piece.startsWith("##");
    // Models sometimes emit B- on continuation pieces (e.g. P / ##riya).
    const continueSubword = Boolean(current && current.group === group && subword);
    const begin =
      !continueSubword &&
      (isBegin(label) || !current || current.group !== group);

    if (begin) {
      if (current) entities.push(current);
      current = {
        group,
        word: subword ? piece.slice(2) : piece,
        score,
      };
      continue;
    }

    if (!current) continue;
    current.word += subword ? piece.slice(2) : ` ${piece}`;
    current.score = Math.min(current.score, score);
  }

  if (current) entities.push(current);
  return entities.filter((entity) => {
    if (entity.group === "ORG" && entity.word.length < 3) return false;
    if (entity.group === "PER" && entity.word.length < 2) return false;
    if (entity.group === "LOC" && entity.word.length < 2) return false;
    // Drop all-caps 2–3 letter ORG noise (CSV → CS, etc.).
    if (entity.group === "ORG" && /^[A-Z]{1,3}$/.test(entity.word)) return false;
    return true;
  });
}

function locateEntity(
  haystack: string,
  needle: string,
  from: number,
): { start: number; end: number } | null {
  if (!needle.trim()) return null;

  const tryFrom = (startAt: number) => {
    const exact = haystack.indexOf(needle, startAt);
    if (exact >= 0 && isBounded(haystack, exact, exact + needle.length)) {
      return { start: exact, end: exact + needle.length };
    }

    const parts = needle.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (parts.length === 0) return null;
    const re = new RegExp(`(^|[^A-Za-z0-9])(${parts.join("\\s+")})(?![A-Za-z0-9])`, "g");
    re.lastIndex = Math.max(0, startAt - 1);
    const match = re.exec(haystack);
    if (!match || match[2] === undefined) return null;
    const start = match.index + match[1].length;
    return { start, end: start + match[2].length };
  };

  return tryFrom(from) ?? (from > 0 ? tryFrom(0) : null);
}

function isBounded(text: string, start: number, end: number) {
  const before = start === 0 ? "" : text[start - 1]!;
  const after = end >= text.length ? "" : text[end]!;
  const wordish = /[A-Za-z0-9]/;
  if (before && wordish.test(before)) return false;
  if (after && wordish.test(after)) return false;
  return true;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hitFromEntity(
  entity: AggregatedEntity,
  located: { start: number; end: number },
  offset: number,
): ScanHit {
  if (entity.group === "PER") {
    return {
      start: offset + located.start,
      end: offset + located.end,
      kind: "pii",
      source: "ner",
      label: "person",
    };
  }
  if (entity.group === "LOC") {
    return {
      start: offset + located.start,
      end: offset + located.end,
      kind: "pii",
      source: "ner",
      label: "loc",
    };
  }
  return {
    start: offset + located.start,
    end: offset + located.end,
    kind: "client",
    source: "ner",
    label: "org",
  };
}

function entitiesToHits(
  text: string,
  entities: AggregatedEntity[],
  offset: number,
  toggles: GuardrailToggles,
): ScanHit[] {
  const hits: ScanHit[] = [];
  let cursor = 0;

  for (const entity of entities) {
    if (entity.group === "PER" && !toggles.piiStripping) continue;
    if (entity.group === "LOC" && !toggles.piiStripping) continue;
    if (entity.group === "ORG" && !toggles.clientRecords) continue;

    const located = locateEntity(text, entity.word, cursor);
    if (!located) continue;

    hits.push(hitFromEntity(entity, located, offset));
    cursor = located.end;
  }

  return hits;
}

/**
 * On-device token-classification NER (Transformers.js / ONNX).
 * Soft-fails to [] so the rule-pack scanner always continues.
 */
export async function detectNerHits(
  text: string,
  toggles: GuardrailToggles,
): Promise<ScanHit[]> {
  if (!text.trim()) return [];
  if (!toggles.piiStripping && !toggles.clientRecords) return [];

  try {
    const ner = await getNerPipeline();
    if (!ner) return [];

    const regexHits = collectRegexHits(text, toggles);
    const hits: ScanHit[] = [];

    for (const range of chunkRanges(text.length)) {
      const slice = text.slice(range.start, range.end);
      if (!slice.trim()) continue;
      const tokens = await ner(slice);
      const entities = aggregateNerTokens(tokens);
      hits.push(...entitiesToHits(slice, entities, range.start, toggles));
    }

    return filterUncoveredHits(hits, regexHits);
  } catch (error) {
    warnOnce(error);
    return [];
  }
}

/** Warm the model in the background (optional; scan still lazy-loads). */
export function preloadNer(): void {
  void getNerPipeline();
}

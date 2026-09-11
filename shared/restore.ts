import type { TokenMap } from "./types";

/** Families left as tokens in restored replies (keys / paths stay insulated). */
const HOLD_FAMILIES = new Set([
  "SECRET",
  "JWT",
  "PRIVATE_KEY",
  "ENV",
  "CODE_SECRET",
  "PATH",
]);

const TOKEN_RE =
  /\[(PERSON|ORG|LOC|EMAIL|PHONE|SSN|AMOUNT|ACCOUNT|SECRET|JWT|PRIVATE_KEY|ENV|CODE_SECRET|PATH|CLIENT)_(\d+)\]/g;

export type RestoreOptions = {
  /** Restore secret-class tokens too (default false). */
  includeSecrets?: boolean;
};

function familyOfToken(token: string): string | null {
  const match = /^\[([A-Z_]+)_\d+\]$/.exec(token);
  return match?.[1] ?? null;
}

/**
 * Swap enumerated insulation tokens back to originals for local display.
 * Does not mutate the map. Secret-class tokens stay masked unless opted in.
 */
export function restoreFromTokenMap(
  text: string,
  tokenMap: TokenMap,
  opts?: RestoreOptions,
): string {
  if (!text || Object.keys(tokenMap).length === 0) return text;

  const includeSecrets = opts?.includeSecrets === true;
  const entries = Object.entries(tokenMap)
    .filter(([token]) => {
      if (includeSecrets) return true;
      const family = familyOfToken(token);
      return !family || !HOLD_FAMILIES.has(family);
    })
    // Longer tokens first so [PERSON_10] wins over [PERSON_1].
    .sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));

  let out = text;
  for (const [token, original] of entries) {
    if (!token || !original) continue;
    if (!out.includes(token)) continue;
    out = out.split(token).join(original);
  }
  return out;
}

/** Tokens present in text that still have a map entry (for UI hints). */
export function listedTokensInText(text: string, tokenMap: TokenMap): string[] {
  const found: string[] = [];
  const re = new RegExp(TOKEN_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const token = match[0];
    if (tokenMap[token] && !found.includes(token)) found.push(token);
  }
  return found;
}

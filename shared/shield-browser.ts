/**
 * Browser-safe barrel — no Transformers.js / NER.
 * Used by the MV3 companion so the service worker stays lean.
 */
export { runShieldLite } from "./shield-lite.ts";
export { restoreFromTokenMap } from "./restore.ts";
export { defaultTogglesForTier } from "./policy.ts";
export type { GuardrailToggles, TokenMap } from "./types.ts";

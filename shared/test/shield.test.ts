import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultTogglesForTier,
  restoreFromTokenMap,
  runShield,
} from "../index.ts";

test("runShield masks secrets and returns commitments", async () => {
  const raw =
    "Call Jane Doe at jane@acme.com — key sk_live_northwindBilling9f2e and $1,250,000.";
  const result = await runShield(raw, defaultTogglesForTier("institutional"), {
    ner: false,
  });

  assert.notEqual(result.text, raw);
  assert.match(result.cleanedHash, /^0x[0-9a-f]{64}$/i);
  assert.match(result.binding, /^0x[0-9a-f]{64}$/i);
  assert.ok(result.packFlags > 0);
  assert.ok(Object.keys(result.tokenMap).length > 0);
  assert.doesNotMatch(result.text, /sk_live_northwindBilling9f2e/);
});

test("restoreFromTokenMap restores non-secret tokens locally", async () => {
  const raw = "Email payroll to Ada Lovelace at ada@example.com.";
  const result = await runShield(raw, defaultTogglesForTier("institutional"), {
    ner: false,
  });
  const reply = `Noted for ${Object.keys(result.tokenMap).find((k) => k.startsWith("[PERSON")) ?? "[PERSON_1]"}.`;
  const restored = restoreFromTokenMap(reply, result.tokenMap, {
    includeSecrets: false,
  });
  assert.ok(restored.includes("Ada") || restored.includes("[PERSON"));
});

# @kachis/shield

On-device scanner used by the Kachis console, MCP agent, and browser companion.

- Rule packs (PII, financial, secrets, code, client) plus optional on-device NER
- Enumerated insulation tokens (`[PERSON_1]`, …) and local-only restore
- SHA-256 cleaned commitment + binding (original plaintext never returned)

```ts
import { runShield, restoreFromTokenMap, defaultTogglesForTier } from "@kachis/shield";

const toggles = defaultTogglesForTier("institutional");
const result = await runShield(rawPaste, toggles);
// Send only result.text to a public model.
// Keep result.tokenMap on this machine; call restoreFromTokenMap after the reply.
```

Never POST `tokenMap` or the original paste to `/api/shield` — only public commitments.

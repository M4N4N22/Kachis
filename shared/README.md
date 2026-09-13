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

## Monorepo note

Inside this Next app, **do not** run `npm install` under `shared/`. Nested `shared/node_modules` pulls `onnxruntime-node` binaries into Webpack and breaks `next dev` / `next build`. Use the root app `node_modules` for `@huggingface/transformers`.

Standalone package build / publish (outside the running console tree):

```bash
cd shared
npm install
npm run build
npm test
```

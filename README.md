# Kachis

A local data shield for corporate AI. Internal records stay on the device. Only a cleaned prompt can reach a model. Midnight attests that the pack ran — without publishing the file.

This answers: **if your AI chat history leaked today, how cooked are you?**

```
User or agent  →  Kachis (scan locally + commitment)  →  only then the LLM
```

## Long-term vision

Companies buy **control + evidence**, not another chat site: secrets never become the vendor log; packs cannot be skipped; an auditor can verify without opening the file.

| Horizon | Status |
|---|---|
| Web console | Shipped (this repo) |
| Shared scanner + SHA-256 binding | Shipped (`shared/`) |
| Compact contract `kachis-guardrail` | Source in `compact/` — compile with Compact toolchain |
| **Kachis Agent v1** (MCP) | Shipped (`agent/`) — sit in Cursor/Claude |
| Lace / Gero / 1AM / Ctrl | Live DApp Connector (`window.midnight` discovery — not `mnLace` only) |
| Public notary log | `/api/shield` — console + agent post hashes only |
| Chat gated on commitment | `/api/chat` refuses unknown `proofHash` |
| Proof server / on-chain submit | Probe-only until `compact compile` |
| On-device ML scanner | Later |
| Copilot / Slack connectors | Later |

**Kachis Agent** is not a second chatbot. It is an MCP tool the host must call before a raw paste leaves the laptop.

## What is real vs not

**Real**

- Local regex scan (same code for console and MCP)
- SHA-256 of cleaned prompt + **binding** `hash(originalHash || cleanedHash)` — original paste is not posted to `/api/shield`
- Compact circuit source: private original commitment, public cleaned hash + pack flags
- MCP tool `kachis_shield` (posts public commitments to the console when it is running)
- Midnight wallet connect via `@midnight-ntwrk/dapp-connector-api` (Lace, Gero, 1AM, Ctrl — scan injected wallets; no RainbowKit exists for Midnight)
- Console chat only after a recorded commitment
- Optional OpenAI chat for the **shielded** prompt only (`OPENAI_API_KEY`)

**Not yet**

- `compact compile` + Midnight proof server submitting the circuit
- Local ML NER
- Enterprise gateway

## Run the console

```bash
npm install
npm run dev
```

[http://localhost:3000/workspace](http://localhost:3000/workspace) → Load sample → Shield & Proceed → Send.

Lace, Gero, 1AM, or Ctrl: enable the Midnight account, refresh this page, then connect. The unshielded address (`mn_addr_preprod…`) is what the connector returns.

```bash
cp .env.example .env.local
# optional OPENAI_API_KEY for a real model on shielded text only
# optional MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:6300 to probe Lace's local proof server
```

## Run Kachis Agent (MCP)

```bash
cd agent
npm install
npm start
```

Config: copy `mcp.example.json` into your Cursor MCP settings. Tool: `kachis_shield`. Send **only** `shielded_prompt` to the model.

## Compact

See `compact/README.md`. License: Apache 2.0 (`LICENSE`).

## Stack

Next.js 16, React 19, Tailwind v4, TypeScript. Scanner: `shared/`. UI copy: `lib/copy.ts`.

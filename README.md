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
| Compact contract `kachis-guardrail` | Source in `compact/` — compile with Compact 0.31.x (WSL/Linux/macOS) |
| Compact `shield()` submit | Console path: local scan → Lace prove/submit when artifacts + funded wallet exist; else local record |
| **Kachis Agent v1** (MCP) | Shipped (`agent/`) — sit in Cursor/Claude. Public hashes only (no Compact submit yet) |
| Lace / Gero / 1AM / Ctrl | Live DApp Connector (`window.midnight` discovery) |
| Public notary log | `/api/shield` — hashes + optional settlement id. Never the paste |
| Chat gated on commitment | `/api/chat` refuses unknown `proofHash` |
| On-device ML scanner | Later |
| Copilot / Slack connectors | Later |

**Kachis Agent** is not a second chatbot. It is an MCP tool the host must call before a raw paste leaves the laptop.

## What is real vs not

**Real**

- Local regex scan (same code for console and MCP)
- SHA-256 of cleaned prompt + **binding** `hash(originalHash || cleanedHash)` — original paste is not posted to `/api/shield`
- Compact circuit source: private original commitment, public cleaned hash + pack flags
- MCP tool `kachis_shield` (posts public commitments to the console when it is running)
- Midnight wallet connect via `@midnight-ntwrk/dapp-connector-api` (Lace, Gero, 1AM, Ctrl)
- Console chat only after a recorded commitment
- Optional OpenAI chat for the **shielded** prompt only (`OPENAI_API_KEY`)
- Compact compile script + GitHub Action (`.github/workflows/compact-compile.yml`)
- Console `shield()` submit when compile artifacts are present, Lace is connected, and the seat has tNIGHT/DUST

**Not yet**

- Matching SHA-256 local binding to in-circuit `persistentHash` (different functions — do not claim they are equal)
- MCP Compact submit (agent still posts hashes only)
- Local ML NER
- Enterprise gateway

## Run the console

Node 20 is enough for the UI. Midnight.js submit prefers **Node 22**.

```bash
npm install
npm run dev
```

[http://localhost:3000/workspace](http://localhost:3000/workspace) → Load sample → Shield & Proceed → Send.

### Compact compile (judges)

Windows: use **WSL**. Native Windows cannot run Compact.

```bash
# in WSL / Linux / macOS, from the repo root
./compact/compile.sh
```

That writes `compact/managed/kachis-guardrail` including proving keys. The console serves them at `/zk/kachis-guardrail/…`.

### Settle a job (funded Preprod wallet)

1. Install Lace, enable Midnight, faucet **tNIGHT**, wait for **DUST**.
2. Run a local proof server (`docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v`) and point Lace at `http://localhost:6300`, or set `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL`.
3. Compile the contract (above).
4. Open Workspace, connect the wallet, Load sample, Shield & Proceed.
5. Guide rail shows a **settlement id** on success. If DUST/artifacts are missing, the public commitment is still recorded locally and chat still opens.

Optional: after the first deploy, set `NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS` so later sessions skip deploy.

```bash
cp .env.example .env.local
# optional OPENAI_API_KEY for a real model on shielded text only
# optional NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:6300
# optional NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS=mn_…
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

Tag the public GitHub repo with **`midnightntwrk`** (Settings → Topics) so the Wave 1 submission is eligible.

## Demo (Wave 1)

Screen path for the video: landing → Workspace → Connect Corporate Wallet (Lace) → Load sample → Shield & Proceed → settlement id on the rail → Send on the shielded channel. Optional: Identity balances (tNIGHT on Preprod).

## Stack

Next.js 16, React 19, Tailwind v4, TypeScript. Scanner: `shared/`. UI copy: `lib/copy.ts`. Midnight.js 4.1.1 + Compact language 0.23 / compiler 0.31.x.

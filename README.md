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
| Compact `shield()` submit | **Live on Preprod** — console Shield → Compact `shield()` via wallet prove/balance/submit (verified with **1AM** in-wallet proving) |
| **Kachis Agent v1** (MCP) | Shipped (`agent/`) — sit in Cursor/Claude. Public hashes only (no Compact submit yet) |
| Lace / Gero / 1AM / Ctrl | Live DApp Connector (`window.midnight` discovery). **1AM** recommended for settle (prove + balance). Lace needs a local/remote proof server. Gero cannot balance contracts yet. |
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
- Optional OpenAI chat for the **shielded** prompt only (`OPENAI_API_KEY`). Without a key, `/api/chat` returns an error — it does not stub a briefing.
- Compact compile script + GitHub Action (`.github/workflows/compact-compile.yml`)
- Console `shield()` submit when compile artifacts are present, a settle-capable wallet is connected (**1AM** preferred; Lace + proof server also works), and the seat has tNIGHT/DUST
- Public notary log: `GET /api/shield` merges **Preprod contract ledger** (on-chain cleanedHash / binding / packFlags) with local findings; persists under `.data/`
- **Live Preprod settlement** recorded below for judges

**Not yet**

- Matching SHA-256 local binding to in-circuit `persistentHash` (different functions — do not claim they are equal)
- MCP Compact submit (agent still posts hashes only)
- Local ML NER
- Enterprise gateway
- Gero contract balancing (`balanceUnsealedTransaction` still planned)

## Run the console

Node 20 is enough for the UI. Midnight.js submit prefers **Node 22**.

```bash
npm install
npm run dev
```

`npm run dev` uses **Webpack** (`next dev --webpack`). Midnight ledger WASM (`CostModel`) does not initialize under Turbopack — that surfaces as `costmodel_initialCostModel` / “Cannot read properties of undefined”. Use `npm run dev:turbo` only for UI-only work.

[http://localhost:3000/workspace](http://localhost:3000/workspace) — connect a corporate wallet, paste your own records, then Shield & Proceed.

Walkthrough (canned payroll paste): [http://localhost:3000/demo](http://localhost:3000/demo) → Connect Corporate Wallet → Load sample → Shield & Proceed → Send.

### Compact compile (judges)

Windows: use **WSL**. Native Windows cannot run Compact.

```bash
# in WSL / Linux / macOS, from the repo root
./compact/compile.sh
```

That writes `compact/managed/kachis-guardrail` including proving keys. The console serves them at `/zk/kachis-guardrail/…`.

### Settle a job (funded Preprod wallet)

1. Install **1AM** (recommended), Lace, or Gero; enable Midnight; faucet **tNIGHT**; wait for **DUST**.
2. Proofs: **1AM in-wallet proving** (no Docker), **or** Lace with a local/remote proof server (`docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v`) / `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL`. Gero Cloud can prove but cannot balance contract txs yet.
3. Compile the contract (above).
4. Restart with `npm run dev` (webpack). Open Walkthrough (`/demo`), connect the wallet, confirm fee reserve, Load sample, Shield & Proceed. If settlement fails, nothing is recorded and the channel stays locked.
5. Guide rail shows a **settlement id** on success.

Optional: after the first deploy, set `NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS` so later sessions skip deploy.

```bash
cp .env.example .env.local
# optional OPENAI_API_KEY for a real model on shielded text only
# optional NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:6300
# optional NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS=mn_…
```

### Live Preprod proof (judges)

Compact `shield()` settled on **Preprod** with **1AM** (wallet-local proving — no Docker proof server). Public commitments only; the original paste never left the machine.

| Field | Value |
|---|---|
| Public commitment id | `#1` |
| Cleaned commitment | `0x0c04d0a3c1795eb8702f5332f82013283b7d309dea132a16d6a3f8f5e51ff76b` |
| Binding | `0x6807cf9e5b2963e78096d670398952886e98dfd8f5a8f4c137f151eb203640ec` |
| Settlement id | `0004be65181b38108650c2b392b6bae4e99fff26a163c858b46d7577dda156d1ac` |
| Tx hash | `dc7080a02d8a22e4be3d7992174aed9fd9e73b28abdef2c4fe37db8f4f9823db` |
| Contract | `d145333b792908a93fe7abacf5753ba8e63ecc6291bc76a901ebfed8f5f9f24f` |
| Network | Preprod |
| Seat (unshielded) | `mn_addr_preprod12sxshhkun6zmk5vdt8acw9lp7nylufj20enwg4ss56dr7v9cz5ms5t8rdu` |

Explorer links (use **Midnight Explorer Preprod** — Subscan often cannot resolve Compact contract txs):

- [Transaction](https://preprod.midnightexplorer.com/transactions/dc7080a02d8a22e4be3d7992174aed9fd9e73b28abdef2c4fe37db8f4f9823db)
- [Contract](https://preprod.midnightexplorer.com/contracts/d145333b792908a93fe7abacf5753ba8e63ecc6291bc76a901ebfed8f5f9f24f)
- [Block #2476854](https://preprod.midnightexplorer.com/blocks/2476854)
- [Seat on Subscan](https://midnight-preprod.subscan.io/account/mn_addr_preprod12sxshhkun6zmk5vdt8acw9lp7nylufj20enwg4ss56dr7v9cz5ms5t8rdu) (unshielded address only)
- [Preprod indexer GraphQL](https://indexer.preprod.midnight.network/api/v4/graphql) — `transactions(offset: { identifier: "0004be65…" })` → hash `dc7080a0…`

Analytics / Recent audits call `GET /api/shield`, which **reads the contract ledger from Preprod** (cleanedHash, binding, packFlags) and merges local findings. Explorer links use Midnight Explorer + `txHash`.

Status: **Settled.** The pack ran; the original stays on this machine.
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

Screen path for the video: landing → Walkthrough (`/demo`) → Connect Corporate Wallet (**1AM** preferred) → Load sample → Shield & Proceed → settlement id on the rail → Send on the shielded channel. Workspace (`/workspace`) is live paste only — no sample fill, no canned model reply. Optional: Identity balances (tNIGHT on Preprod).

Live Preprod settlement for judges: see **Live Preprod proof** above ([tx on Midnight Explorer](https://preprod.midnightexplorer.com/transactions/dc7080a02d8a22e4be3d7992174aed9fd9e73b28abdef2c4fe37db8f4f9823db)).

## Stack

Next.js 16, React 19, Tailwind v4, TypeScript. Scanner: `shared/`. UI copy: `lib/copy.ts`. Midnight.js 4.1.1 + Compact language 0.23 / compiler 0.31.x.

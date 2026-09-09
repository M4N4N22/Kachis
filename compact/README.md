# Kachis Compact contract

`kachis-guardrail.compact` is the Midnight notary for a shielded prompt.

## What is private vs public

| Witness / field | On chain? |
|---|---|
| Original paste | Never. Only `originalCommitment()` (SHA-256 of the paste) enters the circuit. |
| `cleanedHash` | Public. Commitment of the text that may go to an LLM. |
| `binding` | Public. In Compact this is `persistentHash(original, cleaned)` — a pair without the file. |
| `packFlags` | Public. Which filters ran (PII / financial / compliance). |

## Local vs circuit hash

- Console and MCP use **SHA-256** for `cleanedHash` and local `binding = sha256(originalHash:cleanedHash)`.
- Compact recomputes `binding` in-circuit with Midnight `persistentHash`. Those are not the same function. Do not treat the local hex as the on-chain binding.

The TypeScript values are the **public inputs** of `shield(cleanedHash, packFlags)` with witness `originalCommitment()`.

## Compile (required for Wave 1)

Requires the Compact compiler from [Midnight toolchain](https://docs.midnight.network/getting-started/installation) (**Linux / macOS / WSL** — not native Windows). Language `0.23` pairs with compiler **0.31.x**. Node 22+ for Midnight.js.

```bash
# WSL / Linux / macOS, from the repo root
chmod +x compact/compile.sh
./compact/compile.sh
```

Or:

```bash
compact update 0.31.1
compact compile compact/kachis-guardrail.compact compact/managed/kachis-guardrail
```

CI compiles the same command (`.github/workflows/compact-compile.yml`). Proving keys under `keys/` and `zkir/` are gitignored (large). After a successful compile, `.compiled` is written so the console can detect artifacts. Serve them from `/zk/kachis-guardrail/…`.

## Submit

With Lace connected on Preprod, a funded tNIGHT/DUST balance, and compile artifacts present:

Workspace → Shield & Proceed proves `shield()` and submits via the wallet. `/api/shield` still receives **hashes + tx id only** — never the paste.

If compile artifacts, DUST, or the wallet are missing, Shield is blocked or fails openly — the console does not pretend settlement succeeded.

## License

Apache License 2.0 (Buildathon Midnight-related code).

# Kachis Compact contract

`kachis-guardrail.compact` is the Midnight notary for a shielded prompt.

## What is private vs public

| Witness / field | On chain? |
|---|---|
| Original paste | Never. Only `originalCommitment()` (SHA-256) enters the circuit. |
| `cleanedHash` | Public. Commitment of the text that may go to an LLM. |
| `binding` | Public. In Compact this is `persistentHash(original, cleaned)` — a pair without the file. |
| `packFlags` | Public. Which filters ran (PII / financial / compliance). |

## Local vs circuit hash

Until `compact compile` + proof-server submit are wired:

- Console and MCP use **SHA-256** for `cleanedHash` and `binding = sha256(originalHash:cleanedHash)`.
- Compact will recompute `binding` in-circuit with Midnight `persistentHash`. Those are not the same function. Do not treat today's hex as an on-chain proof.

The TypeScript values are the **public shape** of `shield(cleanedHash, packFlags)` with witness `originalCommitment()`.

## Compile

Requires the Compact compiler from [Midnight toolchain](https://docs.midnight.network/getting-started/installation) (Linux/macOS or WSL).

```bash
compact compile compact/kachis-guardrail.compact
```

Proof server (Lace Midnight → Settings → Local) is probed when `MIDNIGHT_PROOF_SERVER_URL` is set. Circuit submit is the next wiring step after compile succeeds.

## License

Apache License 2.0 (Buildathon Midnight-related code).

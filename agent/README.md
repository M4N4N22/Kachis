# Kachis Agent v1 (MCP)

Local MCP server. The host agent (Cursor, Claude Desktop) must call `kachis_shield` before a raw paste leaves the laptop.

Same scanner as the web console (`shared/`). Original plaintext is not in the tool result.

## Run

From this folder:

```bash
npm install
npm start
```

Optional: `KACHIS_CONSOLE_URL` (default `http://localhost:3000`) posts the **public** commitment to the console notary log. The original paste is never posted.

## Cursor / Claude MCP config

```json
{
  "mcpServers": {
    "kachis-agent": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "PATH/TO/next-app/agent",
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000"
      }
    }
  }
}
```

On Windows, set `cwd` to your full path, e.g. `C:\\dev\\buildathons\\midnight-buildathon\\Kachina\\next-app\\agent`.

## Tool

`kachis_shield`

- Input: raw `text` + optional pack toggles (identifiers, financials, secrets, code, client records)
- Defaults: all five packs on (institutional)
- Output: `shielded_prompt`, `cleaned_commitment`, `binding`, findings, circuit id, optional `ledger_id`
- Host must send **only** `shielded_prompt` to the model — never the original paste

Resource: `kachis://circuit` describes Compact public vs private fields.

Compact on-chain submit is not invoked from MCP yet. Commitments match the public shape of `compact/kachis-guardrail.compact`.

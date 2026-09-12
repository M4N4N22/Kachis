# Kachis Agent (`@kachis/agent`)

Local MCP server for Cursor, Claude Desktop, and other MCP hosts.

Host flow: **`kachis_shield` → model sees only `shielded_prompt` → `kachis_restore`**.

Same scanner as the console (`@kachis/shield` / `shared/`). Original plaintext is never in the tool result. Token maps stay in process memory on this machine.

**Settle mode:** commitment-only. Public `cleanedHash` / `binding` / `packFlags` post to the console. Compact on-chain settle remains the console wallet path.

## Install

### From this repo (dev)

```bash
cd agent
npm install
npm run build
npm start
```

### Host config (published package)

```json
{
  "mcpServers": {
    "kachis-agent": {
      "command": "npx",
      "args": ["-y", "@kachis/agent"],
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000",
        "KACHIS_SEAT_KEY": ""
      }
    }
  }
}
```

Until `@kachis/agent` is on npm, point the host at the built binary:

```json
{
  "mcpServers": {
    "kachis-agent": {
      "command": "node",
      "args": ["PATH/TO/next-app/agent/dist/cli.js"],
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000",
        "KACHIS_SEAT_KEY": ""
      }
    }
  }
}
```

Or use Integrations in the console to copy config.

## Environment

| Variable | Purpose |
|---|---|
| `KACHIS_CONSOLE_URL` | Console origin (default `http://localhost:3000`) |
| `KACHIS_SEAT_KEY` | Machine seat key when console has `KACHIS_SEAT_KEYS` set |
| `KACHIS_TIER` | `institutional` (default) or `freelancer` pack defaults when console policy is unreachable |

## Tools

| Tool | Job |
|---|---|
| `kachis_shield` | Scan raw paste; return shielded prompt + commitments; post public commitment |
| `kachis_restore` | Restore insulation tokens in a model reply (local only) |
| `kachis_status` | Console health + policy + seat check |

Resources: `kachis://status`, `kachis://circuit`.

## Verify

With the console running:

```bash
curl http://localhost:3000/api/agent/health
```

Then call `kachis_status` from the host.

# Kachis browser companion

Chrome / Brave / Edge (MV3) extension that pauses ChatGPT submit, shields the composer on-device, and posts **public commitments only** to the console.

## Build

```bash
cd extension
npm install
npm run build
```

Load unpacked: Chrome → Extensions → Developer mode → **Load unpacked** → select `extension/dist`.

## Options

- Console URL (default `http://localhost:3000`)
- Optional machine seat key (`KACHIS_SEAT_KEYS` on the console)
- Enable / disable intercept

## Scope (MVP)

- Hosts: `chatgpt.com`, `chat.openai.com`
- Scanner: rule packs only (`runShieldLite` — no on-device NER in the worker)
- Settle: commitment-only (same as MCP)

Replace placeholder icons in `dist/icons/` before a store listing.

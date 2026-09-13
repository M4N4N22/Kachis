# Kachis browser companion

Chrome / Brave / Edge (MV3) extension that pauses ChatGPT submit, shields the composer on-device, and posts **public commitments only** to the console.

## Build (dev / judges)

```bash
cd extension
npm install
npm run build
```

Load unpacked: Chrome → Extensions → Developer mode → **Load unpacked** → select `extension/dist`.

## Store publish

See [`STORE.md`](./STORE.md) for the Chrome Web Store checklist, listing copy, and zip steps.

```bash
npm run build
npm run pack   # writes extension/kachis-companion.zip
```

After the listing is live, set on the console:

```bash
NEXT_PUBLIC_KACHIS_EXTENSION_STORE_URL=https://chromewebstore.google.com/detail/...
```

Privacy policy for review: `/privacy/companion` on the console host.

## Options

Toolbar **popup** (click the Kachis icon):

- Enable / pause companion
- Pack toggles: Identifiers, Financials, Secrets, Source, Client
- Console URL + optional seat key
- Verify console

Full settings page: right-click icon → Options (same controls, wider layout).

## Scope (MVP)

- Hosts: `chatgpt.com`, `chat.openai.com`
- Scanner: rule packs **+ on-device NER** via an offscreen document (`@huggingface/transformers`). ONNX WASM is packaged under `dist/ort/` (MV3 cannot load CDN runtime scripts). First shield may download the model weights from Hugging Face; if NER fails, falls back to rule packs and the banner says so.
- Submit is **hard-gated**: shield → confirm → **verify** insulated text is locked into ChatGPT’s composer (ProseMirror-safe write) → only then send. If rewrite does not stick, send is blocked.
- Assistant replies that still contain `[PERSON_1]`-style tokens are **restored locally** after the stream settles (full-bubble `innerText`, not per-span). Secrets stay masked.
- Console: public commitment post; Compact settle stays on the console wallet path

Icons are rendered from `icons/icon.svg` on each build (`16` / `48` / `128`).

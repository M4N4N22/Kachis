# Chrome Web Store — Kachis companion checklist

Use this when moving from load-unpacked to a store install. Target: **Chrome Web Store** first (unlisted or private), then Edge Add-ons.

## Before you submit

- [ ] Replace placeholder icons in `extension/icons/` with brand assets: **16 / 48 / 128** PNG (128 required; 440×280 promo tile recommended)
- [ ] Bump `version` in `manifest.json` for every upload
- [ ] Confirm host permissions are minimal: ChatGPT origins + console origin only (no `https://*/*`)
- [ ] Privacy policy live at a public HTTPS URL (shipped as `/privacy/companion` on the console)
- [ ] Single-purpose description matches store listing (shield paste on ChatGPT; originals stay on device)
- [ ] Screenshots: pause/confirm modal, options page, Integrations install card (1280×800 or 640×400)
- [ ] Test on a clean Chrome profile after packing: shield → confirm → commitment in console

## Developer account

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time registration fee
3. Create item → **Upload** zip of `extension/dist` (manifest at zip root)

```bash
cd extension
npm install
npm run build
# zip contents of dist/ (not the dist folder itself)
```

## Listing copy (draft)

**Name:** Kachis  
**Summary:** Shield sensitive ChatGPT paste on this device before it leaves the browser.  
**Category:** Productivity (or Privacy & Security if available)  
**Language:** English  

**Detailed description:**

Kachis pauses ChatGPT submit when the composer may contain sensitive data. Scanning runs on this device. Only an insulated remainder can be sent to the model. Public commitments can post to your Kachis console — the original paste is never uploaded.

Hosts: chatgpt.com. Configure your console URL and optional machine seat key in Options.

**Permission justification (review form):**

- `storage` — save console URL, seat key, enable flag  
- `activeTab` / host access to ChatGPT — read composer and rewrite after user confirms  
- host access to console origin — POST public commitments only (`cleanedHash`, `binding`, `packFlags`)

## Visibility

| Mode | Use when |
|---|---|
| **Unlisted** | Demo / judges / early customers (link-only install) |
| **Private** | Domain-restricted testers |
| **Public** | After privacy + review are solid |

Set the published URL in console env:

```bash
NEXT_PUBLIC_KACHIS_EXTENSION_STORE_URL=https://chromewebstore.google.com/detail/...
```

Integrations shows **Install** when this is set; otherwise it shows load-unpacked steps.

## Enterprise (optional)

For managed fleets, prefer force-install via Google Admin / Intune using the store item ID or a self-hosted CRX policy — seats do not need Developer mode.

## Edge

After Chrome listing is stable, submit the same package to [Microsoft Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview).

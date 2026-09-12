import {
  defaultTogglesForTier,
  runShieldLite,
  type GuardrailToggles,
  type TokenMap,
} from "../../shared/shield-browser.ts";

type Settings = {
  consoleUrl: string;
  seatKey: string;
  enabled: boolean;
};

type ShieldRequest = {
  type: "kachis_shield";
  text: string;
};

type ShieldResponse = {
  ok: true;
  shielded_prompt: string;
  cleaned_commitment: string;
  binding: string;
  pack_flags: number;
  findings: unknown;
  notary_status: string;
} | {
  ok: false;
  error: string;
};

const sessionMaps = new Map<string, TokenMap>();

const DEFAULTS: Settings = {
  consoleUrl: "http://localhost:3000",
  seatKey: "",
  enabled: true,
};

async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return {
    consoleUrl: String(stored.consoleUrl || DEFAULTS.consoleUrl).replace(/\/$/, ""),
    seatKey: String(stored.seatKey || ""),
    enabled: stored.enabled !== false,
  };
}

function seatHeaders(seatKey: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (seatKey) {
    headers["X-Kachis-Seat-Key"] = seatKey;
    headers.Authorization = `Bearer ${seatKey}`;
  }
  return headers;
}

chrome.runtime.onMessage.addListener((message: ShieldRequest, _sender, sendResponse) => {
  if (message?.type !== "kachis_shield") return;
  void (async () => {
    try {
      const settings = await loadSettings();
      if (!settings.enabled) {
        sendResponse({ ok: false, error: "Kachis companion is disabled in options." } satisfies ShieldResponse);
        return;
      }

      const toggles: GuardrailToggles = defaultTogglesForTier("institutional");
      const result = await runShieldLite(message.text, toggles);
      sessionMaps.set(result.cleanedHash, result.tokenMap);

      let notaryStatus = "local-only";
      try {
        const response = await fetch(`${settings.consoleUrl}/api/shield`, {
          method: "POST",
          headers: seatHeaders(settings.seatKey),
          body: JSON.stringify({
            cleanedHash: result.cleanedHash,
            binding: result.binding,
            packFlags: result.packFlags,
            findings: result.findings,
            attestedAt: result.attestedAt,
            source: "extension",
            note: "Browser companion commitment-only. Original paste stayed in the browser.",
          }),
        });
        if (response.ok) {
          const body = (await response.json()) as { status?: string };
          notaryStatus = body.status ?? "committed-local";
        } else {
          notaryStatus = `console-error:${response.status}`;
        }
      } catch {
        notaryStatus = "local-only";
      }

      sendResponse({
        ok: true,
        shielded_prompt: result.text,
        cleaned_commitment: result.cleanedHash,
        binding: result.binding,
        pack_flags: result.packFlags,
        findings: result.findings,
        notary_status: notaryStatus,
      } satisfies ShieldResponse);
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Shield failed.",
      } satisfies ShieldResponse);
    }
  })();
  return true;
});

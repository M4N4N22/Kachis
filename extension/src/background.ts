import { restoreFromTokenMap } from "../../shared/restore.ts";
import type { GuardrailToggles, TokenMap } from "../../shared/types.ts";
import { loadSettings } from "./settings.ts";

type ShieldRequest = {
  type: "kachis_shield";
  text: string;
};

type RestoreRequest = {
  type: "kachis_restore";
  cleanedCommitment: string;
  modelText: string;
};

type ShieldResponse =
  | {
      ok: true;
      shielded_prompt: string;
      cleaned_commitment: string;
      binding: string;
      pack_flags: number;
      findings: unknown;
      findings_count: number;
      notary_status: string;
      ner_fallback?: boolean;
      token_map: TokenMap;
    }
  | {
      ok: false;
      error: string;
    };

type OffscreenOk = {
  ok: true;
  text: string;
  findings: { count: number }[];
  tokenMap: TokenMap;
  packFlags: number;
  cleanedHash: string;
  binding: string;
  circuit: string;
  attestedAt: string;
  nerFallback?: boolean;
};

const sessionMaps = new Map<string, TokenMap>();
const SESSION_LIMIT = 32;
let offscreenReady: Promise<void> | null = null;

function rememberMap(cleanedHash: string, tokenMap: TokenMap) {
  sessionMaps.set(cleanedHash, tokenMap);
  while (sessionMaps.size > SESSION_LIMIT) {
    const oldest = sessionMaps.keys().next().value;
    if (!oldest) break;
    sessionMaps.delete(oldest);
  }
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureOffscreen() {
  if (offscreenReady) return offscreenReady;
  offscreenReady = (async () => {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    if (contexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["WORKERS"],
        justification: "Run on-device NER while shielding ChatGPT paste",
      });
    }
    for (let i = 0; i < 40; i++) {
      try {
        const ping = (await chrome.runtime.sendMessage({
          type: "kachis_offscreen_ping",
        })) as { ok?: boolean } | undefined;
        if (ping?.ok) return;
      } catch {
        /* booting */
      }
      await delay(100);
    }
    throw new Error("On-device scanner failed to start.");
  })().catch((error) => {
    offscreenReady = null;
    throw error;
  });
  return offscreenReady;
}

async function runOffscreenShield(text: string, toggles: GuardrailToggles) {
  await ensureOffscreen();
  return (await chrome.runtime.sendMessage({
    type: "kachis_offscreen_shield",
    text,
    toggles,
  })) as OffscreenOk | { ok: false; error: string };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "kachis_offscreen_ping") return;
  if (message?.type === "kachis_offscreen_shield") return;

  if (message?.type === "kachis_restore") {
    const req = message as RestoreRequest;
    const map = sessionMaps.get(req.cleanedCommitment);
    if (!map) {
      sendResponse({
        ok: false,
        error: "No local token map for that commitment.",
        restored_text: req.modelText,
      });
      return true;
    }
    sendResponse({
      ok: true,
      restored_text: restoreFromTokenMap(req.modelText, map, {
        includeSecrets: false,
      }),
    });
    return true;
  }

  if (message?.type !== "kachis_shield") return;
  const req = message as ShieldRequest;

  void (async () => {
    try {
      const settings = await loadSettings();
      if (!settings.enabled) {
        sendResponse({
          ok: false,
          error: "Kachis companion is paused. Enable it from the toolbar popup.",
        } satisfies ShieldResponse);
        return;
      }

      const offscreen = await runOffscreenShield(req.text, settings.toggles);
      if (!offscreen || !offscreen.ok) {
        sendResponse({
          ok: false,
          error:
            !offscreen || !("error" in offscreen)
              ? "On-device shield failed."
              : offscreen.error,
        } satisfies ShieldResponse);
        return;
      }

      rememberMap(offscreen.cleanedHash, offscreen.tokenMap);

      const findingsCount = offscreen.findings.reduce(
        (sum, item) => sum + (item.count || 0),
        0,
      );

      let notaryStatus = "local-only";
      try {
        const response = await fetch(`${settings.consoleUrl}/api/shield`, {
          method: "POST",
          headers: seatHeaders(settings.seatKey),
          body: JSON.stringify({
            cleanedHash: offscreen.cleanedHash,
            binding: offscreen.binding,
            packFlags: offscreen.packFlags,
            findings: offscreen.findings,
            attestedAt: offscreen.attestedAt,
            source: "extension",
            note: offscreen.nerFallback
              ? "Browser companion commitment (rules fallback). Original stayed in the browser."
              : "Browser companion commitment (rules + on-device NER). Original stayed in the browser.",
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
        shielded_prompt: offscreen.text,
        cleaned_commitment: offscreen.cleanedHash,
        binding: offscreen.binding,
        pack_flags: offscreen.packFlags,
        findings: offscreen.findings,
        findings_count: findingsCount,
        notary_status: notaryStatus,
        ner_fallback: Boolean(offscreen.nerFallback),
        token_map: offscreen.tokenMap,
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

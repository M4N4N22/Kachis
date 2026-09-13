/**
 * Offscreen document — runs on-device NER + rule packs.
 * Service workers cannot reliably host Transformers.js / WASM.
 *
 * MV3 CSP blocks CDN-loaded onnxruntime .mjs/.wasm — we point wasmPaths at
 * packaged `ort/` assets (copied at build) and keep threads/proxy off.
 */
import { env } from "@huggingface/transformers";
import {
  nerPipelineReady,
  runShield,
  runShieldLite,
  type GuardrailToggles,
} from "../../shared/index.ts";

env.allowLocalModels = false;
env.useBrowserCache = true;
// Packaged next to the extension (see build.mjs). Do not fetch CDN workers.
const onnxWasm = (env.backends.onnx.wasm ??= {} as {
  wasmPaths?: string;
  numThreads?: number;
  proxy?: boolean;
});
onnxWasm.wasmPaths = chrome.runtime.getURL("ort/");
onnxWasm.numThreads = 1;
onnxWasm.proxy = false;

type ShieldJob = {
  type: "kachis_offscreen_shield";
  text: string;
  toggles: GuardrailToggles;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "kachis_offscreen_ping") {
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type !== "kachis_offscreen_shield") return;
  const job = message as ShieldJob;
  void (async () => {
    try {
      const result = await runShield(job.text, job.toggles, { ner: true });
      // detectNerHits soft-returns [] when the model never loads — surface that.
      const nerOk = await nerPipelineReady();
      sendResponse({
        ok: true,
        text: result.text,
        findings: result.findings,
        tokenMap: result.tokenMap,
        packFlags: result.packFlags,
        cleanedHash: result.cleanedHash,
        binding: result.binding,
        circuit: result.circuit,
        attestedAt: result.attestedAt,
        nerFallback: !nerOk,
      });
    } catch (error) {
      try {
        const result = await runShieldLite(job.text, job.toggles);
        sendResponse({
          ok: true,
          text: result.text,
          findings: result.findings,
          tokenMap: result.tokenMap,
          packFlags: result.packFlags,
          cleanedHash: result.cleanedHash,
          binding: result.binding,
          circuit: result.circuit,
          attestedAt: result.attestedAt,
          nerFallback: true,
        });
      } catch (fallbackError) {
        sendResponse({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : fallbackError instanceof Error
                ? fallbackError.message
                : "Offscreen shield failed.",
        });
      }
    }
  })();
  return true;
});

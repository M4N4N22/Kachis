import { copy } from "@/lib/copy";

function flattenErrorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;

  while (current != null && depth < 6) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (current instanceof Error) {
      if (current.name) parts.push(current.name);
      if (current.message) parts.push(current.message);
      current = current.cause;
      depth += 1;
      continue;
    }
    if (current && typeof current === "object") {
      const record = current as {
        name?: unknown;
        message?: unknown;
        error?: unknown;
        cause?: unknown;
      };
      if (typeof record.name === "string") parts.push(record.name);
      if (typeof record.message === "string") parts.push(record.message);
      if (typeof record.error === "string") parts.push(record.error);
      current = record.cause;
      depth += 1;
      continue;
    }
    parts.push(String(current));
    break;
  }

  return parts.filter(Boolean).join(" · ");
}

/** Map wallet / settle noise into short product copy. */
export function humanizeSettleError(error: unknown): string {
  const raw = (typeof error === "string" ? error : flattenErrorText(error)).trim();
  const text = raw || copy.action.settleFailed;

  if (
    /user rejected|rejected the request|user denied|denied by the user|request rejected|user cancelled|user canceled|rejected by user/i.test(
      text,
    )
  ) {
    return copy.action.walletRejected;
  }

  if (/balanceUnsealedTransaction/i.test(text) && /not yet implemented/i.test(text)) {
    return copy.action.geroBalanceUnsupported;
  }

  if (/required policy pack not attested/i.test(text)) {
    return copy.action.requiredPackNotAttested;
  }

  if (
    /6300|proof.?server|proverServerUri|ECONNREFUSED/i.test(text) ||
    (/prove/i.test(text) && /127\.0\.0\.1|localhost/i.test(text))
  ) {
    return copy.action.proofServerUnreachable;
  }

  if (
    /getProvingProvider|proving provider|wallet proving|asKeyMaterialProvider/i.test(text)
  ) {
    return copy.action.walletProvingUnavailable;
  }

  if (
    /zk\/kachis-guardrail|shield\.prover|verifierKey|zkir|artifacts/i.test(text) ||
    (/Failed to fetch/i.test(text) && /zk|prover|key material/i.test(text))
  ) {
    return copy.action.settleArtifactsMissing;
  }

  if (/WebSocket|isomorphic-ws|Export .* doesn't exist|CostModel|ledger WASM/i.test(text)) {
    return copy.action.settleBundleFailed;
  }

  if (/decrypt|private state|Corrupt/i.test(text)) {
    return copy.action.privateStateCorrupt;
  }

  if (
    /Request failed|InternalError|wallet was still waking|did not respond/i.test(text)
  ) {
    return copy.action.walletBusy;
  }

  if (/Connect a Midnight wallet|wallet session|not connected|Disconnected/i.test(text)) {
    return copy.action.reconnectWallet;
  }

  // Already product copy — pass through.
  if (
    text === copy.action.settleFailed ||
    text === copy.action.walletRejected ||
    text === copy.action.geroBalanceUnsupported ||
    text === copy.action.proofServerUnreachable ||
    text === copy.action.walletProvingUnavailable ||
    text === copy.action.settleArtifactsMissing ||
    text === copy.action.settleBundleFailed ||
    text === copy.action.privateStateCorrupt ||
    text === copy.action.reconnectWallet ||
    text === copy.action.walletBusy ||
    text === copy.action.requiredPackNotAttested ||
    text === copy.action.walletRequiredHint ||
    text === copy.action.fundRequiredHint ||
    text === copy.pack.required
  ) {
    return text;
  }

  // Strip nested Error: prefixes and keep a short readable sentence when safe.
  const cleaned = text
    .replace(/^Unexpected error submitting scoped transaction[^:]*:\s*/i, "")
    .replace(/Error:\s*/g, "")
    .replace(/'check' returned an error:\s*/gi, "")
    .replace(/\s·\s+/g, " ")
    .trim();

  if (/user rejected|rejected the request/i.test(cleaned)) {
    return copy.action.walletRejected;
  }

  if (cleaned.length > 0 && cleaned.length <= 140 && !/stack|undefined|null|\[object/i.test(cleaned)) {
    return cleaned;
  }

  return copy.action.settleFailed;
}

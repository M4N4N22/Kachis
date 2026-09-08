export type NotaryStatus = "committed-local" | "proof-server-reachable";

export type NotaryReceipt = {
  status: NotaryStatus;
  proofServer: string | null;
  note: string;
};

function proofServerUrl() {
  return process.env.MIDNIGHT_PROOF_SERVER_URL?.replace(/\/$/, "") || null;
}

/** Probe Lace's local proof server. Does not submit a circuit until compact compile lands. */
export async function probeProofServer(): Promise<NotaryReceipt> {
  const url = proofServerUrl();
  if (!url) {
    return {
      status: "committed-local",
      proofServer: null,
      note: "Public commitment recorded. Compact on-chain submit needs compact compile + MIDNIGHT_PROOF_SERVER_URL.",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timer);

    if (response.ok || response.status === 404 || response.status === 405) {
      return {
        status: "proof-server-reachable",
        proofServer: url,
        note: "Proof server is up. Circuit submit is not wired until kachis-guardrail compiles.",
      };
    }
  } catch {
    /* fall through */
  }

  return {
    status: "committed-local",
    proofServer: url,
    note: "Proof server did not respond. Public commitment is still recorded locally.",
  };
}

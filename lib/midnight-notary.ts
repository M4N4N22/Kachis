export type NotaryStatus = "committed-local" | "proof-server-reachable" | "settled";

export type NotaryReceipt = {
  status: NotaryStatus;
  proofServer: string | null;
  note: string;
  txId?: string;
  contractAddress?: string;
  network?: string;
};

function proofServerUrl() {
  return (
    process.env.MIDNIGHT_PROOF_SERVER_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL?.replace(/\/$/, "") ||
    null
  );
}

/** Probe Lace's local proof server. Settlement itself runs in the browser via the connected wallet. */
export async function probeProofServer(): Promise<NotaryReceipt> {
  const url = proofServerUrl();
  if (!url) {
    return {
      status: "committed-local",
      proofServer: null,
      note: "Public commitment recorded locally. Connect a funded wallet to settle.",
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
        note: "Verification service is up. Settlement still needs a funded wallet.",
      };
    }
  } catch {
    /* fall through */
  }

  return {
    status: "committed-local",
    proofServer: url,
    note: "Verification service did not respond. Public commitment is still recorded locally.",
  };
}

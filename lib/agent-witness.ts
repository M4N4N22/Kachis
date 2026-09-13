import { bindingHex } from "@/shared/commit";

export type AgentWitness = {
  originalHash: string;
  cleanedHash: string;
  binding: string;
  packFlags: number;
  findings: unknown;
  attestedAt: string;
};

export function witnessBridgeUrl(): string {
  return (
    process.env.NEXT_PUBLIC_KACHIS_WITNESS_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3847"
  );
}

export async function probeWitnessBridge(): Promise<{
  ok: boolean;
  pending?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${witnessBridgeUrl()}/health`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: `Witness bridge returned ${response.status}` };
    }
    const body = (await response.json()) as { ok?: boolean; pending?: number };
    return { ok: Boolean(body.ok), pending: body.pending };
  } catch {
    return {
      ok: false,
      error:
        "Agent witness bridge unreachable. Keep Kachis Agent MCP running on this machine.",
    };
  }
}

export async function fetchAgentWitness(
  cleanedHash: string,
): Promise<{ ok: true; witness: AgentWitness } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${witnessBridgeUrl()}/witness/${encodeURIComponent(cleanedHash)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error:
          body?.error ??
          "No local witness for this commitment. Re-run kachis_shield while the agent is connected.",
      };
    }
    const witness = (await response.json()) as AgentWitness;
    if (!witness.originalHash || !witness.cleanedHash || !witness.binding) {
      return { ok: false, error: "Witness payload incomplete." };
    }
    const expected = await bindingHex(witness.originalHash, witness.cleanedHash);
    if (expected.toLowerCase() !== witness.binding.toLowerCase()) {
      return { ok: false, error: "Witness binding mismatch — refusing settle." };
    }
    if (witness.cleanedHash.toLowerCase() !== cleanedHash.toLowerCase()) {
      return { ok: false, error: "Witness cleanedHash mismatch." };
    }
    return { ok: true, witness };
  } catch {
    return {
      ok: false,
      error:
        "Agent witness bridge unreachable. Keep Kachis Agent MCP running on this machine.",
    };
  }
}

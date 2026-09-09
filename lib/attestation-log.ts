import type { GuardrailFinding } from "@/shared/types";
import type { NotaryStatus } from "@/lib/midnight-notary";

export type AttestationSource = "console" | "agent";

export type PublicAttestation = {
  id: string;
  ledgerId: number;
  cleanedHash: string;
  binding: string;
  packFlags: number;
  findings: GuardrailFinding[];
  circuit: string;
  attestedAt: string;
  status: NotaryStatus;
  source: AttestationSource;
  walletAddress?: string;
  note: string;
  txId?: string;
  contractAddress?: string;
  network?: string;
};

const attestations: PublicAttestation[] = [];

export function recordAttestation(
  entry: Omit<PublicAttestation, "id" | "ledgerId">,
): PublicAttestation {
  const ledgerId = attestations.length + 1;
  const saved: PublicAttestation = {
    id: String(ledgerId),
    ledgerId,
    ...entry,
  };
  attestations.unshift(saved);
  return saved;
}

export function listAttestations(limit = 20) {
  return attestations.slice(0, limit);
}

export function findAttestationByHash(cleanedHash: string) {
  return attestations.find((item) => item.cleanedHash === cleanedHash) ?? null;
}

export function attestationStats() {
  const blockedSecrets = attestations.reduce(
    (sum, item) =>
      sum + (item.findings.find((finding) => finding.kind === "compliance")?.count ?? 0),
    0,
  );
  const leaksPrevented = attestations.reduce(
    (sum, item) =>
      sum + item.findings.reduce((inner, finding) => inner + finding.count, 0),
    0,
  );

  return {
    proofsGenerated: attestations.length,
    blockedSecrets,
    leaksPrevented,
  };
}

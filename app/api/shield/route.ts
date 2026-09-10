import { NextResponse } from "next/server";
import {
  enrichAttestationsFromChain,
  findAttestationByHash,
  listAttestations,
  recordAttestation,
  type AttestationSource,
} from "@/lib/attestation-log";
import {
  fetchAttestationsFromChain,
  KNOWN_PREPROD_CONTRACT,
  mergeLocalAndChain,
  resolveContractAddressFromSettlement,
} from "@/lib/midnight-chain-attestations";
import { probeProofServer } from "@/lib/midnight-notary";
import { CIRCUIT_ID, type GuardrailFinding } from "@/shared/types";
import { isCommitmentHex } from "@/shared/commit";

export const dynamic = "force-dynamic";

type ShieldBody = {
  cleanedHash?: string;
  binding?: string;
  packFlags?: number;
  findings?: GuardrailFinding[];
  attestedAt?: string;
  source?: AttestationSource;
  walletAddress?: string;
  txId?: string;
  contractAddress?: string;
  network?: string;
  status?: "committed-local" | "proof-server-reachable" | "settled";
  note?: string;
  original?: unknown;
  text?: unknown;
  prompt?: unknown;
};

export async function POST(request: Request) {
  let body: ShieldBody;
  try {
    body = (await request.json()) as ShieldBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.original != null || body.text != null || body.prompt != null) {
    return NextResponse.json(
      { error: "Original paste is not accepted. Send cleanedHash and binding only." },
      { status: 400 },
    );
  }

  if (!body.cleanedHash || !body.binding) {
    return NextResponse.json(
      { error: "cleanedHash and binding are required." },
      { status: 400 },
    );
  }

  if (!isCommitmentHex(body.cleanedHash) || !isCommitmentHex(body.binding)) {
    return NextResponse.json(
      { error: "Commitments must be 32-byte hex (0x + 64 chars)." },
      { status: 400 },
    );
  }

  const existing = await findAttestationByHash(body.cleanedHash);
  if (existing && existing.binding === body.binding) {
    if (body.status === "settled" && body.txId && !existing.txId) {
      const updated = await recordAttestation({
        cleanedHash: existing.cleanedHash,
        binding: existing.binding,
        packFlags: existing.packFlags,
        findings: existing.findings,
        circuit: existing.circuit,
        attestedAt: existing.attestedAt,
        source: existing.source,
        walletAddress: body.walletAddress ?? existing.walletAddress,
        status: "settled",
        txId: body.txId,
        contractAddress: body.contractAddress ?? existing.contractAddress,
        network: body.network ?? existing.network,
        note: "Settled. The pack ran; the original stays on this machine.",
        onChain: true,
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json(existing);
  }

  const notary = await probeProofServer();
  const settled = body.status === "settled" && typeof body.txId === "string" && body.txId.length > 0;
  const walkthrough =
    body.network === "walkthrough" ||
    (typeof body.txId === "string" && body.txId.startsWith("walkthrough_"));
  const recorded = await recordAttestation({
    cleanedHash: body.cleanedHash,
    binding: body.binding,
    packFlags: body.packFlags ?? 0,
    findings: body.findings ?? [],
    circuit: CIRCUIT_ID,
    attestedAt: body.attestedAt ?? new Date().toISOString(),
    status: settled ? "settled" : notary.status,
    source: body.source === "agent" ? "agent" : "console",
    walletAddress: body.walletAddress,
    txId: settled ? body.txId : undefined,
    contractAddress: walkthrough ? undefined : body.contractAddress,
    network: body.network,
    onChain: settled && !walkthrough ? true : undefined,
    note: settled
      ? (body.note ?? "Settled. The pack ran; the original stays on this machine.")
      : (body.note ?? notary.note),
  });

  return NextResponse.json(recorded);
}

export async function GET() {
  const local = await listAttestations(40);
  const enrichedLocal = await enrichAttestationsFromChain(local);

  const settlementHint =
    enrichedLocal.find((row) => row.txId)?.txId ||
    "0004be65181b38108650c2b392b6bae4e99fff26a163c858b46d7577dda156d1ac";
  const contractAddress =
    process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim() ||
    enrichedLocal.find((row) => row.contractAddress)?.contractAddress ||
    (await resolveContractAddressFromSettlement(settlementHint)) ||
    KNOWN_PREPROD_CONTRACT;

  let chain: Awaited<ReturnType<typeof fetchAttestationsFromChain>> = [];
  try {
    chain = await fetchAttestationsFromChain(contractAddress);
  } catch {
    chain = [];
  }

  const attestations = mergeLocalAndChain(enrichedLocal, chain).slice(0, 20);
  return NextResponse.json({
    attestations,
    contractAddress,
    source: chain.length ? "chain+local" : "local",
  });
}

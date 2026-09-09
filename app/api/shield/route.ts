import { NextResponse } from "next/server";
import {
  findAttestationByHash,
  listAttestations,
  recordAttestation,
  type AttestationSource,
} from "@/lib/attestation-log";
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

  const existing = findAttestationByHash(body.cleanedHash);
  if (existing && existing.binding === body.binding) {
    return NextResponse.json(existing);
  }

  const notary = await probeProofServer();
  const settled = body.status === "settled" && typeof body.txId === "string" && body.txId.length > 0;
  const recorded = recordAttestation({
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
    contractAddress: body.contractAddress,
    network: body.network,
    note: settled
      ? "Settled. The pack ran; the original stays on this machine."
      : (body.note ?? notary.note),
  });

  return NextResponse.json(recorded);
}

export async function GET() {
  return NextResponse.json({ attestations: listAttestations() });
}

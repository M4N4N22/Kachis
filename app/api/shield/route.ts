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
import { authenticateSeat } from "@/lib/seat-auth";
import { CIRCUIT_ID, type GuardrailFinding } from "@/shared/types";
import { isCommitmentHex } from "@/shared/commit";
import {
  enforceRequiredPackEnabled,
  meetsRequiredPack,
  requiredPackFromEnv,
} from "@/shared/policy";

export const dynamic = "force-dynamic";

function resolveSource(raw: unknown): AttestationSource {
  if (raw === "agent" || raw === "extension" || raw === "chain" || raw === "console") {
    return raw;
  }
  return "console";
}

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

  const source = resolveSource(body.source);
  const seat = authenticateSeat(request, source);
  if (!seat.ok) {
    return NextResponse.json({ error: seat.error }, { status: seat.status });
  }

  const packFlags = body.packFlags ?? 0;
  const walkthrough =
    body.network === "walkthrough" ||
    (typeof body.txId === "string" && body.txId.startsWith("walkthrough_"));

  // Soft required-pack gate (mirrors Compact requiredPack after redeploy).
  // Skip for labeled walkthrough so /demo stays usable with sandbox defaults.
  if (enforceRequiredPackEnabled() && !walkthrough) {
    const required = requiredPackFromEnv();
    if (required > 0 && !meetsRequiredPack(packFlags, required)) {
      return NextResponse.json(
        {
          error:
            "Required policy not attested. Enable every mandatory filter before shield.",
        },
        { status: 403 },
      );
    }
  }

  const seatNote =
    source === "agent" || source === "extension"
      ? `Seat ${seat.label} (${seat.seatId}). `
      : "";

  try {
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
          seatId: existing.seatId,
          walletAddress: body.walletAddress ?? existing.walletAddress,
          status: "settled",
          txId: body.txId,
          contractAddress: body.contractAddress ?? existing.contractAddress,
          network: body.network ?? existing.network,
          note: "Settled. Verification ran; the original stays on this machine.",
          onChain: true,
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json(existing);
    }

    const notary = await probeProofServer();
    const settled =
      body.status === "settled" && typeof body.txId === "string" && body.txId.length > 0;
    const recorded = await recordAttestation({
      cleanedHash: body.cleanedHash,
      binding: body.binding,
      packFlags,
      findings: body.findings ?? [],
      circuit: CIRCUIT_ID,
      attestedAt: body.attestedAt ?? new Date().toISOString(),
      status: settled ? "settled" : notary.status,
      source,
      seatId:
        source === "agent" || source === "extension" ? seat.seatId : undefined,
      walletAddress: body.walletAddress,
      txId: settled ? body.txId : undefined,
      contractAddress: walkthrough ? undefined : body.contractAddress,
      network: body.network,
      onChain: settled && !walkthrough ? true : undefined,
      note: settled
        ? (body.note ?? `${seatNote}Settled. Verification ran; the original stays on this machine.`)
        : (body.note ?? `${seatNote}${notary.note}`),
    });

    return NextResponse.json(recorded);
  } catch (error) {
    console.error("[kachis] /api/shield record failed", error);
    return NextResponse.json(
      {
        error:
          "Console log could not be saved. Settlement on Preprod is unchanged — check Supabase attestations table.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const local = await listAttestations(80);
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

  const ledgerLive = chain.length > 0;
  const chainHashes = new Set(
    chain.map((row) => row.cleanedHash.toLowerCase()),
  );
  const attestations = mergeLocalAndChain(enrichedLocal, chain).slice(0, 80);

  /** Live Preprod ledger only — excludes seed/local until indexer returns contract state. */
  const ledgerAttestations = ledgerLive
    ? attestations.filter((row) => {
        const walkthrough =
          row.network === "walkthrough" ||
          row.contractAddress === "walkthrough" ||
          (typeof row.txId === "string" && row.txId.startsWith("walkthrough_"));
        return (
          !walkthrough && chainHashes.has(row.cleanedHash.toLowerCase())
        );
      })
    : [];

  return NextResponse.json({
    attestations,
    ledgerAttestations,
    contractAddress,
    source: ledgerLive ? "chain+local" : "local",
    ledgerLive,
  });
}

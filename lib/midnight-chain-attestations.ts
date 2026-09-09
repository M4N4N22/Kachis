import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { ledger } from "@/compact/managed/kachis-guardrail/contract/index.js";
import type { PublicAttestation } from "@/lib/attestation-log";
import { CIRCUIT_ID } from "@/shared/types";

const INDEXER =
  process.env.MIDNIGHT_INDEXER_URL?.replace(/\/$/, "") ||
  "https://indexer.preprod.midnight.network/api/v4/graphql";

/** Live Preprod deploy from the Wave 1 1AM settlement. */
export const KNOWN_PREPROD_CONTRACT =
  process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim() ||
  "d145333b792908a93fe7abacf5753ba8e63ecc6291bc76a901ebfed8f5f9f24f";

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function hexToBytes(hex: string) {
  const value = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function indexerQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(INDEXER, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: T; errors?: unknown };
    if (json.errors) return null;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function resolveContractAddressFromSettlement(
  settlementId: string,
): Promise<string | undefined> {
  const data = await indexerQuery<{
    transactions: Array<{
      hash?: string;
      contractActions?: Array<{ address?: string }>;
    }>;
  }>(
    `query ($identifier: HexEncoded!) {
      transactions(offset: { identifier: $identifier }) {
        hash
        contractActions {
          ... on ContractCall { address }
          ... on ContractDeploy { address }
        }
      }
    }`,
    { identifier: settlementId },
  );
  return data?.transactions?.[0]?.contractActions?.[0]?.address;
}

export async function fetchAttestationsFromChain(
  contractAddress = KNOWN_PREPROD_CONTRACT,
): Promise<PublicAttestation[]> {
  if (!contractAddress) return [];

  const data = await indexerQuery<{
    contractAction: {
      state?: string;
      transaction?: { hash?: string; block?: { timestamp?: number | string } };
    } | null;
  }>(
    `query ($address: HexEncoded!) {
      contractAction(address: $address) {
        state
        ... on ContractCall {
          transaction { hash block { timestamp height } }
        }
        ... on ContractDeploy {
          transaction { hash block { timestamp height } }
        }
        ... on ContractUpdate {
          transaction { hash block { timestamp height } }
        }
      }
    }`,
    { address: contractAddress },
  );

  const stateHex = data?.contractAction?.state;
  if (!stateHex) return [];

  const contractState = ContractState.deserialize(hexToBytes(stateHex));
  const led = ledger(contractState.data);
  const txHash = data?.contractAction?.transaction?.hash;
  const rawTs = data?.contractAction?.transaction?.block?.timestamp;
  const attestedAt =
    typeof rawTs === "string"
      ? rawTs
      : typeof rawTs === "number"
        ? new Date(rawTs > 1e12 ? rawTs : rawTs * 1000).toISOString()
        : new Date().toISOString();

  const rows: PublicAttestation[] = [];
  for (const [id, att] of led.attestations) {
    const ledgerId = Number(id);
    rows.push({
      id: String(ledgerId),
      ledgerId,
      cleanedHash: bytesToHex(att.cleanedHash),
      binding: bytesToHex(att.binding),
      packFlags: Number(att.packFlags),
      findings: [],
      circuit: CIRCUIT_ID,
      attestedAt,
      status: "settled",
      source: "chain",
      note: "Read from Preprod contract ledger (public cleanedHash + binding + packFlags).",
      txHash: txHash,
      contractAddress,
      network: "preprod",
      onChain: true,
    });
  }

  return rows.sort((a, b) => b.ledgerId - a.ledgerId);
}

/** Local findings/notes win; on-chain cleanedHash/binding/packFlags/onChain win. */
export function mergeLocalAndChain(
  local: PublicAttestation[],
  chain: PublicAttestation[],
): PublicAttestation[] {
  const byHash = new Map<string, PublicAttestation>();

  for (const row of chain) {
    byHash.set(row.cleanedHash.toLowerCase(), row);
  }

  for (const row of local) {
    const key = row.cleanedHash.toLowerCase();
    const onChain = byHash.get(key);
    if (onChain) {
      byHash.set(key, {
        ...onChain,
        findings: row.findings?.length ? row.findings : onChain.findings,
        source: row.source === "agent" ? "agent" : row.source === "console" ? "console" : onChain.source,
        walletAddress: row.walletAddress ?? onChain.walletAddress,
        note: row.note?.includes("Settled") ? row.note : onChain.note,
        // Settlement id from console; Subscan hash from chain.
        txId: row.txId || onChain.txId,
        txHash: onChain.txHash || row.txHash,
        ledgerId: onChain.ledgerId || row.ledgerId,
        id: String(onChain.ledgerId || row.ledgerId),
        onChain: true,
        status: "settled",
        binding: onChain.binding,
        packFlags: onChain.packFlags,
        contractAddress: onChain.contractAddress || row.contractAddress,
      });
    } else {
      byHash.set(key, row);
    }
  }

  return [...byHash.values()].sort((a, b) => b.ledgerId - a.ledgerId);
}

/** Midnight Explorer (Preprod) — Subscan often misses Compact / shielded txs. */
export function preprodExtrinsicUrl(attestation: {
  txHash?: string;
  txId?: string;
}) {
  const hash = attestation.txHash;
  if (!hash) return undefined;
  return `https://preprod.midnightexplorer.com/transactions/${hash}`;
}

export function preprodContractUrl(contractAddress?: string) {
  if (!contractAddress) return undefined;
  return `https://preprod.midnightexplorer.com/contracts/${contractAddress}`;
}

export function preprodBlockUrl(height?: number) {
  if (!height) return undefined;
  return `https://preprod.midnightexplorer.com/blocks/${height}`;
}

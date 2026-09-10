import { promises as fs } from "node:fs";
import path from "node:path";
import type { GuardrailFinding } from "@/shared/types";
import type { NotaryStatus } from "@/lib/midnight-notary";

export type AttestationSource = "console" | "agent" | "chain";

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
  /** Midnight settlement / transaction identifier (from wallet / callTx). */
  txId?: string;
  /** 32-byte transaction hash — what Subscan `/extrinsic/` expects. */
  txHash?: string;
  contractAddress?: string;
  network?: string;
  onChain?: boolean;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "attestations.json");
const SEED_FILE = path.join(process.cwd(), "data", "preprod-settlement.json");

const INDEXER =
  process.env.MIDNIGHT_INDEXER_URL?.replace(/\/$/, "") ||
  "https://indexer.preprod.midnight.network/api/v4/graphql";

let cache: PublicAttestation[] | null = null;
let loadPromise: Promise<PublicAttestation[]> | null = null;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalize(entry: PublicAttestation): PublicAttestation {
  return {
    ...entry,
    id: entry.id || String(entry.ledgerId),
    findings: entry.findings ?? [],
    packFlags: entry.packFlags ?? 0,
    circuit: entry.circuit || "kachis_guardrail_v0",
    note: entry.note || "",
    source: entry.source || "console",
    status: entry.status || "settled",
  };
}

async function loadSeed(): Promise<PublicAttestation[]> {
  const seed = await readJsonFile<PublicAttestation[] | PublicAttestation>(SEED_FILE);
  if (!seed) return [];
  const rows = Array.isArray(seed) ? seed : [seed];
  return rows.map(normalize);
}

async function loadFromDisk(): Promise<PublicAttestation[]> {
  const stored = await readJsonFile<PublicAttestation[]>(DATA_FILE);
  if (stored?.length) return stored.map(normalize);
  const seeded = await loadSeed();
  if (seeded.length) {
    await ensureDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf8");
  }
  return seeded;
}

async function persist(rows: PublicAttestation[]) {
  await ensureDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
  cache = rows;
}

async function getStore(): Promise<PublicAttestation[]> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = loadFromDisk()
      .then((rows) => {
        cache = rows;
        return rows;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export async function recordAttestation(
  entry: Omit<PublicAttestation, "id" | "ledgerId">,
): Promise<PublicAttestation> {
  const rows = await getStore();
  const duplicate = rows.find(
    (item) => item.cleanedHash === entry.cleanedHash && item.binding === entry.binding,
  );
  if (duplicate) {
    if (entry.txId && !duplicate.txId) {
      const merged = {
        ...duplicate,
        ...entry,
        ledgerId: duplicate.ledgerId,
        id: duplicate.id,
        onChain: entry.onChain ?? duplicate.onChain,
      };
      const next = rows.map((item) => (item.id === duplicate.id ? merged : item));
      await persist(next);
      return merged;
    }
    return duplicate;
  }

  const ledgerId =
    rows.reduce((max, item) => Math.max(max, item.ledgerId), 0) + 1 || rows.length + 1;
  const saved: PublicAttestation = {
    id: String(ledgerId),
    ledgerId,
    ...entry,
  };
  const next = [saved, ...rows];
  await persist(next);
  return saved;
}

export async function listAttestations(limit = 20): Promise<PublicAttestation[]> {
  const rows = await getStore();
  return rows.slice(0, limit);
}

export async function findAttestationByHash(
  cleanedHash: string,
): Promise<PublicAttestation | null> {
  const rows = await getStore();
  return rows.find((item) => item.cleanedHash === cleanedHash) ?? null;
}

export async function attestationStats() {
  const rows = await getStore();
  const blockedSecrets = rows.reduce(
    (sum, item) =>
      sum + (item.findings.find((finding) => finding.kind === "secrets")?.count ?? 0),
    0,
  );
  const leaksPrevented = rows.reduce(
    (sum, item) =>
      sum + item.findings.reduce((inner, finding) => inner + finding.count, 0),
    0,
  );

  return {
    proofsGenerated: rows.length,
    blockedSecrets,
    leaksPrevented,
  };
}

type IndexerTx = {
  hash?: string;
  identifiers?: string[];
  block?: { timestamp?: string | number; height?: number };
  contractActions?: Array<{
    __typename?: string;
    address?: string;
    entryPoint?: string;
  }>;
};

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

/** Confirm known settlement ids on Preprod and mark onChain. */
export async function enrichAttestationsFromChain(
  rows: PublicAttestation[],
): Promise<PublicAttestation[]> {
  const contractAddress =
    process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim() ||
    rows.find((row) => row.contractAddress)?.contractAddress;

  const withTx = rows.filter((row) => row.txId);
  if (withTx.length === 0) return rows;

  const next = [...rows];
  let changed = false;

  for (const row of withTx) {
    if (row.onChain && row.contractAddress && row.txHash) continue;
    const txId = row.txId!;
    let txs: IndexerTx[] = [];

    const byId = await indexerQuery<{ transactions: IndexerTx[] }>(
      `query ($identifier: HexEncoded!) {
        transactions(offset: { identifier: $identifier }) {
          hash
          block { timestamp height }
          contractActions {
            __typename
            ... on ContractCall { address entryPoint }
            ... on ContractDeploy { address }
          }
        }
      }`,
      { identifier: txId },
    );
    txs = byId?.transactions ?? [];

    if (txs.length === 0) {
      const byHash = await indexerQuery<{ transactions: IndexerTx[] }>(
        `query ($hash: HexEncoded!) {
          transactions(offset: { hash: $hash }) {
            hash
            block { timestamp height }
            contractActions {
              __typename
              ... on ContractCall { address entryPoint }
              ... on ContractDeploy { address }
            }
          }
        }`,
        { hash: txId },
      );
      txs = byHash?.transactions ?? [];
    }

    const tx = txs[0];
    if (!tx?.hash) continue;
    const idx = next.findIndex((item) => item.id === row.id);
    if (idx < 0) continue;
    const action = tx.contractActions?.[0];
    const timestamp =
      typeof tx.block?.timestamp === "string"
        ? tx.block.timestamp
        : typeof tx.block?.timestamp === "number"
          ? new Date(tx.block.timestamp > 1e12 ? tx.block.timestamp : tx.block.timestamp * 1000).toISOString()
          : next[idx].attestedAt;

    next[idx] = {
      ...next[idx],
      onChain: true,
      status: "settled",
      txHash: tx.hash,
      contractAddress: next[idx].contractAddress || action?.address || contractAddress,
      note: "Settled on Preprod. Verified via indexer.",
      attestedAt: timestamp,
    };
    changed = true;
  }

  if (changed) await persist(next);
  return next;
}

import { promises as fs } from "node:fs";
import path from "node:path";
import type { GuardrailFinding } from "@/shared/types";
import type { NotaryStatus } from "@/lib/midnight-notary";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

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

type AttestationRow = {
  id: string;
  ledger_id: number;
  cleaned_hash: string;
  binding: string;
  pack_flags: number;
  findings: GuardrailFinding[] | null;
  circuit: string;
  attested_at: string;
  status: string;
  source: string;
  wallet_address: string | null;
  note: string | null;
  tx_id: string | null;
  tx_hash: string | null;
  contract_address: string | null;
  network: string | null;
  on_chain: boolean | null;
};

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const SEED_FILE = path.join(process.cwd(), "data", "preprod-settlement.json");

const INDEXER =
  process.env.MIDNIGHT_INDEXER_URL?.replace(/\/$/, "") ||
  "https://indexer.preprod.midnight.network/api/v4/graphql";

let cache: PublicAttestation[] | null = null;
let loadPromise: Promise<PublicAttestation[]> | null = null;

function diskFilePath() {
  // Vercel serverless FS is read-only except /tmp (ephemeral per instance).
  if (process.env.VERCEL) {
    return path.join("/tmp", "kachis-attestations.json");
  }
  return path.join(LOCAL_DATA_DIR, "attestations.json");
}

async function ensureLocalDir() {
  if (process.env.VERCEL) return;
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
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

function rowToAttestation(row: AttestationRow): PublicAttestation {
  return normalize({
    id: row.id,
    ledgerId: row.ledger_id,
    cleanedHash: row.cleaned_hash,
    binding: row.binding,
    packFlags: row.pack_flags ?? 0,
    findings: row.findings ?? [],
    circuit: row.circuit,
    attestedAt: row.attested_at,
    status: (row.status as NotaryStatus) || "settled",
    source: (row.source as AttestationSource) || "console",
    walletAddress: row.wallet_address ?? undefined,
    note: row.note ?? "",
    txId: row.tx_id ?? undefined,
    txHash: row.tx_hash ?? undefined,
    contractAddress: row.contract_address ?? undefined,
    network: row.network ?? undefined,
    onChain: row.on_chain ?? undefined,
  });
}

function attestationToRow(entry: PublicAttestation): AttestationRow {
  return {
    id: entry.id,
    ledger_id: entry.ledgerId,
    cleaned_hash: entry.cleanedHash,
    binding: entry.binding,
    pack_flags: entry.packFlags,
    findings: entry.findings ?? [],
    circuit: entry.circuit,
    attested_at: entry.attestedAt,
    status: entry.status,
    source: entry.source,
    wallet_address: entry.walletAddress ?? null,
    note: entry.note ?? "",
    tx_id: entry.txId ?? null,
    tx_hash: entry.txHash ?? null,
    contract_address: entry.contractAddress ?? null,
    network: entry.network ?? null,
    on_chain: entry.onChain ?? null,
  };
}

async function loadSeed(): Promise<PublicAttestation[]> {
  const seed = await readJsonFile<PublicAttestation[] | PublicAttestation>(SEED_FILE);
  if (!seed) return [];
  const rows = Array.isArray(seed) ? seed : [seed];
  return rows.map(normalize);
}

async function loadFromDisk(): Promise<PublicAttestation[]> {
  const stored = await readJsonFile<PublicAttestation[]>(diskFilePath());
  if (stored?.length) return stored.map(normalize);
  const seeded = await loadSeed();
  if (seeded.length) {
    await persistDisk(seeded).catch(() => undefined);
  }
  return seeded;
}

async function loadFromSupabase(): Promise<PublicAttestation[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("attestations")
      .select("*")
      .order("ledger_id", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[kachis] attestations supabase read", error.message);
      return null;
    }
    return ((data ?? []) as AttestationRow[]).map(rowToAttestation);
  } catch (error) {
    console.error("[kachis] attestations supabase read failed", error);
    return null;
  }
}

async function persistDisk(rows: PublicAttestation[]) {
  await ensureLocalDir();
  await fs.writeFile(diskFilePath(), JSON.stringify(rows, null, 2), "utf8");
  cache = rows;
}

async function upsertSupabase(entry: PublicAttestation): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("attestations").upsert(attestationToRow(entry), {
      onConflict: "cleaned_hash,binding",
    });
    if (error) {
      console.error("[kachis] attestations supabase upsert", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[kachis] attestations supabase upsert failed", error);
    return false;
  }
}

async function getStore(): Promise<PublicAttestation[]> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const fromSb = await loadFromSupabase();
        if (fromSb) {
          cache = fromSb;
          return fromSb;
        }
        const fromDisk = await loadFromDisk();
        cache = fromDisk;
        return fromDisk;
      } finally {
        loadPromise = null;
      }
    })();
  }
  return loadPromise;
}

async function persistEntry(
  entry: PublicAttestation,
  rows: PublicAttestation[],
): Promise<void> {
  const wroteSb = await upsertSupabase(entry);
  if (wroteSb) {
    cache = rows;
    return;
  }
  try {
    await persistDisk(rows);
  } catch (error) {
    // Keep the in-memory view for this instance so Confirm & Send can still find it.
    cache = rows;
    console.error(
      "[kachis] attestation persist failed (console log not durable on this host)",
      error,
    );
  }
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
      await persistEntry(merged, next);
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
  await persistEntry(saved, next);
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
  const needle = cleanedHash.toLowerCase();
  return rows.find((item) => item.cleanedHash.toLowerCase() === needle) ?? null;
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
    await upsertSupabase(next[idx]);
  }

  if (changed) {
    try {
      if (!(await loadFromSupabase())) {
        await persistDisk(next);
      } else {
        cache = next;
      }
    } catch {
      cache = next;
    }
  }
  return next;
}

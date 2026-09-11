"use client";

import { useEffect, useMemo, useState } from "react";
import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { preprodExtrinsicUrl } from "@/lib/midnight-chain-attestations";
import { decodePackFlags, type GuardrailFindingKind } from "@/shared/types";

export type PublicAttestation = {
  ledgerId: number;
  cleanedHash: string;
  binding: string;
  packFlags?: number;
  attestedAt: string;
  source: string;
  status: string;
  txId?: string;
  txHash?: string;
  onChain?: boolean;
  network?: string;
  contractAddress?: string;
  findings: { count: number; kind: string; label?: string }[];
};

export const SANDBOX_LIMIT = 25;

export const PACK_LABEL: Record<GuardrailFindingKind, string> = {
  pii: copy.pack.labels.pii,
  financial: copy.pack.labels.financial,
  secrets: copy.pack.labels.secrets,
  code: copy.pack.labels.code,
  client: copy.pack.labels.client,
};

export const PACK_KINDS: GuardrailFindingKind[] = [
  "pii",
  "financial",
  "secrets",
  "code",
  "client",
];

/** Walkthrough / demo settlements — never count as live Preprod evidence. */
export function isWalkthroughAttestation(item: PublicAttestation) {
  return (
    item.network === "walkthrough" ||
    (typeof item.txId === "string" && item.txId.startsWith("walkthrough_")) ||
    item.contractAddress === "walkthrough"
  );
}

/** Settled Preprod ledger rows only — excludes local, demo, and walkthrough. */
export function isRealOnChainAttestation(item: PublicAttestation) {
  return Boolean(item.onChain) && !isWalkthroughAttestation(item);
}

export function shortenHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

export function quarterBounds(date = new Date()) {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 1);
  return { start, end, label: `Q${quarter + 1} ${year}` };
}

export function inQuarter(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

type ShieldFeed = {
  attestations: PublicAttestation[];
  /** Live Preprod ledger rows only; empty when indexer did not return contract state. */
  ledgerAttestations: PublicAttestation[];
  contractAddress: string | null;
  feedSource: "chain+local" | "local" | "unknown";
  ledgerLive: boolean;
  loading: boolean;
};

export function useShieldFeed(): ShieldFeed {
  const { usage } = useApp();
  const [attestations, setAttestations] = useState<PublicAttestation[]>([]);
  const [ledgerAttestations, setLedgerAttestations] = useState<PublicAttestation[]>(
    [],
  );
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [feedSource, setFeedSource] = useState<ShieldFeed["feedSource"]>("unknown");
  const [ledgerLive, setLedgerLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/shield")
      .then((response) => response.json())
      .then(
        (data: {
          attestations?: PublicAttestation[];
          ledgerAttestations?: PublicAttestation[];
          contractAddress?: string;
          source?: string;
          ledgerLive?: boolean;
        }) => {
          if (cancelled) return;
          const live = Boolean(data.ledgerLive);
          setAttestations(data.attestations ?? []);
          setLedgerAttestations(live ? (data.ledgerAttestations ?? []) : []);
          setContractAddress(data.contractAddress ?? null);
          setLedgerLive(live);
          setFeedSource(
            data.source === "chain+local" || data.source === "local"
              ? data.source
              : "unknown",
          );
        },
      )
      .catch(() => {
        if (cancelled) return;
        setAttestations([]);
        setLedgerAttestations([]);
        setContractAddress(null);
        setLedgerLive(false);
        setFeedSource("unknown");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usage.proofsGenerated]);

  return {
    attestations,
    ledgerAttestations,
    contractAddress,
    feedSource,
    ledgerLive,
    loading,
  };
}

export function useAttestations() {
  return useShieldFeed().attestations;
}

export function useOnChainAttestations() {
  const feed = useShieldFeed();
  const onChain = useMemo(() => {
    if (!feed.ledgerLive) return [];
    if (feed.ledgerAttestations.length > 0) {
      return feed.ledgerAttestations.filter(isRealOnChainAttestation);
    }
    return feed.attestations.filter(isRealOnChainAttestation);
  }, [feed.ledgerLive, feed.ledgerAttestations, feed.attestations]);
  const bounds = useMemo(() => quarterBounds(), []);
  const quarterRows = useMemo(() => {
    const inQ = onChain.filter((item) =>
      inQuarter(item.attestedAt, bounds.start, bounds.end),
    );
    return inQ.length > 0 ? inQ : onChain;
  }, [onChain, bounds.start, bounds.end]);

  return {
    ...feed,
    onChain,
    quarterRows,
    quarterLabel: bounds.label,
  };
}

export function useQuarterAttestations() {
  const attestations = useAttestations();
  const bounds = useMemo(() => quarterBounds(), []);
  const quarterRows = useMemo(
    () => attestations.filter((item) => inQuarter(item.attestedAt, bounds.start, bounds.end)),
    [attestations, bounds.start, bounds.end],
  );
  return { attestations, quarterRows, quarterLabel: bounds.label };
}

export function SettlementRow({ item }: { item: PublicAttestation }) {
  const packs = decodePackFlags(item.packFlags ?? 0);
  const findingsHeld = item.findings.reduce((sum, f) => sum + f.count, 0);
  const url = preprodExtrinsicUrl(item);

  return (
    <li className="rounded-2xl bg-bg px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="block font-mono text-[12px]">{shortenHash(item.cleanedHash)}</span>
          <span className="mt-1 block text-[11px] text-muted-fg">
            #{item.ledgerId} · {item.source} · {item.status}
            {item.onChain ? " · settled" : ""}
            {findingsHeld > 0 ? ` · ${findingsHeld} held` : ""}
            {url ? (
              <>
                {" · "}
                <a
                  className="text-brand underline-offset-2 hover:underline"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {(item.txHash ?? item.txId ?? "").slice(0, 10)}…
                </a>
              </>
            ) : null}
          </span>
          {item.binding ? (
            <span className="mt-1 block font-mono text-[10px] text-muted-fg">
              {copy.audits.binding}: {shortenHash(item.binding)}
            </span>
          ) : null}
        </div>
        <span className="text-[11px] text-muted-fg">
          {new Date(item.attestedAt).toLocaleString()}
        </span>
      </div>
      {packs.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-fg">{copy.analytics.packs}:</span>
          {packs.map((kind) => (
            <span
              key={kind}
              className="rounded-md border border-ink/10 px-1.5 py-0.5 text-[10px] text-muted-fg"
            >
              {PACK_LABEL[kind]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-muted-fg">{copy.audits.noPack}</p>
      )}
    </li>
  );
}

export function LedgerBadge({
  loading,
  ledgerLive,
}: {
  loading: boolean;
  ledgerLive: boolean;
}) {
  const label = loading
    ? copy.analytics.feedBadgeLoading
    : ledgerLive
      ? copy.analytics.feedBadgeLive
      : copy.analytics.feedBadgeDown;
  const tone = loading ? "ready" : ledgerLive ? "live" : "down";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide",
        tone === "live" && "bg-success/15 text-success",
        tone === "ready" && "bg-brand/15 text-brand",
        tone === "down" && "bg-ink/8 text-muted-fg",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "live" && "bg-success",
          tone === "ready" && "bg-brand",
          tone === "down" && "bg-muted-fg/70",
        )}
      />
      {label}
    </span>
  );
}

export function SandboxLimitCallout() {
  const { usage, tier } = useApp();
  const sandbox = tier === "freelancer";
  const approaching = sandbox && usage.proofsGenerated >= SANDBOX_LIMIT - 8;
  if (!approaching) return null;
  return (
    <Bento className="p-5">
      <p className="text-[11px] font-semibold text-brand">{copy.tiers.sandbox.badge}</p>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
        {copy.tiers.sandbox.limit}
      </p>
      <a
        href="/identity"
        className="mt-3 inline-flex text-[12px] font-medium text-brand hover:underline"
      >
        {copy.onboarding.upgradeCta}
      </a>
    </Bento>
  );
}

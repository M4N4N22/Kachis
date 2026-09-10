"use client";

import { useEffect, useMemo, useState } from "react";
import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { preprodExtrinsicUrl } from "@/lib/midnight-chain-attestations";
import { decodePackFlags, type GuardrailFindingKind } from "@/shared/types";

type PublicAttestation = {
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
  findings: { count: number; kind: string; label?: string }[];
};

const SANDBOX_LIMIT = 25;

const PACK_LABEL: Record<GuardrailFindingKind, string> = {
  pii: copy.pack.labels.pii,
  financial: copy.pack.labels.financial,
  secrets: copy.pack.labels.secrets,
  code: copy.pack.labels.code,
  client: copy.pack.labels.client,
};

function shorten(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function quarterBounds(date = new Date()) {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3);
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 1);
  return { start, end, label: `Q${quarter + 1} ${year}` };
}

function inQuarter(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function AnalyticsView() {
  const { usage, tier, wallet } = useApp();
  const [attestations, setAttestations] = useState<PublicAttestation[]>([]);
  const sandbox = tier === "freelancer";
  const approaching = sandbox && usage.proofsGenerated >= SANDBOX_LIMIT - 8;
  const credentialsVerified = wallet.status === "connected" ? 1 : 0;
  const { start, end, label: quarterLabel } = useMemo(() => quarterBounds(), []);

  const quarterRows = useMemo(
    () => attestations.filter((item) => inQuarter(item.attestedAt, start, end)),
    [attestations, start, end],
  );

  const leaksPrevented = quarterRows.reduce(
    (sum, item) => sum + item.findings.reduce((inner, finding) => inner + finding.count, 0),
    0,
  );
  const onChainCount = quarterRows.filter((item) => item.onChain).length;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/shield")
      .then((response) => response.json())
      .then((data: { attestations?: PublicAttestation[] }) => {
        if (!cancelled) setAttestations(data.attestations ?? []);
      })
      .catch(() => {
        if (!cancelled) setAttestations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [usage.proofsGenerated]);

  const stats = [
    {
      label: copy.analytics.leaks,
      value: leaksPrevented.toLocaleString(),
      hint: copy.analytics.quarterTitle,
    },
    {
      label: copy.analytics.credentials,
      value: credentialsVerified.toLocaleString(),
      hint: wallet.status === "connected" ? "Corporate wallet" : copy.status.unverified,
    },
    {
      label: copy.analytics.settlements,
      value: quarterRows.length.toLocaleString(),
      hint: sandbox
        ? `${attestations.length} / ${SANDBOX_LIMIT} freelance local limit`
        : copy.tiers.institutional.badge,
    },
  ];

  return (
    <div className="space-y-4">
      {approaching ? (
        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">
            {copy.tiers.sandbox.badge}
          </p>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
            {copy.tiers.sandbox.limit}
          </p>
        </Bento>
      ) : null}

      <Bento className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {copy.analytics.quarterTitle}
            </h2>
            <p className="mt-1 text-[13px] text-muted-fg">{quarterLabel}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] text-muted-fg">
            <span>
              {copy.analytics.quarterSettlements}:{" "}
              <span className="text-ink">{quarterRows.length}</span>
            </span>
            <span>
              {copy.analytics.quarterFindings}:{" "}
              <span className="text-ink">{leaksPrevented}</span>
            </span>
            <span>
              {copy.analytics.quarterOnChain}:{" "}
              <span className="text-ink">{onChainCount}</span>
            </span>
          </div>
        </div>
      </Bento>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Bento key={stat.label} className="p-5">
            <p className="text-[11px] font-semibold text-muted-fg">{stat.label}</p>
            <p className="mt-3 text-2xl font-light tracking-tight">{stat.value}</p>
            <p className="mt-2 text-[11px] text-muted-fg">{stat.hint}</p>
          </Bento>
        ))}
      </div>

      <Bento className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          {copy.analytics.cycles} · {quarterLabel}
        </h2>
        {quarterRows.length === 0 ? (
          <p className="mt-6 text-[13px] text-muted-fg">{copy.analytics.quarterEmpty}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {quarterRows.map((item) => {
              const packs = decodePackFlags(item.packFlags ?? 0);
              const findingsHeld = item.findings.reduce((sum, f) => sum + f.count, 0);
              const url = preprodExtrinsicUrl(item);
              return (
                <li
                  key={item.ledgerId}
                  className="rounded-2xl bg-bg px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="block font-mono text-[12px]">
                        {shorten(item.cleanedHash)}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-fg">
                        #{item.ledgerId} · {item.source} · {item.status}
                        {item.onChain ? " · on-chain" : ""}
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
                    </div>
                    <span className="text-[11px] text-muted-fg">
                      {new Date(item.attestedAt).toLocaleString()}
                    </span>
                  </div>
                  {packs.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-muted-fg">
                        {copy.analytics.packs}:
                      </span>
                      {packs.map((kind) => (
                        <span
                          key={kind}
                          className="rounded-md border border-ink/10 px-1.5 py-0.5 text-[10px] text-muted-fg"
                        >
                          {PACK_LABEL[kind]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Bento>
    </div>
  );
}

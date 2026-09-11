"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bento } from "@/components/ui/bento";
import {
  DonutChart,
  HorizontalBars,
  SequenceArea,
  chartColor,
} from "@/components/analytics/analytics-charts";
import {
  LedgerBadge,
  PACK_KINDS,
  PACK_LABEL,
  SandboxLimitCallout,
  SettlementRow,
  shortenHash,
  useOnChainAttestations,
} from "@/components/analytics/attestation-shared";
import { copy } from "@/lib/copy";
import { preprodContractUrl } from "@/lib/midnight-chain-attestations";
import { decodePackFlags } from "@/shared/types";

export function AnalyticsView() {
  const {
    onChain,
    quarterLabel,
    contractAddress,
    feedSource,
    ledgerLive,
    loading,
  } = useOnChainAttestations();

  const rows = onChain;
  const contractUrl = preprodContractUrl(contractAddress ?? undefined);

  const packBars = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      PACK_KINDS.map((kind) => [kind, 0]),
    );
    for (const row of rows) {
      for (const kind of decodePackFlags(row.packFlags ?? 0)) {
        counts[kind] = (counts[kind] ?? 0) + 1;
      }
    }
    return PACK_KINDS.map((kind) => ({
      key: kind,
      label: PACK_LABEL[kind],
      value: counts[kind] ?? 0,
    }));
  }, [rows]);

  const sourceSlices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.source || "chain";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, value], index) => ({
      key,
      label: key,
      value,
      color: chartColor(index),
    }));
  }, [rows]);

  const sequenceValues = useMemo(() => {
    const ordered = [...rows].sort((a, b) => a.ledgerId - b.ledgerId);
    return ordered.map((_, index) => index + 1);
  }, [rows]);

  const packFlagTotal = packBars.reduce((sum, item) => sum + item.value, 0);
  const avgPacks =
    rows.length > 0 ? (packFlagTotal / rows.length).toFixed(1) : "0";
  const secretsPackHits =
    packBars.find((item) => item.key === "secrets")?.value ?? 0;

  const feedLabel = loading
    ? copy.analytics.feedUnknown
    : ledgerLive
      ? copy.analytics.feedChain
      : feedSource === "local"
        ? copy.analytics.feedLocal
        : copy.analytics.feedUnknown;

  const recent = [...rows].sort((a, b) => b.ledgerId - a.ledgerId).slice(0, 6);

  const stats = [
    {
      label: copy.analytics.settlements,
      value: rows.length.toLocaleString(),
      hint: copy.analytics.settlementsHint,
    },
    {
      label: copy.analytics.leaks,
      value: avgPacks,
      hint: copy.analytics.packCoverageHint,
    },
    {
      label: copy.analytics.secretsHeld,
      value: secretsPackHits.toLocaleString(),
      hint: copy.analytics.secretsHint,
    },
    {
      label: copy.analytics.quarterOnChain,
      value: rows.length.toLocaleString(),
      hint: quarterLabel,
    },
  ];

  const emptyMessage = !loading && !ledgerLive
    ? copy.analytics.emptyUnreachable
    : copy.analytics.quarterEmpty;

  return (
    <div className="space-y-4">
      <SandboxLimitCallout />

      <Bento className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                {copy.analytics.quarterTitle}
              </h2>
              <LedgerBadge loading={loading} ledgerLive={ledgerLive} />
            </div>
            <p className="mt-2 text-[13px] text-muted-fg">
              {feedLabel}
              {contractAddress ? (
                <>
                  {" · "}
                  <span className="font-mono text-[12px]">
                    {shortenHash(
                      contractAddress.startsWith("0x")
                        ? contractAddress
                        : `0x${contractAddress}`,
                    )}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            {contractUrl ? (
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                {copy.analytics.openContract}
              </a>
            ) : null}
            <Link
              href="/audits"
              className="font-medium text-ink/70 underline-offset-2 hover:underline"
            >
              {copy.analytics.openAudits}
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-muted-fg">
          <span>
            {copy.analytics.quarterSettlements}:{" "}
            <span className="text-ink">{rows.length}</span>
          </span>
          <span>
            {copy.analytics.quarterFindings}:{" "}
            <span className="text-ink">{packFlagTotal}</span>
          </span>
          <span>
            {copy.analytics.quarterOnChain}:{" "}
            <span className="text-ink">{rows.length}</span>
          </span>
        </div>
      </Bento>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Bento key={stat.label} className="p-5">
            <p className="text-[11px] font-semibold text-muted-fg">{stat.label}</p>
            <p className="mt-3 text-2xl font-light tracking-tight">{stat.value}</p>
            <p className="mt-2 text-[11px] text-muted-fg">{stat.hint}</p>
          </Bento>
        ))}
      </div>

      {loading ? (
        <Bento className="p-5">
          <p className="text-[13px] text-muted-fg">{copy.analytics.loading}</p>
        </Bento>
      ) : rows.length === 0 ? (
        <Bento className="p-5">
          <p className="text-[13px] text-muted-fg">{emptyMessage}</p>
          {ledgerLive ? (
            <p className="mt-2 text-[12px] leading-6 text-muted-fg">
              {copy.analytics.trailHint}
            </p>
          ) : null}
        </Bento>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Bento className="p-5">
              <h3 className="text-sm font-semibold tracking-tight">
                {copy.analytics.packTitle}
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-muted-fg">
                {copy.analytics.packHelper}
              </p>
              <div className="mt-5">
                <HorizontalBars
                  data={packBars}
                  emptyLabel={copy.analytics.emptyCharts}
                />
              </div>
            </Bento>

            <Bento className="p-5">
              <h3 className="text-sm font-semibold tracking-tight">
                {copy.analytics.sourceTitle}
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-muted-fg">
                {copy.analytics.sourceHelper}
              </p>
              <div className="mt-5">
                <DonutChart
                  data={sourceSlices}
                  emptyLabel={copy.analytics.emptyCharts}
                  centerLabel={copy.analytics.quarterSettlements}
                  centerValue={String(rows.length)}
                />
              </div>
            </Bento>
          </div>

          <Bento className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              {copy.analytics.sequenceTitle}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-muted-fg">
              {copy.analytics.sequenceHelper}
            </p>
            <div className="mt-5">
              <SequenceArea
                values={sequenceValues}
                emptyLabel={copy.analytics.emptyCharts}
                yLabel={copy.analytics.sequenceY}
              />
            </div>
          </Bento>

          <Bento className="p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              {copy.analytics.recentTitle}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-muted-fg">
              {copy.analytics.recentHelper}
            </p>
            <ul className="mt-5 space-y-3">
              {recent.map((item) => (
                <SettlementRow key={item.ledgerId} item={item} />
              ))}
            </ul>
          </Bento>
        </>
      )}
    </div>
  );
}

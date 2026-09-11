"use client";

import { Bento } from "@/components/ui/bento";
import {
  SandboxLimitCallout,
  useQuarterAttestations,
} from "@/components/analytics/attestation-shared";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";

export function AnalyticsView() {
  const { tier, wallet } = useApp();
  const { attestations, quarterRows, quarterLabel } = useQuarterAttestations();
  const sandbox = tier === "freelancer";
  const credentialsVerified = wallet.status === "connected" ? 1 : 0;

  const leaksPrevented = quarterRows.reduce(
    (sum, item) => sum + item.findings.reduce((inner, finding) => inner + finding.count, 0),
    0,
  );
  const secretsHeld = quarterRows.reduce(
    (sum, item) =>
      sum +
      item.findings
        .filter((finding) => finding.kind === "secrets" || finding.kind === "compliance")
        .reduce((inner, finding) => inner + finding.count, 0),
    0,
  );
  const onChainCount = quarterRows.filter((item) => item.onChain).length;

  const stats = [
    {
      label: copy.analytics.leaks,
      value: leaksPrevented.toLocaleString(),
      hint: copy.analytics.quarterTitle,
    },
    {
      label: copy.analytics.secretsHeld,
      value: secretsHeld.toLocaleString(),
      hint: copy.analytics.secretsHint,
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
        ? `${attestations.length} / 25 freelance local limit`
        : copy.tiers.institutional.badge,
    },
  ];

  return (
    <div className="space-y-4">
      <SandboxLimitCallout />

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Bento key={stat.label} className="p-5">
            <p className="text-[11px] font-semibold text-muted-fg">{stat.label}</p>
            <p className="mt-3 text-2xl font-light tracking-tight">{stat.value}</p>
            <p className="mt-2 text-[11px] text-muted-fg">{stat.hint}</p>
          </Bento>
        ))}
      </div>

      <Bento className="p-5">
        <p className="text-[13px] leading-6 text-muted-fg">{copy.analytics.trailHint}</p>
      </Bento>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";

type PublicAttestation = {
  ledgerId: number;
  cleanedHash: string;
  binding: string;
  attestedAt: string;
  source: string;
  status: string;
  txId?: string;
  findings: { count: number; kind: string }[];
};

const SANDBOX_LIMIT = 25;

function shorten(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

export function AnalyticsView() {
  const { usage, tier, wallet } = useApp();
  const [attestations, setAttestations] = useState<PublicAttestation[]>([]);
  const sandbox = tier === "freelancer";
  const approaching = sandbox && usage.proofsGenerated >= SANDBOX_LIMIT - 8;
  const credentialsVerified = wallet.status === "connected" ? 1 : 0;
  const leaksPrevented = attestations.reduce(
    (sum, item) => sum + item.findings.reduce((inner, finding) => inner + finding.count, 0),
    0,
  );

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
      value: (leaksPrevented || usage.blockedSecrets).toLocaleString(),
      hint: "Held in the local sandbox",
    },
    {
      label: copy.analytics.credentials,
      value: credentialsVerified.toLocaleString(),
      hint: wallet.status === "connected" ? "Midnight Lace" : copy.status.unverified,
    },
    {
      label: copy.analytics.settlements,
      value: (attestations.length || usage.proofsGenerated).toLocaleString(),
      hint: sandbox
        ? `${attestations.length || usage.proofsGenerated} / ${SANDBOX_LIMIT} freelance local limit`
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
        <p className="text-[11px] font-semibold text-brand">{copy.analytics.volume}</p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">
          {copy.analytics.cycles}
        </h2>
        {attestations.length === 0 ? (
          <p className="mt-6 text-[13px] text-muted-fg">
            No public commitments yet. Shield a prompt in the workspace or via Kachis Agent.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {attestations.map((item) => (
              <li
                key={item.ledgerId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3"
              >
                <span>
                  <span className="block font-mono text-[12px]">{shorten(item.cleanedHash)}</span>
                  <span className="mt-1 block text-[11px] text-muted-fg">
                    #{item.ledgerId} · {item.source} · {item.status}
                    {item.txId ? ` · ${item.txId.slice(0, 10)}…` : ""}
                  </span>
                </span>
                <span className="text-[11px] text-muted-fg">
                  {new Date(item.attestedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bento>
    </div>
  );
}

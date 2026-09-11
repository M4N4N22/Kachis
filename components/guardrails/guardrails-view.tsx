"use client";

import { ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { displayNetworkLabel } from "@/lib/midnight-wallet";
import { preprodExtrinsicUrl } from "@/lib/midnight-chain-attestations";
import { useEffect, useState } from "react";

const LIVE_FILTERS = [
  copy.filters.pii,
  copy.filters.financial,
  copy.filters.secrets,
  copy.filters.code,
  copy.filters.client,
];

export function GuardrailsView() {
  const { usage, wallet, profile, tier } = useApp();
  const connected = wallet.status === "connected";
  const sandbox = tier === "freelancer";
  const [audits, setAudits] = useState<
    {
      ledgerId: number;
      source: string;
      findings: { label: string }[];
      attestedAt: string;
      txId?: string;
      txHash?: string;
      onChain?: boolean;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/shield")
      .then((response) => response.json())
      .then(
        (data: {
          attestations?: {
            ledgerId: number;
            source: string;
            findings: { label: string }[];
            attestedAt: string;
            txId?: string;
            txHash?: string;
            onChain?: boolean;
          }[];
        }) => {
          if (!cancelled) setAudits(data.attestations ?? []);
        },
      )
      .catch(() => {
        if (!cancelled) setAudits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [usage.proofsGenerated]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="space-y-4">
        {sandbox ? (
          <Bento className="p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 text-brand" strokeWidth={1.75} />
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {copy.onboarding.upgradeTitle}
                </h2>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
                  {copy.onboarding.upgradeBody}
                </p>
                <Link href="/identity" className="mt-4 inline-flex">
                  <Button size="sm">{copy.onboarding.upgradeCta}</Button>
                </Link>
              </div>
            </div>
          </Bento>
        ) : null}

        <Bento className={sandbox ? "relative p-5 opacity-55" : "p-5"}>
          {sandbox ? (
            <span className="absolute top-4 right-4 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-fg uppercase">
              {copy.onboarding.locked}
            </span>
          ) : null}
          <h2 className="text-sm font-semibold tracking-tight">
            {copy.guardrails.liveTitle}
          </h2>
          <div className="mt-5 space-y-4">
            {LIVE_FILTERS.map((filter) => (
              <div key={filter.label}>
                <p className="text-[13px] font-medium">{filter.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-fg">
                  {filter.tooltip}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] text-muted-fg">{copy.guardrails.liveHint}</p>
        </Bento>

        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">Recent audits</p>
          <div className="mt-4 space-y-3">
            {audits.length === 0 ? (
              <p className="text-[13px] text-muted-fg">No shields recorded yet.</p>
            ) : (
              audits.slice(0, 8).map((row) => (
                <div
                  key={row.ledgerId}
                  className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3"
                >
                  <span className="text-[13px]">
                    #{row.ledgerId} · {row.source}
                    {row.onChain ? " · on-chain" : ""}
                    {row.findings[0] ? ` · ${row.findings[0].label}` : " · no findings"}
                    {(() => {
                      const url = preprodExtrinsicUrl(row);
                      if (!url) return null;
                      return (
                        <>
                          {" · "}
                          <a
                            className="text-brand underline-offset-2 hover:underline"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            settle
                          </a>
                        </>
                      );
                    })()}
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
                </div>
              ))
            )}
          </div>
        </Bento>
      </div>

      <Bento className="h-fit p-5 lg:sticky lg:top-4">
        <h2 className="text-sm font-semibold tracking-tight">
          {copy.guardrails.seatTitle}
        </h2>
        {connected ? (
          <div className="mt-5 space-y-2">
            <p className="text-[13px] font-medium">{profile.name}</p>
            <p className="text-[11px] text-muted-fg">
              {wallet.walletName ?? copy.wallet.verifiedSuffix}
              {wallet.network ? ` · ${displayNetworkLabel(wallet.network)}` : ""}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-fg">
              {copy.guardrails.seatLive}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-[13px] text-muted-fg">{copy.guardrails.seatEmpty}</p>
        )}
      </Bento>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";
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

export function useAttestations() {
  const { usage } = useApp();
  const [attestations, setAttestations] = useState<PublicAttestation[]>([]);

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

  return attestations;
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

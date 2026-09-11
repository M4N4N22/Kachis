"use client";

import Link from "next/link";
import { Bento } from "@/components/ui/bento";
import {
  LedgerBadge,
  SandboxLimitCallout,
  SettlementRow,
  shortenHash,
  useOnChainAttestations,
} from "@/components/analytics/attestation-shared";
import { copy } from "@/lib/copy";
import { preprodContractUrl } from "@/lib/midnight-chain-attestations";

export function AuditsView() {
  const {
    onChain,
    quarterLabel,
    contractAddress,
    ledgerLive,
    loading,
  } = useOnChainAttestations();

  const rows = [...onChain].sort((a, b) => b.ledgerId - a.ledgerId);
  const contractUrl = preprodContractUrl(contractAddress ?? undefined);
  const emptyMessage =
    !loading && !ledgerLive
      ? copy.audits.emptyUnreachable
      : copy.audits.empty;

  return (
    <div className="space-y-4">
      <SandboxLimitCallout />

      <Bento className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                {copy.audits.title}
              </h2>
              <LedgerBadge loading={loading} ledgerLive={ledgerLive} />
            </div>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
              {loading ? copy.audits.loading : copy.audits.helper}
              {" · "}
              {quarterLabel}
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
            <span className="text-muted-fg">
              {copy.audits.countLabel}:{" "}
              <span className="text-ink">{rows.length}</span>
            </span>
            {contractUrl ? (
              <a
                href={contractUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                {copy.audits.openContract}
              </a>
            ) : null}
            <Link
              href="/analytics"
              className="font-medium text-ink/70 underline-offset-2 hover:underline"
            >
              {copy.audits.openAnalytics}
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-[13px] text-muted-fg">{copy.audits.loading}</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-[13px] leading-6 text-muted-fg">{emptyMessage}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((item) => (
              <SettlementRow key={item.ledgerId} item={item} />
            ))}
          </ul>
        )}
      </Bento>
    </div>
  );
}

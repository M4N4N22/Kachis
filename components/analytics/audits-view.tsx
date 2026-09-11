"use client";

import { Bento } from "@/components/ui/bento";
import {
  SandboxLimitCallout,
  SettlementRow,
  useQuarterAttestations,
} from "@/components/analytics/attestation-shared";
import { copy } from "@/lib/copy";

export function AuditsView() {
  const { quarterRows, quarterLabel } = useQuarterAttestations();

  return (
    <div className="space-y-4">
      <SandboxLimitCallout />

      <Bento className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">{copy.audits.title}</h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
          {copy.audits.helper} · {quarterLabel}
        </p>

        {quarterRows.length === 0 ? (
          <p className="mt-6 text-[13px] text-muted-fg">{copy.analytics.quarterEmpty}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {quarterRows.map((item) => (
              <SettlementRow key={item.ledgerId} item={item} />
            ))}
          </ul>
        )}
      </Bento>
    </div>
  );
}

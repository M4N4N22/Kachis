"use client";

import { ShieldCheck } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { Toggle } from "@/components/ui/toggle";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { useEffect, useState } from "react";

const POLICIES = [
  {
    id: "gdpr",
    label: "GDPR personal data",
    description: "Resident identifiers stay in the local sandbox.",
  },
  {
    id: "soc2",
    label: "SOC 2 change control",
    description: "Production secrets cannot enter an unshielded prompt.",
  },
  {
    id: "hipaa",
    label: "HIPAA ePHI",
    description: "Clinical fields require a local compliance audit before send.",
  },
  {
    id: "finra",
    label: "FINRA communications",
    description: "Client account numbers are masked before the channel opens.",
  },
];

const ROLES = [
  { role: "Security Admin", access: "Full policy + audit" },
  { role: "Analyst", access: "Run workspace, read verifications" },
  { role: "Contractor", access: "Sandbox seat, no exports" },
];

export function GuardrailsView() {
  const { tier, usage } = useApp();
  const locked = tier === "freelancer";
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    gdpr: true,
    soc2: true,
    hipaa: false,
    finra: true,
  });
  const [audits, setAudits] = useState<
    { ledgerId: number; source: string; findings: { label: string }[]; attestedAt: string }[]
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
        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">
            Institutional Access Controls
          </p>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">
            What local verification must settle
          </h2>
          <div className="mt-5 space-y-4">
            {POLICIES.map((policy) => (
              <Toggle
                key={policy.id}
                checked={enabled[policy.id]}
                disabled={locked}
                onChange={(value) =>
                  setEnabled((current) => ({ ...current, [policy.id]: value }))
                }
                label={policy.label}
                description={policy.description}
              />
            ))}
          </div>
          {locked ? (
            <p className="mt-5 text-[11px] text-muted-fg">{copy.tiers.sandbox.limit}</p>
          ) : null}
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
                    {row.findings[0] ? ` · ${row.findings[0].label}` : " · no findings"}
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
                </div>
              ))
            )}
          </div>
        </Bento>
      </div>

      <Bento className="h-fit p-5 lg:sticky lg:top-4">
        <p className="text-[11px] font-semibold text-brand">Role map</p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">
          Workspace governance
        </h2>
        <ul className="mt-5 space-y-4">
          {ROLES.map((item) => (
            <li key={item.role}>
              <p className="text-[13px] font-medium">{item.role}</p>
              <p className="text-[11px] text-muted-fg">{item.access}</p>
            </li>
          ))}
        </ul>
      </Bento>
    </div>
  );
}

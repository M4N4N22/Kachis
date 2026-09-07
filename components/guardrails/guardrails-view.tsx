"use client";

import { ShieldCheck } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { Toggle } from "@/components/ui/toggle";
import { useApp } from "@/lib/app-store";
import { useState } from "react";

const POLICIES = [
  {
    id: "gdpr",
    label: "GDPR personal data",
    description: "EU resident identifiers stay in the local circuit.",
  },
  {
    id: "soc2",
    label: "SOC 2 change control",
    description: "Production secrets cannot enter unsanitized prompts.",
  },
  {
    id: "hipaa",
    label: "HIPAA ePHI",
    description: "Clinical fields require an attested redaction proof.",
  },
  {
    id: "finra",
    label: "FINRA communications",
    description: "Client account numbers are masked before model I/O.",
  },
];

const ROLES = [
  { role: "Security Admin", access: "Full policy + audit" },
  { role: "Analyst", access: "Run workspace, read proofs" },
  { role: "Contractor", access: "Freelancer desk, no exports" },
];

export function GuardrailsView() {
  const { tier } = useApp();
  const locked = tier === "freelancer";
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    gdpr: true,
    soc2: true,
    hipaa: false,
    finra: true,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="space-y-4">
        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">Policy packs</p>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">
            What Midnight must attest
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
            <p className="mt-5 text-[11px] text-muted-fg">
              Institutional seats unlock tenant-wide packs and RBAC. Freelancer
              remains a local, single-desk proof.
            </p>
          ) : null}
        </Bento>

        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">Recent attestations</p>
          <div className="mt-4 space-y-3">
            {[
              "PII pack · board packet · 2m ago",
              "SOC 2 secrets · payroll export · 1h ago",
              "FINRA mask · client memo · yesterday",
            ].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3"
              >
                <span className="text-[13px]">{row}</span>
                <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
              </div>
            ))}
          </div>
        </Bento>
      </div>

      <Bento className="h-fit p-5 lg:sticky lg:top-4">
        <p className="text-[11px] font-semibold text-brand">Role map</p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">Who can disclose</h2>
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

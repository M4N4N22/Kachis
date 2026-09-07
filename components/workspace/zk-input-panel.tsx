"use client";

import { Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { SAMPLE_SENSITIVE_PROMPT } from "@/lib/midnight";
import { useWorkspace } from "@/lib/workspace-store";

const STATUS_COPY = {
  idle: "Ready to prove locally",
  scanning: "Scanning payload on-device",
  guarding: "Applying selected guardrails",
  proving: "Generating ZK proof",
  attesting: "Attesting via Midnight proof server",
  shielded: "Local proof ready",
  error: "Proof failed — try again",
} as const;

export function ZkInputPanel() {
  const {
    rawInput,
    setRawInput,
    guardrails,
    setGuardrail,
    processLocally,
    proofStatus,
    proof,
    busy,
  } = useWorkspace();

  return (
    <section className="bento flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-[11px] font-semibold text-brand">ZK Guardrail Input</p>
          <h2 className="text-sm font-semibold tracking-tight">Raw desk</h2>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-fg">
            Paste source, sheets, or briefs. Nothing here is uploaded until a local
            proof clears.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRawInput(SAMPLE_SENSITIVE_PROMPT)}
        >
          Load sample
        </Button>
      </div>

      <div className="min-h-0 flex-1 px-5">
        <textarea
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="Paste sensitive context — compensation files, customer exports, internal source…"
          className="h-full min-h-[220px] w-full resize-none rounded-2xl bg-bg px-4 py-3 text-[13px] leading-6 text-ink outline-none ring-1 ring-border placeholder:text-muted-fg focus:ring-brand/50"
        />
      </div>

      <div className="space-y-3 px-5 py-4">
        <Toggle
          checked={guardrails.piiStripping}
          onChange={(value) => setGuardrail("piiStripping", value)}
          label="PII Stripping"
          description="Names, emails, phones, and national IDs stay on this machine."
        />
        <Toggle
          checked={guardrails.financialMasking}
          onChange={(value) => setGuardrail("financialMasking", value)}
          label="Financial Data Masking"
          description="Accounts, routing numbers, and amounts become placeholders."
        />
        <Toggle
          checked={guardrails.enterpriseCompliance}
          onChange={(value) => setGuardrail("enterpriseCompliance", value)}
          label="Enterprise Compliance Check"
          description="Keys, tokens, and policy-blocked secrets never enter the prompt."
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-fg">
          <Shield className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
          <span>{STATUS_COPY[proofStatus]}</span>
          {proof ? (
            <span className="ml-auto truncate font-mono text-[11px] text-ink/80">
              {proof.hash}
            </span>
          ) : null}
        </div>
        <Button
          className="w-full"
          disabled={!rawInput.trim() || busy}
          onClick={() => void processLocally()}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          Locally Process & Generate ZK Proof
        </Button>
      </div>
    </section>
  );
}

"use client";

import { Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { copy } from "@/lib/copy";
import { SAMPLE_SENSITIVE_PROMPT } from "@/lib/midnight";
import { useWorkspace } from "@/lib/workspace-store";

export function ZkInputPanel() {
  const {
    demo,
    walletConnected,
    canShield,
    shieldGateHint,
    settleError,
    rawInput,
    setRawInput,
    guardrails,
    setGuardrail,
    processLocally,
    proofStatus,
    proof,
    busy,
  } = useWorkspace();

  const status =
    proofStatus === "error"
      ? copy.action.error
      : proofStatus === "shielded"
        ? copy.action.success
        : proofStatus === "idle"
          ? !walletConnected
            ? copy.action.walletRequired
            : !canShield
              ? copy.action.fundRequired
              : copy.action.idle
          : copy.action.processing;

  return (
    <section className="bento flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-[11px] font-semibold text-brand">{copy.input.eyebrow}</p>
          <h2 className="text-sm font-semibold tracking-tight">{copy.input.title}</h2>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted-fg">
            {copy.input.helper}
          </p>
        </div>
        {demo ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRawInput(SAMPLE_SENSITIVE_PROMPT)}
          >
            {copy.demo.loadSample}
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 px-5">
        <textarea
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={copy.input.placeholder}
          className="h-full min-h-[220px] w-full resize-none rounded-2xl bg-bg px-4 py-3 text-[13px] leading-6 text-ink outline-none ring-1 ring-border placeholder:text-muted-fg focus:ring-brand/50"
        />
      </div>

      <div className="space-y-3 px-5 py-4">
        <Toggle
          checked={guardrails.piiStripping}
          onChange={(value) => setGuardrail("piiStripping", value)}
          label={copy.filters.pii.label}
          description={copy.filters.pii.tooltip}
        />
        <Toggle
          checked={guardrails.financialMasking}
          onChange={(value) => setGuardrail("financialMasking", value)}
          label={copy.filters.financial.label}
          description={copy.filters.financial.tooltip}
        />
        <Toggle
          checked={guardrails.enterpriseCompliance}
          onChange={(value) => setGuardrail("enterpriseCompliance", value)}
          label={copy.filters.compliance.label}
          description={copy.filters.compliance.tooltip}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-fg">
          <Shield className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
          <span>{status}</span>
          {proof ? (
            <span className="ml-auto truncate font-mono text-[11px] text-ink/80">
              {proof.hash}
            </span>
          ) : null}
        </div>
        {shieldGateHint ? (
          <p className="text-[11px] leading-relaxed text-muted-fg">{shieldGateHint}</p>
        ) : null}
        {settleError ? (
          <p className="text-[11px] leading-relaxed text-danger">{settleError}</p>
        ) : null}
        <Button
          className="w-full"
          disabled={!canShield || !rawInput.trim() || busy}
          onClick={() => void processLocally()}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          {busy
            ? copy.action.processing
            : !walletConnected
              ? copy.action.walletRequired
              : !canShield
                ? copy.action.fundRequired
                : copy.action.idle}
        </Button>
      </div>
    </section>
  );
}

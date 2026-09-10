"use client";

import { useState } from "react";
import { ClipboardPaste, FileText } from "lucide-react";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { copy } from "@/lib/copy";
import { SAMPLE_SENSITIVE_PROMPT } from "@/lib/midnight";
import { useWorkspace } from "@/lib/workspace-store";

export function ZkInputPanel() {
  const {
    walletConnected,
    canShield,
    shieldGateHint,
    settleError,
    rawInput,
    setRawInput,
    guardrails,
    setGuardrail,
    processLocally,
    proof,
    busy,
    sending,
  } = useWorkspace();
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setRawInput(text);
        setPasteHint(null);
      }
    } catch {
      setPasteHint(copy.input.pasteFailed);
    }
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="font-light tracking-[-0.03em] text-ink"
          style={{ fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)", lineHeight: 1.15 }}
        >
          {copy.input.title}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-fg">{copy.input.helper}</p>
      </div>

      <div className="relative flex flex-wrap gap-2 px-5">
        <Button variant="outline" size="sm" onClick={() => void pasteFromClipboard()}>
          <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.input.paste}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRawInput(SAMPLE_SENSITIVE_PROMPT);
            setPasteHint(null);
          }}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.input.sample}
        </Button>
      </div>
      {pasteHint ? (
        <p className="relative px-5 pt-2 text-[11px] text-muted-fg">{pasteHint}</p>
      ) : null}

      <div className="relative min-h-0 flex-1 px-5 pt-3">
        <textarea
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={copy.input.placeholder}
          className="h-full min-h-[180px] w-full resize-none rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-3 text-[14px] leading-7 text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
        />
      </div>

      <div className="relative space-y-2 px-5 py-3">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-fg uppercase">
          {copy.input.security}
        </p>
        <div className="space-y-1 rounded-[1.15rem] border border-white/8 bg-black/20 px-3 py-2">
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
      </div>

      <div className="relative flex flex-col gap-2 px-5 pb-5 pt-1">
        {shieldGateHint ? (
          <p className="text-[11px] leading-relaxed text-muted-fg">{shieldGateHint}</p>
        ) : null}
        {settleError ? (
          <p className="text-[11px] leading-relaxed text-danger">{settleError}</p>
        ) : null}
        {proof ? (
          <p className="truncate font-mono text-[10px] text-muted-fg">
            {proof.hash}
            {proof.ledgerId ? ` · #${proof.ledgerId}` : ""}
          </p>
        ) : null}
        <RadialGlowButton
          className="w-full"
          rounded="full"
          disabled={!canShield || !rawInput.trim() || busy || sending}
          onClick={() => void processLocally()}
        >
          {busy
            ? copy.action.processing
            : !walletConnected
              ? copy.action.walletRequired
              : !canShield
                ? copy.action.fundRequired
                : copy.action.idle}
        </RadialGlowButton>
      </div>
    </section>
  );
}

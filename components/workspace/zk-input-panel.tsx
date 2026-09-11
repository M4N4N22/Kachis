"use client";

import { useState } from "react";
import { ClipboardPaste, Code2, FileText } from "lucide-react";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { copy } from "@/lib/copy";
import {
  SAMPLE_CODE_CLIENT_PROMPT,
  SAMPLE_SENSITIVE_PROMPT,
} from "@/lib/midnight";
import { useWorkspace } from "@/lib/workspace-store";

export function ZkInputPanel() {
  const {
    rawInput,
    setRawInput,
    guardrails,
    setGuardrail,
    runScanner,
    proof,
    proofStatus,
    busy,
    scanning,
    sending,
  } = useWorkspace();
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const scannerLocked =
    busy ||
    sending ||
    proofStatus === "rewriting" ||
    proofStatus === "proving" ||
    proofStatus === "attesting";

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
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-900/70 rounded-3xl">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="text-ink text-lg"
        >
          {copy.input.title}
        </h2>
        <p className="text-[13px] leading-6 text-muted-fg">{copy.input.helper}</p>
      </div>

      <div className="relative flex flex-wrap gap-2 px-5">
        <Button variant="outline" size="sm" onClick={() => void pasteFromClipboard()}>
          <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.input.paste}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRawInput(SAMPLE_SENSITIVE_PROMPT);
            setPasteHint(null);
          }}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.input.sample}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRawInput(SAMPLE_CODE_CLIENT_PROMPT);
            setPasteHint(null);
          }}
        >
          <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.input.sampleCode}
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
          className="h-full min-h-[180px] w-full resize-none rounded-[1.25rem] border border-ink/10 bg-black/25 px-4 py-3 text-[14px] leading-7 text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
        />
      </div>

      <div className="relative space-y-2 px-5 py-3">
        <p className="text-[11px] font-semibold  text-muted-fg pl-1">
          {copy.input.security}
        </p>
        <div className="space-y-1 rounded-[1.15rem] border border-ink/8 bg-black/20 px-3 py-2 ">
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
            checked={guardrails.secretsStripping}
            onChange={(value) => setGuardrail("secretsStripping", value)}
            label={copy.filters.secrets.label}
            description={copy.filters.secrets.tooltip}
          />
          <Toggle
            checked={guardrails.codeInsulation}
            onChange={(value) => setGuardrail("codeInsulation", value)}
            label={copy.filters.code.label}
            description={copy.filters.code.tooltip}
          />
          <Toggle
            checked={guardrails.clientRecords}
            onChange={(value) => setGuardrail("clientRecords", value)}
            label={copy.filters.client.label}
            description={copy.filters.client.tooltip}
          />
        </div>
      </div>

      <div className="relative flex flex-col gap-2 px-5 pb-5 pt-1">
        {proof ? (
          <p className="truncate font-mono text-[10px] text-muted-fg">
            {proof.hash}
            {proof.ledgerId ? ` · #${proof.ledgerId}` : ""}
          </p>
        ) : null}
        <RadialGlowButton
          className="w-full"
          rounded="full"
          disabled={!rawInput.trim() || scannerLocked}
          onClick={() => void runScanner()}
        >
          {scanning || proofStatus === "rewriting"
            ? copy.action.processing
            : copy.action.idle}
        </RadialGlowButton>
      </div>
    </section>
  );
}

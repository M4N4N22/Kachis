"use client";

import { ShieldCheck } from "lucide-react";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

export function SanitizedPanel() {
  const {
    sanitizedPrompt,
    proofStatus,
    proof,
    canShield,
    sendShielded,
    busy,
    sending,
  } = useWorkspace();

  const ready = proofStatus === "shielded" && Boolean(sanitizedPrompt.trim()) && canShield;

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden border-x border-white/6">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="font-light tracking-[-0.03em] text-brand-accent"
          style={{ fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)", lineHeight: 1.15 }}
        >
          {copy.sanitized.title}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-fg">{copy.sanitized.helper}</p>
      </div>

      <div className="relative min-h-0 flex-1 px-5 pb-3">
        {ready ? (
          <div className="flex h-full min-h-[180px] flex-col rounded-[1.25rem] border border-[color-mix(in_srgb,var(--brand-a)_28%,transparent)] bg-black/30 px-4 py-3">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-success">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.status.shielded}
              {proof?.ledgerId ? (
                <span className="font-mono font-normal text-muted-fg">· #{proof.ledgerId}</span>
              ) : null}
            </div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap font-sans text-[14px] leading-7 text-ink">
              {sanitizedPrompt}
            </pre>
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/15 px-6 text-center">
            <p className="text-[1.1rem] font-light tracking-tight text-ink/80">
              {copy.sanitized.empty}
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-6 text-muted-fg">
              {copy.sanitized.emptyHint}
            </p>
          </div>
        )}
      </div>

      <div className="relative px-5 pb-5 pt-1">
        <RadialGlowButton
          className="w-full"
          rounded="full"
          disabled={!ready || busy || sending}
          onClick={() => void sendShielded()}
        >
          {sending ? copy.sanitized.sending : copy.sanitized.confirmSend}
        </RadialGlowButton>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";
import { cn } from "@/lib/cn";

function shorten(value: string, edge = 8) {
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

export function SanitizedPanel() {
  const {
    sanitizedPrompt,
    highlightSegments,
    revealTokens,
    proofStatus,
    proof,
    canShield,
    settleError,
    shieldGateHint,
    completeRewrite,
    settleShield,
    sendShielded,
    scanning,
    settling,
    sending,
    busy,
  } = useWorkspace();

  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "warn" | "rewrite" | "done">("idle");
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (proofStatus === "scanning") {
      setPhase("warn");
      setVisibleCount(0);
      return;
    }
    if (proofStatus === "rewriting") {
      setPhase("rewrite");
      setVisibleCount(0);
      return;
    }
    if (
      proofStatus === "reviewed" ||
      proofStatus === "proving" ||
      proofStatus === "attesting" ||
      proofStatus === "shielded" ||
      (proofStatus === "error" && revealTokens.length > 0)
    ) {
      setPhase("done");
      setVisibleCount(revealTokens.length);
      return;
    }
    if (proofStatus === "idle" || proofStatus === "error") {
      setPhase("idle");
      setVisibleCount(0);
    }
  }, [proofStatus, revealTokens.length]);

  useEffect(() => {
    if (phase !== "rewrite") return;

    if (revealTokens.length === 0) {
      completeRewrite();
      return;
    }

    if (reduceMotion) {
      setVisibleCount(revealTokens.length);
      completeRewrite();
      return;
    }

    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= revealTokens.length) {
        window.clearInterval(id);
        completeRewrite();
      }
    }, 28);

    return () => window.clearInterval(id);
  }, [phase, revealTokens, completeRewrite, reduceMotion]);

  const showContent =
    phase !== "idle" ||
    Boolean(sanitizedPrompt.trim()) ||
    (proofStatus === "scanning" && highlightSegments.length > 0);

  const reviewed =
    proofStatus === "reviewed" ||
    (proofStatus === "error" && Boolean(sanitizedPrompt.trim()) && !proof);
  const shielded = proofStatus === "shielded" && Boolean(sanitizedPrompt.trim()) && canShield;
  const settlingUi =
    proofStatus === "proving" || proofStatus === "attesting" || settling;

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-900/70 rounded-3xl">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="text-lg text-brand-accent"
        
        >
          {copy.sanitized.title}
        </h2>
        <p className="text-[13px] leading-6 text-muted-fg">{copy.sanitized.helper}</p>
      </div>

      <div className="relative min-h-0 flex-1 px-5 pb-3">
        {showContent ? (
          <div className="flex h-full min-h-[180px] flex-col rounded-[1.25rem] border border-[color-mix(in_srgb,var(--brand-a)_28%,transparent)] bg-black/30 px-4 py-3">
            <AnimatePresence mode="wait">
              {(phase === "warn" || phase === "rewrite" || phase === "done" || shielded) && (
                <motion.div
                  key="banner"
                  initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center w-fit gap-2 rounded-full bg-green-950/50 px-3 py-1.5 text-[11px] text-green-100"
                >
                  {copy.status.localReview}
                </motion.div>
              )}
            </AnimatePresence>

            {shielded ? (
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-success">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                {copy.status.shielded}
                {proof?.ledgerId ? (
                  <span className="font-mono font-normal text-muted-fg">· #{proof.ledgerId}</span>
                ) : null}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto text-[14px] leading-7 text-ink">
              {phase === "warn" ? (
                <p className="whitespace-pre-wrap font-sans">
                  {highlightSegments.map((segment, index) =>
                    segment.kind === "warn" ? (
                      <mark
                        key={`w-${index}`}
                        className="rounded-[0.35rem] bg-[color-mix(in_srgb,#f59e0b_28%,transparent)] px-0.5 text-ink ring-1 ring-[color-mix(in_srgb,#f59e0b_45%,transparent)]"
                      >
                        {segment.value}
                      </mark>
                    ) : (
                      <span key={`t-${index}`}>{segment.value}</span>
                    ),
                  )}
                </p>
              ) : (
                <p className="whitespace-pre-wrap font-sans">
                  {revealTokens.slice(0, visibleCount).map((token, index) => {
                    if (token.kind === "break") {
                      return <span key={`b-${index}`}>{token.value}</span>;
                    }
                    if (token.kind === "badge") {
                      return (
                        <motion.span
                          key={`badge-${index}-${token.value}`}
                          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 2 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="mx-0.5 inline-flex translate-y-px items-center rounded-md  px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-brand-accent"
                        >
                          {token.value}
                        </motion.span>
                      );
                    }
                    return (
                      <motion.span
                        key={`txt-${index}`}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.12 }}
                      >
                        {token.value}
                      </motion.span>
                    );
                  })}
                  {phase === "rewrite" && visibleCount < revealTokens.length ? (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-accent align-middle" />
                  ) : null}
                </p>
              )}
            </div>

            {proof && proofStatus === "shielded" ? (
              <div className="mt-3 space-y-1.5 rounded-[1rem] border border-ink/8 bg-black/25 px-3 py-2.5">
                <p className="text-[11px] font-semibold  text-muted-fg ">
                  {copy.sanitized.receiptTitle}
                </p>
                <p className="text-[12px] text-ink/90">{copy.sanitized.receiptReady}</p>
                <dl className="space-y-1 font-mono text-[10px] text-muted-fg">
                  <div className="flex justify-between gap-3">
                    <dt>{copy.sanitized.receiptHash}</dt>
                    <dd className="truncate text-ink/80">{shorten(proof.hash, 10)}</dd>
                  </div>
                  {proof.txId ? (
                    <div className="flex justify-between gap-3">
                      <dt>{copy.sanitized.receiptTx}</dt>
                      <dd className="truncate text-ink/80">{shorten(proof.txId, 10)}</dd>
                    </div>
                  ) : null}
                  {proof.ledgerId != null ? (
                    <div className="flex justify-between gap-3">
                      <dt>{copy.sanitized.receiptLedger}</dt>
                      <dd className="text-ink/80">#{proof.ledgerId}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-ink/10 bg-black/15 px-6 text-center">
            <p className="text-[1.1rem] font-light tracking-tight text-ink/80">
              {copy.sanitized.empty}
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-6 text-muted-fg">
              {copy.sanitized.emptyHint}
            </p>
          </div>
        )}
      </div>

      <div className="relative flex flex-col gap-2 px-5 pb-5 pt-1">
        {reviewed && !canShield && shieldGateHint ? (
          <p className="text-[11px] leading-relaxed text-muted-fg">{shieldGateHint}</p>
        ) : null}
        {settleError ? (
          <p
            role="alert"
            className="rounded-[0.85rem] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-[12px] leading-relaxed text-danger"
          >
            {settleError}
          </p>
        ) : null}

        {shielded ? (
          <RadialGlowButton
            className="w-full"
            rounded="full"
            disabled={!shielded || busy || sending}
            onClick={() => void sendShielded()}
          >
            {sending ? copy.sanitized.sending : copy.sanitized.confirmSend}
          </RadialGlowButton>
        ) : (
          <RadialGlowButton
            className={cn("w-full", !reviewed && "opacity-80")}
            rounded="full"
            disabled={!reviewed || settlingUi || scanning || sending || !canShield}
            onClick={() => void settleShield()}
          >
            {settlingUi
              ? copy.sanitized.settling
              : reviewed && !canShield
                ? copy.action.walletRequired
                : copy.sanitized.settle}
          </RadialGlowButton>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/cn";
import type { CleanRevealToken, HighlightSegment } from "@/lib/midnight";
import type { ProofStatus } from "@/lib/types";

export type RewritePhase = "idle" | "warn" | "rewrite" | "done";

export function useShieldRewritePhase(
  proofStatus: ProofStatus,
  revealTokenCount: number,
) {
  const [phase, setPhase] = useState<RewritePhase>("idle");
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
      (proofStatus === "error" && revealTokenCount > 0)
    ) {
      setPhase("done");
      setVisibleCount(revealTokenCount);
      return;
    }
    if (proofStatus === "idle" || proofStatus === "error") {
      setPhase("idle");
      setVisibleCount(0);
    }
  }, [proofStatus, revealTokenCount]);

  return { phase, visibleCount, setVisibleCount };
}

export function useShieldRewriteReveal({
  phase,
  revealTokens,
  completeRewrite,
  setVisibleCount,
}: {
  phase: RewritePhase;
  revealTokens: CleanRevealToken[];
  completeRewrite: () => void;
  setVisibleCount: (n: number) => void;
}) {
  const reduceMotion = useReducedMotion();

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
  }, [phase, revealTokens, completeRewrite, reduceMotion, setVisibleCount]);

  return reduceMotion;
}

export function ShieldedRewriteContent({
  phase,
  highlightSegments,
  revealTokens,
  visibleCount,
  reduceMotion,
  className,
}: {
  phase: RewritePhase;
  highlightSegments: HighlightSegment[];
  revealTokens: CleanRevealToken[];
  visibleCount: number;
  reduceMotion: boolean | null;
  className?: string;
}) {
  return (
    <div className={cn("text-[14px] leading-7 text-ink  bg-surface/70 rounded-3xl rounded-tr-md px-4 py-3", className)}>
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
                  className="mx-0.5 inline-flex translate-y-px items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-brand-accent"
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
  );
}

export function LocalReviewBanner({
  show,
  reduceMotion,
}: {
  show: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <AnimatePresence mode="wait">
      {show ? (
        <motion.div
          key="banner"
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex w-fit items-center gap-2 rounded-full bg-green-950/50 px-3 py-1.5 text-[11px] text-green-100"
        >
          {copy.status.localReview}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

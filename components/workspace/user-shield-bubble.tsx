"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  LocalReviewBanner,
  ShieldedRewriteContent,
  useShieldRewritePhase,
  useShieldRewriteReveal,
} from "@/components/workspace/shielded-rewrite";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";
import { cn } from "@/lib/cn";

export function UserShieldBubble() {
  const {
    rawInput,
    sanitizedPrompt,
    highlightSegments,
    revealTokens,
    proofStatus,
    proof,
    completeRewrite,
  } = useWorkspace();

  const { phase, visibleCount, setVisibleCount } = useShieldRewritePhase(
    proofStatus,
    revealTokens.length,
  );
  const reduceMotion = useShieldRewriteReveal({
    phase,
    revealTokens,
    completeRewrite,
    setVisibleCount,
  });

  const [showOriginal, setShowOriginal] = useState(false);
  const scanningOrRewrite =
    proofStatus === "scanning" ||
    proofStatus === "rewriting" ||
    phase === "warn" ||
    phase === "rewrite";
  const hasShielded =
    phase === "done" ||
    proofStatus === "reviewed" ||
    proofStatus === "proving" ||
    proofStatus === "attesting" ||
    proofStatus === "shielded";
  const canPeekOriginal = hasShielded && Boolean(rawInput.trim());

  return (
    <div
      className={cn(
        "group relative ml-auto max-w-[min(100%,36rem)] ",
        " text-ink",
      )}
    >
      {proofStatus === "shielded" ? (
        <div className="mb-2 w-fullflex items-center gap-1 text-[11px]  text-green-200">
          {copy.status.shielded}
          {proof?.ledgerId ? (
            <span className="font-mono font-normal text-muted-fg">·#{proof.ledgerId}</span>
          ) : null}
        </div>
      ) : null}

      {showOriginal && canPeekOriginal ? (
        <p className="whitespace-pre-wrap text-[14px] bg-surface/70 rounded-3xl rounded-tr-md px-4 py-3 leading-7 text-ink/90 ">{rawInput}</p>
      ) : scanningOrRewrite || (hasShielded && revealTokens.length > 0) ? (
        <ShieldedRewriteContent
          phase={phase === "idle" && hasShielded ? "done" : phase}
          highlightSegments={highlightSegments}
          revealTokens={
            revealTokens.length > 0
              ? revealTokens
              : [{ kind: "text", value: sanitizedPrompt || rawInput }]
          }
          visibleCount={
            phase === "idle" && hasShielded
              ? Math.max(revealTokens.length, 1)
              : visibleCount
          }
          reduceMotion={reduceMotion}
        />
      ) : (
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-ink bg-surface/70 rounded-3xl rounded-tr-md px-4 py-3">{rawInput}</p>
      )}

      {canPeekOriginal ? (
        <button
          type="button"
          onClick={() => setShowOriginal((value) => !value)}
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium text-muted-fg transition-opacity",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            showOriginal && "opacity-100",
          )}
        >
          {showOriginal ? (
            <EyeOff className="h-3 w-3" strokeWidth={1.75} />
          ) : (
            <Eye className="h-3 w-3" strokeWidth={1.75} />
          )}
          {showOriginal ? copy.workspace.hideOriginal : copy.workspace.viewOriginal}
        </button>
      ) : null}
    </div>
  );
}

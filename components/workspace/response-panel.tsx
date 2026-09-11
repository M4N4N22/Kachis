"use client";

import { useEffect, useState } from "react";
import { ByocModal } from "@/components/workspace/byoc-modal";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { useByoc } from "@/lib/byoc-store";
import { useWorkspace } from "@/lib/workspace-store";

type BetaStatus = {
  available: boolean;
  remaining: number;
  limit: number;
};

export function ResponsePanel() {
  const { messages, sending, proofStatus, canShield } = useWorkspace();
  const { ready, displayName, clearCredential } = useByoc();
  const [beta, setBeta] = useState<BetaStatus | null>(null);
  const [byocOpen, setByocOpen] = useState(false);
  const replies = messages.filter((message) => message.role === "assistant");
  const latest = replies[replies.length - 1];
  const shielded = proofStatus === "shielded" && canShield;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/providers")
      .then((response) => response.json())
      .then((data: { beta?: BetaStatus }) => {
        if (!cancelled && data.beta) {
          setBeta({
            available: data.beta.available,
            remaining: data.beta.remaining,
            limit: data.beta.limit,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setBeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [messages.length, sending]);

  const sourceLabel = latest?.walkthrough
    ? copy.response.walkthroughLabel
    : latest?.source === "byoc"
      ? `${copy.response.byocLabel} · ${latest.label ?? latest.provider ?? "model"}`
      : latest?.source === "beta"
        ? copy.response.betaLabel
        : copy.response.assistantLabel;

  const quotaLine = ready
    ? copy.response.usingByoc.replace("{provider}", displayName ?? "model")
    : !beta
      ? copy.response.fundedOffline
      : !beta.available
        ? copy.response.fundedOffline
        : beta.remaining <= 0
          ? copy.response.fundedEmpty.replace("{limit}", String(beta.limit))
          : copy.response.fundedQuota
              .replace("{remaining}", String(beta.remaining))
              .replace("{limit}", String(beta.limit));

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-900/70 rounded-3xl">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="text-lg text-brand"
        
        >
          {copy.response.title}
        </h2>
        <p className=" text-[13px] leading-6 text-muted-fg">{copy.response.helper}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto px-5 pb-3">
        {sending ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-[1.25rem] border border-ink/8 bg-black/20 px-6 text-center">
            <p className="text-[14px] text-muted-fg">{copy.response.waiting}</p>
          </div>
        ) : latest ? (
          <article className="rounded-[1.25rem] border border-ink/10 bg-black/25 px-4 py-4">
            <p className="mb-3 text-[11px] font-semibold  text-ink/45 ">
              {sourceLabel}
            </p>
            <p className="whitespace-pre-wrap text-[14px] leading-7 text-ink">{latest.content}</p>
          </article>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-ink/10 bg-black/15 px-6 text-center">
            <p className="mt-4 text-[1.1rem] font-light tracking-tight text-ink/80">
              {copy.response.empty}
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-6 text-muted-fg">
              {shielded ? copy.response.emptyHint : copy.response.emptyBeforeShield}
            </p>
          </div>
        )}
      </div>

      <div className="relative border-t border-ink/6 px-5 py-4">
        {ready ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-ink">{quotaLine}</p>
            <p className="text-[12px] text-muted-fg">
              {copy.providers.byocModalBody}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setByocOpen(true)}>
                {copy.response.manageByoc}
              </Button>
              <Button size="sm" variant="ghost" onClick={clearCredential}>
                {copy.response.clearByoc}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-ink">{quotaLine}</p>
            <p className="text-[12px] text-muted-fg">{copy.response.fundedModel}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[12px]">
              <span className="text-muted-fg">{copy.response.needMore}</span>
              <button
                type="button"
                onClick={() => setByocOpen(true)}
                className="font-medium text-brand-accent underline-offset-2 hover:underline"
              >
                {copy.response.bringCompute}
              </button>
            </div>
          </div>
        )}
      </div>

      <ByocModal open={byocOpen} onOpenChange={setByocOpen} />
    </section>
  );
}

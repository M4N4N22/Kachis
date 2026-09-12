"use client";

import { useEffect, useState } from "react";
import { ByocModal } from "@/components/workspace/byoc-modal";
import { copy } from "@/lib/copy";
import { useByoc } from "@/lib/byoc-store";
import { useWorkspace } from "@/lib/workspace-store";

type BetaStatus = {
  available: boolean;
  remaining: number;
  limit: number;
};

export function ChatComposerMeta() {
  const { messages, sending } = useWorkspace();
  const { ready, displayName, clearCredential } = useByoc();
  const [beta, setBeta] = useState<BetaStatus | null>(null);
  const [byocOpen, setByocOpen] = useState(false);

  const latest = messages.filter((message) => message.role === "assistant").at(-1);

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

  const modelLine = ready
    ? copy.response.usingByoc.replace("{provider}", displayName ?? "model")
    : latest?.model
      ? copy.response.betaModelLabel.replace("{model}", latest.model)
      : copy.response.fundedModel;

  const quotaLine = ready
    ? null
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
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1 pt-2 text-[11px] text-muted-fg">
        {quotaLine ? <span className="text-ink/70">{quotaLine}</span> : null}
        {quotaLine ? <span aria-hidden>·</span> : null}
        <span className="text-ink/55">{modelLine}</span>
        {ready ? (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="font-medium text-brand-accent hover:underline"
              onClick={() => setByocOpen(true)}
            >
              {copy.response.manageByoc}
            </button>
            <button
              type="button"
              className="hover:text-ink"
              onClick={clearCredential}
            >
              {copy.response.clearByoc}
            </button>
          </>
        ) : (
          <>
            <span aria-hidden>·</span>
            <span>{copy.response.needMore}</span>
            <button
              type="button"
              className="font-medium text-brand-accent hover:underline"
              onClick={() => setByocOpen(true)}
            >
              {copy.response.bringCompute}
            </button>
          </>
        )}
      </div>
      <ByocModal open={byocOpen} onOpenChange={setByocOpen} />
    </>
  );
}

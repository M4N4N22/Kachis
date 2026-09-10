"use client";

import { MessageSquare } from "lucide-react";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

export function ResponsePanel() {
  const { messages, sending, proofStatus, canShield } = useWorkspace();
  const replies = messages.filter((message) => message.role === "assistant");
  const latest = replies[replies.length - 1];
  const shielded = proofStatus === "shielded" && canShield;

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative px-5 pt-5 pb-3">
        <h2
          className="font-light tracking-[-0.03em] text-brand"
          style={{ fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)", lineHeight: 1.15 }}
        >
          {copy.response.title}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-fg">{copy.response.helper}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto px-5 pb-5">
        {sending ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-[1.25rem] border border-white/8 bg-black/20 px-6 text-center">
            <p className="text-[14px] text-muted-fg">{copy.response.waiting}</p>
          </div>
        ) : latest ? (
          <article className="rounded-[1.25rem] border border-white/10 bg-black/25 px-4 py-4">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-white/45 uppercase">
              {latest.walkthrough ? copy.response.walkthroughLabel : copy.response.assistantLabel}
            </p>
            <p className="whitespace-pre-wrap text-[14px] leading-7 text-ink">{latest.content}</p>
          </article>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/15 px-6 text-center">
            <p className="mt-4 text-[1.1rem] font-light tracking-tight text-ink/80">
              {copy.response.empty}
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-6 text-muted-fg">
              {shielded ? copy.response.emptyHint : copy.response.emptyBeforeShield}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

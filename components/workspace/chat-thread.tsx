"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserShieldBubble } from "@/components/workspace/user-shield-bubble";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

function ReplyMarkdown({ content }: { content: string }) {
  return (
    <div className="kachis-reply text-[14px] leading-7 text-ink">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[12px] text-ink/90">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function sourceLine(latest: {
  walkthrough?: boolean;
  source?: "beta" | "byoc" | "demo";
  provider?: string;
  label?: string;
  model?: string;
}) {
  if (latest.walkthrough) return copy.response.walkthroughLabel;
  if (latest.source === "byoc") {
    const provider = latest.label ?? latest.provider ?? "model";
    if (latest.model) {
      return copy.response.byocModelLabel
        .replace("{provider}", provider)
        .replace("{model}", latest.model);
    }
    return `${copy.response.byocLabel} · ${provider}`;
  }
  if (latest.source === "beta") {
    if (latest.model) {
      return copy.response.betaModelLabel.replace("{model}", latest.model);
    }
    return copy.response.betaLabel;
  }
  return copy.response.assistantLabel;
}

export function ChatThread({
  turnActive,
  dockPaddingClass,
}: {
  turnActive: boolean;
  dockPaddingClass?: string;
}) {
  const { proofStatus, messages, sending } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const replies = messages.filter((message) => message.role === "assistant");
  const latest = replies[replies.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnActive, proofStatus, messages.length, sending]);

  useEffect(() => {
    setCopied(false);
  }, [latest?.id]);

  async function copyReply() {
    if (!latest?.content) return;
    try {
      await navigator.clipboard.writeText(latest.content);
      setCopied(true);
      toast.success(copy.response.copiedReply);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(copy.input.pasteFailed);
    }
  }

  if (!turnActive) return null;

  return (
    <div
      className={`mx-auto h-full w-full max-w-3xl overflow-y-auto ${dockPaddingClass ?? "pb-52"}`}
    >
      <div className="mx-auto flex flex-col gap-5 px-4 pt-4">
        <UserShieldBubble />

        {sending && !latest ? (
          <div className="mr-auto w-full text-[14px] text-muted-fg">
            {copy.response.waiting}
          </div>
        ) : null}

        {latest ? (
          <article className="mr-auto w-full">
            {latest.restored ? (
              <div className="mb-4 flex gap-2.5">
                <p className="text-[12px] leading-5 text-ink/80">
                  {copy.response.restoreNote}
                </p>
              </div>
            ) : null}
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold text-ink/45">
                {sourceLine(latest)}
              </p>
            </div>
            <ReplyMarkdown content={latest.content} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0 p-0 opacity-90"
              onClick={() => void copyReply()}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </Button>
          </article>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
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

function ReplyMarkdown({ content }: { content: string }) {
  return (
    <div className="kachis-reply text-[14px] leading-7 text-ink">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h3 className="mb-2 text-[1.05rem] font-semibold tracking-tight text-ink">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 text-[1.05rem] font-semibold tracking-tight text-ink">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-2 text-[0.95rem] font-semibold tracking-tight text-ink">
              {children}
            </h4>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-ink/90">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          hr: () => <hr className="my-4 border-0 border-t border-ink/12" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-brand-accent underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[12px] text-ink/90">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-ink/20 pl-3 text-ink/80 last:mb-0">
              {children}
            </blockquote>
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

export function ResponsePanel() {
  const { messages, sending, proofStatus, canShield } = useWorkspace();
  const { ready, displayName, clearCredential } = useByoc();
  const [beta, setBeta] = useState<BetaStatus | null>(null);
  const [byocOpen, setByocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const replies = messages.filter((message) => message.role === "assistant");
  const latest = replies[replies.length - 1];
  const shielded = proofStatus === "shielded" && canShield;

  useEffect(() => {
    setCopied(false);
  }, [latest?.id]);

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

  let body: ReactNode;
  if (sending) {
    body = (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-[1.25rem] border border-ink/8 bg-black/20 px-6 text-center">
        <p className="text-[14px] text-muted-fg">{copy.response.waiting}</p>
      </div>
    );
  } else if (latest) {
    body = (
      <article className="rounded-[1.25rem] border border-ink/10 bg-black/25 px-4 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold text-ink/45">
            {sourceLine(latest)}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5 px-2.5"
            onClick={() => void copyReply()}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {copied ? copy.response.copiedReply : copy.response.copyReply}
          </Button>
        </div>

        {latest.restored ? (
          <div className="mb-4 flex gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--brand-a)_28%,transparent)] bg-[color-mix(in_srgb,var(--brand-a)_10%,transparent)] px-3 py-2.5">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"
              strokeWidth={1.75}
            />
            <p className="text-[12px] leading-5 text-ink/80">
              {copy.response.restoreNote}
            </p>
          </div>
        ) : null}

        <ReplyMarkdown content={latest.content} />
      </article>
    );
  } else {
    body = (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-ink/10 bg-black/15 px-6 text-center">
        <p className="mt-4 text-[1.1rem] font-light tracking-tight text-ink/80">
          {copy.response.empty}
        </p>
        <p className="mt-2 max-w-xs text-[13px] leading-6 text-muted-fg">
          {shielded ? copy.response.emptyHint : copy.response.emptyBeforeShield}
        </p>
      </div>
    );
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-900/70 rounded-3xl">
      <div className="relative px-5 pt-5 pb-3">
        <h2 className="text-lg text-brand">{copy.response.title}</h2>
        <p className="text-[13px] leading-6 text-muted-fg">{copy.response.helper}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto px-5 pb-3">{body}</div>

      <div className="relative border-t border-ink/6 px-5 py-4">
        {ready ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-ink">{quotaLine}</p>
            <p className="text-[12px] text-muted-fg">{copy.providers.byocModalBody}</p>
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

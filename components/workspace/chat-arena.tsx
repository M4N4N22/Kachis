"use client";

import { FormEvent } from "react";
import { ArrowUp, Lock } from "lucide-react";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

export function ChatArena() {
  const {
    messages,
    composer,
    setComposer,
    sendChat,
    proofStatus,
    proof,
    sanitizedPrompt,
    busy,
    walletConnected,
    canShield,
  } = useWorkspace();

  const shielded = proofStatus === "shielded" && canShield;
  const channelOpen = shielded;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendChat();
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-ink/2">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden />

      <div className="relative flex items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div>
          <h2
            className="mt-2 font-light tracking-[-0.03em] text-ink"
            style={{ fontSize: "clamp(1.35rem, 2vw, 1.75rem)", lineHeight: 1.15 }}
          >
            {copy.chat.title}
          </h2>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-ink/50">{copy.chat.subtitle}</p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 space-y-3 overflow-auto px-6 pb-3">
        {messages.length === 0 ? (
          <EmptyChat
            walletConnected={walletConnected}
            ready={canShield}
            shielded={channelOpen}
            sanitizedPrompt={sanitizedPrompt}
            onUseSanitized={() => setComposer(sanitizedPrompt)}
          />
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-[92%] rounded-[1.25rem] px-4 py-3 text-[13px] leading-6",
                message.role === "user"
                  ? "ml-auto bg-[color-mix(in_srgb,var(--brand-a)_22%,transparent)] text-ink"
                  : "border border-ink/10 bg-ink/[0.04] text-ink/90",
              )}
            >
              <p className="mb-1 text-[11px] font-semibold text-ink/45">
                {message.role === "user"
                  ? copy.chat.userLabel
                  : message.walkthrough
                    ? copy.chat.walkthroughLabel
                    : copy.chat.assistantLabel}
                {message.sanitized ? " · shielded" : ""}
              </p>
              <p className="inkspace-pre-wrap">{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="relative border-t border-ink/8 p-4 md:p-5">
        <div className="flex items-end gap-2 rounded-full border border-ink/10 bg-black p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-[color-mix(in_srgb,var(--brand-a)_50%,transparent)]">
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            disabled={!channelOpen}
            rows={1}
            placeholder={
              channelOpen
                ? copy.chat.placeholderOpen
                : canShield
                  ? copy.chat.placeholderLocked
                  : copy.chat.placeholderWallet
            }
            className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[14px] leading-6 text-ink outline-none placeholder:text-ink/35 disabled:opacity-50"
          />
          <RadialGlowButton
            type="submit"
            size="icon"
            rounded="full"
            disabled={!channelOpen || !composer.trim() || busy}
            className="mb-0.5 mr-0.5 shrink-0"
            aria-label={copy.chat.send}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
          </RadialGlowButton>
        </div>
        {proof && canShield ? (
          <p className="mt-2 px-1 text-[11px] text-ink/40">
            {copy.status.pipeline}
            {proof.ledgerId ? ` · #${proof.ledgerId}` : ""}
            {proof.findings.length
              ? ` · ${proof.findings.length} filter${proof.findings.length === 1 ? "" : "s"} applied`
              : ""}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function EmptyChat({
  walletConnected,
  ready,
  shielded,
  sanitizedPrompt,
  onUseSanitized,
}: {
  walletConnected: boolean;
  ready: boolean;
  shielded: boolean;
  sanitizedPrompt: string;
  onUseSanitized: () => void;
}) {
  const title = shielded
    ? copy.chat.emptyOpen
    : ready
      ? copy.chat.emptyLocked
      : walletConnected
        ? copy.chat.emptyFund
        : copy.chat.emptyWallet;
  const hint = shielded
    ? copy.chat.emptyOpenHint
    : ready
      ? copy.chat.emptyLockedHint
      : walletConnected
        ? copy.chat.emptyFundHint
        : copy.chat.emptyWalletHint;

  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink/10 bg-ink/[0.04] text-brand-accent">
        <Lock className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <p className="mt-5 text-[1.35rem] font-light tracking-tight text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-ink/50">{hint}</p>
      {shielded && sanitizedPrompt ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onUseSanitized}
            className="rounded-full border border-ink/12 bg-ink/[0.06] px-4 py-2 text-[12px] font-medium text-ink/85 transition-colors hover:bg-ink/10"
          >
            {copy.chat.suggestionShielded}
          </button>
          <button
            type="button"
            onClick={onUseSanitized}
            className="rounded-full border border-ink/12 bg-transparent px-4 py-2 text-[12px] font-medium text-ink/55 transition-colors hover:text-ink"
          >
            {copy.chat.suggestionEdit}
          </button>
        </div>
      ) : null}
    </div>
  );
}

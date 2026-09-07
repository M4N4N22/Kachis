"use client";

import { FormEvent } from "react";
import { ArrowUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
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
  } = useWorkspace();

  const shielded = proofStatus === "shielded";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendChat();
  }

  return (
    <section className="bento flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="text-[11px] font-semibold text-brand">Secure Chat Arena</p>
          <h2 className="text-sm font-semibold tracking-tight">Shielded model</h2>
        </div>
        <StatusPill shielded={shielded} />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-5 pb-3">
        {messages.length === 0 ? (
          <EmptyChat
            shielded={shielded}
            sanitizedPrompt={sanitizedPrompt}
            onUseSanitized={() => setComposer(sanitizedPrompt)}
          />
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-6",
                message.role === "user"
                  ? "ml-auto bg-[color-mix(in_srgb,var(--brand)_12%,var(--surface))]"
                  : "bg-bg ring-1 ring-border",
              )}
            >
              <p className="mb-1 text-[11px] font-semibold text-muted-fg">
                {message.role === "user" ? "Sanitized prompt" : "Kachina"}
                {message.sanitized ? " · attested" : ""}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </article>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-4">
        <div className="flex items-end gap-2 rounded-2xl bg-bg p-2 ring-1 ring-border focus-within:ring-brand/50">
          <textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            disabled={!shielded}
            rows={3}
            placeholder={
              shielded
                ? "Send the shielded prompt to the model…"
                : "Generate a local proof to unlock chat"
            }
            className="min-h-[72px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] leading-6 outline-none placeholder:text-muted-fg disabled:opacity-50"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!shielded || !composer.trim() || busy}
            className="shrink-0"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            Send
          </Button>
        </div>
        {proof ? (
          <p className="mt-2 font-mono text-[11px] text-muted-fg">
            Circuit {proof.circuit} · {proof.findings.length} finding
            {proof.findings.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function StatusPill({ shielded }: { shielded: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold",
        shielded
          ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-success"
          : "bg-muted text-muted-fg",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          shielded ? "bg-success pulse-dot" : "bg-muted-fg",
        )}
      />
      <span className="sm:hidden">{shielded ? "Shielded locally" : "Awaiting proof"}</span>
      <span className="hidden sm:inline">
        {shielded
          ? "Data Shielded Locally via Midnight Protocol"
          : "Waiting on local Midnight proof"}
      </span>
    </span>
  );
}

function EmptyChat({
  shielded,
  sanitizedPrompt,
  onUseSanitized,
}: {
  shielded: boolean;
  sanitizedPrompt: string;
  onUseSanitized: () => void;
}) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl bg-bg px-6 text-center">
      <Lock className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
      <p className="mt-3 text-sm font-medium tracking-tight">
        {shielded ? "Proof cleared. Chat is live." : "The model cannot see raw data."}
      </p>
      <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-muted-fg">
        {shielded
          ? "Your sanitized prompt is ready. Send it, or edit the shielded version first."
          : "Process the left pane locally. Midnight attests the guardrails without reading the file."}
      </p>
      {shielded && sanitizedPrompt ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onUseSanitized}>
          Use sanitized prompt
        </Button>
      ) : null}
    </div>
  );
}

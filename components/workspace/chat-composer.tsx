"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUp,
  ChevronDown,
  ClipboardPaste,
  Code2,
  FileText,
  MessageSquareText,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ChatComposerMeta } from "@/components/workspace/chat-composer-meta";
import { copy } from "@/lib/copy";
import {
  SAMPLE_CODE_CLIENT_PROMPT,
  SAMPLE_PROSE_PROMPT,
  SAMPLE_SENSITIVE_PROMPT,
} from "@/lib/midnight";
import { useWorkspace } from "@/lib/workspace-store";
import { cn } from "@/lib/cn";

const MAX_TEXTAREA_PX = 160;

export function ChatComposer({
  draft,
  onDraftChange,
  onSubmit,
  disabled,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const { guardrails, setGuardrail } = useWorkspace();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [draft]);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onDraftChange(text);
        setPasteHint(null);
      }
    } catch {
      setPasteHint(copy.input.pasteFailed);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (draft.trim() && !disabled) onSubmit();
    }
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl">
      <div className="relative">
        <AnimatePresence initial={false}>
          {filtersOpen ? (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 16, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mb-2 overflow-hidden"
            >
              <div className="rounded-[1.25rem]  bg-surface px-3 py-2 shadow-lg">
                <div className=" flex items-center justify-between px-1 py-2">
                  <p className="text-[11px] font-semibold text-muted-fg">
                    {copy.input.security}
                  </p>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-brand-accent hover:underline"
                    onClick={() => setFiltersOpen(false)}
                  >
                    {copy.workspace.filtersClose}
                  </button>
                </div>
                <div className="space-y-0.5">
                  <Toggle
                    checked={guardrails.piiStripping}
                    onChange={(value) => setGuardrail("piiStripping", value)}
                    label={copy.filters.pii.label}
                    description={copy.filters.pii.tooltip}
                  />
                  <Toggle
                    checked={guardrails.financialMasking}
                    onChange={(value) => setGuardrail("financialMasking", value)}
                    label={copy.filters.financial.label}
                    description={copy.filters.financial.tooltip}
                  />
                  <Toggle
                    checked={guardrails.secretsStripping}
                    onChange={(value) => setGuardrail("secretsStripping", value)}
                    label={copy.filters.secrets.label}
                    description={copy.filters.secrets.tooltip}
                  />
                  <Toggle
                    checked={guardrails.codeInsulation}
                    onChange={(value) => setGuardrail("codeInsulation", value)}
                    label={copy.filters.code.label}
                    description={copy.filters.code.tooltip}
                  />
                  <Toggle
                    checked={guardrails.clientRecords}
                    onChange={(value) => setGuardrail("clientRecords", value)}
                    label={copy.filters.client.label}
                    description={copy.filters.client.tooltip}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="overflow-hidden rounded-3xl  bg-surface">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                filtersOpen
                  ? "bg-muted text-ink"
                  : "text-muted-fg hover:bg-muted hover:text-ink",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.workspace.filtersOpen}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  filtersOpen && "rotate-180",
                )}
                strokeWidth={1.75}
              />
            </button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => void pasteFromClipboard()}
            >
              <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.input.paste}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => {
                onDraftChange(SAMPLE_SENSITIVE_PROMPT);
                setPasteHint(null);
              }}
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.input.sample}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => {
                onDraftChange(SAMPLE_CODE_CLIENT_PROMPT);
                setPasteHint(null);
              }}
            >
              <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.input.sampleCode}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => {
                onDraftChange(SAMPLE_PROSE_PROMPT);
                setPasteHint(null);
              }}
            >
              <MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copy.input.sampleProse}
            </Button>
          </div>

          {pasteHint ? (
            <p className="px-4 pt-2 text-[11px] text-muted-fg">{pasteHint}</p>
          ) : null}

          <div className="relative flex items-end gap-2 px-3 py-2.5">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={copy.workspace.composerHint}
              rows={1}
              disabled={disabled}
              className="max-h-40 min-h-[28px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1 text-[14px] leading-6 text-ink outline-none placeholder:text-muted-fg disabled:opacity-50"
            />
            <button
              type="button"
              aria-label={copy.workspace.send}
              disabled={!draft.trim() || disabled}
              onClick={onSubmit}
              className="mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-brand-fg transition-opacity disabled:pointer-events-none disabled:opacity-35"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <ChatComposerMeta />
      </div>
    </div>
  );
}

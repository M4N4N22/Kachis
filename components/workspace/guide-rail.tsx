"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/lib/workspace-store";

const STEPS = [
  {
    id: "how-paste",
    title: "Paste on the desk",
    body: "Source, sheets, and briefs stay in the browser. Nothing is posted yet.",
  },
  {
    id: "how-guardrails",
    title: "Choose guardrails",
    body: "PII, financial fields, and compliance secrets are stripped locally.",
  },
  {
    id: "how-proof",
    title: "Prove on-device",
    body: "A Compact circuit placeholder emits a Midnight-ready attestation hash.",
  },
  {
    id: "how-chat",
    title: "Talk with the leftover",
    body: "Only the sanitized prompt reaches the model. Raw values never leave.",
  },
  {
    id: "how-midnight",
    title: "Selective disclosure later",
    body: "Passport credentials will prove role and policy without revealing them.",
  },
] as const;

export function GuideRail() {
  const { proof, proofStatus } = useWorkspace();
  const [open, setOpen] = useState(true);

  return (
    <Bento className="h-fit lg:sticky lg:top-4">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 pt-5 pb-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <p className="text-[11px] font-semibold text-brand">How this works</p>
          <h2 className="text-sm font-semibold tracking-tight">Local Midnight path</h2>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-fg transition-transform",
            !open && "-rotate-90",
          )}
          strokeWidth={1.75}
        />
      </button>
      {open ? (
        <ol className="space-y-4 px-5 pb-5">
          {STEPS.map((step, index) => (
            <li key={step.id} id={step.id} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-fg">
                {index + 1}
              </span>
              <span>
                <span className="block text-[13px] font-medium">{step.title}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-fg">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {proof ? (
        <div className="border-t border-border px-5 py-4">
          <p className="text-[11px] font-semibold text-success">Last attestation</p>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-fg">
            {proof.hash}
          </p>
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4 text-[11px] text-muted-fg">
          Status: {proofStatus === "idle" ? "no proof yet" : proofStatus}
        </div>
      )}
    </Bento>
  );
}

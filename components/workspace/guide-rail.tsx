"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { displayNetworkLabel } from "@/lib/midnight-wallet";
import { useWorkspace } from "@/lib/workspace-store";

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
          <p className="text-[11px] font-semibold text-brand">{copy.rail.eyebrow}</p>
          <h2 className="text-sm font-semibold tracking-tight">{copy.rail.title}</h2>
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
          {copy.rail.steps.map((step, index) => (
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
          <p className="text-[11px] font-semibold text-success">{copy.rail.last}</p>
          {proof.ledgerId ? (
            <>
              <p className="mt-1 text-[11px] text-muted-fg">{copy.rail.ledger}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-fg">#{proof.ledgerId}</p>
            </>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-fg">Cleaned commitment</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-muted-fg">
            {proof.hash}
          </p>
          <p className="mt-2 text-[11px] text-muted-fg">Binding (original stays private)</p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-muted-fg">
            {proof.binding}
          </p>
          {proof.txId ? (
            <>
              <p className="mt-2 text-[11px] text-muted-fg">{copy.rail.tx}</p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-muted-fg">{proof.txId}</p>
            </>
          ) : null}
          {proof.network ? (
            <>
              <p className="mt-2 text-[11px] text-muted-fg">{copy.rail.network}</p>
              <p className="mt-0.5 text-[11px] text-muted-fg">
                {displayNetworkLabel(proof.network)}
              </p>
            </>
          ) : null}
          <p className="mt-2 text-[11px] text-muted-fg">
            {proof.status === "settled"
              ? copy.rail.notarySettled
              : proof.status === "proof-server-reachable"
                ? copy.rail.notaryServer
                : proof.note
                  ? proof.note
                  : copy.rail.notaryLocal}
          </p>
          {proof.walletAddress ? (
            <p className="mt-2 break-all font-mono text-[11px] text-muted-fg">
              {proof.walletAddress}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-border px-5 py-4 text-[11px] text-muted-fg">
          {proofStatus === "idle" ? copy.rail.idle : copy.action.processing}
        </div>
      )}
    </Bento>
  );
}

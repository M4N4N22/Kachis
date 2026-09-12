"use client";

import { type ReactNode } from "react";
import { MidnightWordmark } from "@/components/brand/midnight-mark";
import { EncryptButton } from "@/components/react-bits/EncryptButton";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";
import { cn } from "@/lib/cn";

function PoweredBySettle() {
  return (
    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-fg">
      <span>{copy.workspace.poweredBy}</span>
      <MidnightWordmark className="h-4 w-auto rounded-md bg-[#0000FE] px-1.5 py-0.5 text-white" />
      <span>{copy.workspace.poweredAnd}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wallets/1am.svg" alt="" className="h-5 w-5 rounded-md" />
      <span className="-ml-1 font-medium text-ink/70">1AM</span>
    </div>
  );
}

export function ChatStageActions({ turnActive }: { turnActive: boolean }) {
  const {
    proofStatus,
    proof,
    canShield,
    settleError,
    shieldGateHint,
    runScanner,
    settleShield,
    sendShielded,
    scanning,
    settling,
    sending,
    busy,
    sanitizedPrompt,
  } = useWorkspace();

  const reviewed =
    proofStatus === "reviewed" ||
    (proofStatus === "error" && Boolean(sanitizedPrompt.trim()) && !proof);
  const shielded = proofStatus === "shielded" && Boolean(sanitizedPrompt.trim()) && canShield;
  const settlingUi =
    proofStatus === "proving" || proofStatus === "attesting" || settling;
  const scannerBusy = scanning || proofStatus === "rewriting";
  const scannerLocked =
    busy ||
    sending ||
    proofStatus === "rewriting" ||
    proofStatus === "proving" ||
    proofStatus === "attesting";

  if (!turnActive) return null;

  let body: ReactNode = null;

  if (shielded) {
    body = (
      <EncryptButton
        label={copy.sanitized.confirmSend}
        loading={sending}
        disabled={busy || sending}
        onClick={() => void sendShielded()}
      />
    );
  } else if (reviewed || settlingUi) {
    const settleLabel =
      reviewed && !canShield ? copy.action.walletRequired : copy.sanitized.settle;
    body = (
      <div className="space-y-2">
        {reviewed && !canShield && shieldGateHint ? (
          <p className="text-center text-[11px] leading-relaxed text-muted-fg">
            {shieldGateHint}
          </p>
        ) : null}
        {settleError ? (
          <p
            role="alert"
            className="rounded-[0.85rem] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-[12px] leading-relaxed text-danger"
          >
            {settleError}
          </p>
        ) : null}
        <EncryptButton
          className={cn(!reviewed && "opacity-80")}
          label={settleLabel}
          loading={settlingUi}
          disabled={!reviewed || settlingUi || scanning || sending || !canShield}
          onClick={() => void settleShield()}
        />
        <PoweredBySettle />
      </div>
    );
  } else {
    body = (
      <EncryptButton
        label={copy.action.idle}
        loading={scannerBusy}
        disabled={scannerLocked || scanning}
        onClick={() => void runScanner()}
      />
    );
  }

  return <div className="mx-auto w-full max-w-3xl px-1">{body}</div>;
}

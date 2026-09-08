"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { WALLET_PROVIDERS } from "@/lib/types";

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { wallet, connectWallet, disconnectWallet } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (wallet.status === "connected" && wallet.address) {
    return (
      <div className="relative" ref={ref}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          className="max-w-[280px] bg-surface"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="truncate text-[12px]">
            {shorten(wallet.address)} · {copy.wallet.verifiedSuffix}
          </span>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        {open ? (
          <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
            <p className="text-[11px] font-semibold text-brand">Lace</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-fg">
              {wallet.address}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-fg">
              {wallet.live
                ? "Connected via Midnight Lace (unshielded address)."
                : copy.wallet.identity}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                disconnectWallet();
                setOpen(false);
              }}
            >
              {copy.wallet.disconnect}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        onClick={() => setOpen((value) => !value)}
        disabled={wallet.status === "connecting"}
      >
        <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
        {wallet.status === "connecting" ? copy.wallet.verifying : copy.wallet.connect}
      </Button>
      {open && wallet.status !== "connecting" ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl bg-surface p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
          <p className="px-2 pt-1 pb-2 text-[11px] text-muted-fg">
            {copy.wallet.choose} Requires the Lace extension with a Midnight account.
          </p>
          {wallet.error ? (
            <p className="px-2 pb-2 text-[11px] text-danger">{wallet.error}</p>
          ) : null}
          {WALLET_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                setOpen(false);
                void connectWallet(provider.id);
              }}
              className={cn(
                "flex w-full items-center rounded-xl px-3 py-2.5 text-left",
                "hover:bg-muted",
              )}
            >
              <span>
                <span className="block text-[13px] font-medium">{provider.name}</span>
                <span className="block text-[11px] text-muted-fg">{provider.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {wallet.error && !open ? (
        <p className="absolute top-full right-0 z-30 mt-2 max-w-72 text-right text-[11px] text-danger">
          {wallet.error}
        </p>
      ) : null}
    </div>
  );
}

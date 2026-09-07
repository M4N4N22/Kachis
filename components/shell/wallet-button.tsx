"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
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
          className="max-w-[220px] bg-surface"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="truncate font-mono text-[12px]">
            {shorten(wallet.address)}
          </span>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        {open ? (
          <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
            <p className="text-[11px] font-semibold text-brand">
              {wallet.provider === "lace" ? "Lace" : "Gero Wallet"}
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-fg">
              {wallet.address}
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
              Disconnect
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
        {wallet.status === "connecting" ? "Connecting…" : "Connect wallet"}
      </Button>
      {open && wallet.status !== "connecting" ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl bg-surface p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
          <p className="px-2 pt-1 pb-2 text-[11px] text-muted-fg">
            Mock Midnight connectors — Compact circuits come later.
          </p>
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
    </div>
  );
}

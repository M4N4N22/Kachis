"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import {
  displayNetworkLabel,
  dustAsset,
  formatDisplayAmount,
  formatDustLabel,
  listInjectedWallets,
  nightAsset,
  startWalletConnect,
  type DiscoveredWallet,
} from "@/lib/midnight-wallet";
import { WALLET_PROVIDERS, type WalletBalances, type WalletProviderId } from "@/lib/types";

function shorten(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

function safeIcon(icon: string | undefined) {
  if (!icon) return undefined;
  if (icon.startsWith("https://") || icon.startsWith("data:image/")) return icon;
  return undefined;
}

function displayName(wallet: { walletName?: string; provider?: WalletProviderId }) {
  if (wallet.walletName) return wallet.walletName;
  return WALLET_PROVIDERS.find((item) => item.id === wallet.provider)?.name ?? "Midnight";
}

function BalanceRows({
  balances,
  network,
}: {
  balances: WalletBalances;
  network?: string;
}) {
  const night = nightAsset(network);
  const dust = dustAsset(network);
  const rows = [
    { label: copy.wallet.unshielded, value: `${formatDisplayAmount(balances.unshielded)} ${night}` },
    { label: copy.wallet.shielded, value: `${formatDisplayAmount(balances.shielded)} ${night}` },
    {
      label: copy.wallet.dust,
      value: formatDustLabel(balances, dust),
    },
  ];
  return (
    <dl className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-[11px] text-muted-fg">{row.label}</dt>
          <dd className="font-mono text-[11px] text-ink">{row.value}</dd>
        </div>
      ))}
      {balances.dustHint ? (
        <p className="pt-1 text-[11px] leading-relaxed text-muted-fg">{balances.dustHint}</p>
      ) : null}
    </dl>
  );
}

export function WalletButton() {
  const { wallet, connectWallet, disconnectWallet, refreshWalletBalances } = useApp();
  const [open, setOpen] = useState(false);
  const [injected, setInjected] = useState<DiscoveredWallet[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function refresh() {
      setInjected(listInjectedWallets());
    }
    refresh();
    const timer = window.setInterval(refresh, 800);
    return () => window.clearInterval(timer);
  }, []);

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
          className="max-w-[320px] bg-surface"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="truncate text-[12px]">
            {wallet.balances?.unshielded && wallet.balances.unshielded !== "—"
              ? `${formatDisplayAmount(wallet.balances.unshielded)} ${nightAsset(wallet.network)} · ${formatDustLabel(wallet.balances, dustAsset(wallet.network))}`
              : `${shorten(wallet.address)} · ${displayNetworkLabel(wallet.network)}`}
          </span>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Button>
        {open ? (
          <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
            <p className="text-[11px] font-semibold text-brand">{displayName(wallet)}</p>
            <p className="mt-0.5 text-[11px] text-muted-fg">{displayNetworkLabel(wallet.network)}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-fg">
              {wallet.address}
            </p>
            {wallet.balances ? (
              <BalanceRows balances={wallet.balances} network={wallet.network} />
            ) : (
              <p className="mt-3 text-[11px] text-muted-fg">{copy.wallet.balancesUnavailable}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => void refreshWalletBalances()}
            >
              {copy.wallet.refresh}
            </Button>
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
      {wallet.status === "connecting" ? (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled>
            <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
            {copy.wallet.verifying}
          </Button>
          <Button variant="ghost" size="sm" onClick={disconnectWallet}>
            {copy.wallet.cancel}
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setOpen((value) => !value)}>
          <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.wallet.connect}
        </Button>
      )}
      {open && wallet.status !== "connecting" ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-2xl bg-surface p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
          <p className="px-2 pt-1 pb-2 text-[11px] text-muted-fg">{copy.wallet.choose}</p>
          <p className="px-2 pb-2 text-[11px] text-muted-fg">
            {injected.length > 0
              ? `Detected: ${injected.map((item) => item.name).join(", ")}`
              : "No connector on this page yet. Unlock the extension, then refresh."}
          </p>
          <p className="px-2 pb-2 text-[11px] text-muted-fg">
            Approve in the wallet pop-up. It may open behind this window.
          </p>
          {wallet.error ? (
            <p className="px-2 pb-2 text-[11px] text-danger">{wallet.error}</p>
          ) : null}
          {WALLET_PROVIDERS.map((provider) => {
            const live = injected.some(
              (item) => item.knownId === provider.id || item.key === provider.id,
            );
            const icon = safeIcon(
              injected.find((item) => item.knownId === provider.id)?.icon,
            );
            return (
              <button
                key={provider.id}
                type="button"
                disabled={!live}
                onClick={() => {
                  if (!live) return;
                  try {
                    const session = startWalletConnect(provider.id);
                    void connectWallet(provider.id, session);
                  } catch {
                    void connectWallet(provider.id);
                  }
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                  live ? "hover:bg-muted" : "cursor-not-allowed opacity-50",
                )}
              >
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" className="h-5 w-5 rounded-md" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
                    {provider.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-[13px] font-medium">{provider.name}</span>
                    {live ? (
                      <span className="text-[10px] font-semibold text-success">Detected</span>
                    ) : null}
                  </span>
                  <span className="block text-[11px] text-muted-fg">
                    {live ? provider.hint : "Not detected on this page"}
                  </span>
                </span>
              </button>
            );
          })}
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

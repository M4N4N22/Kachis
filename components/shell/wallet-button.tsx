"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ChevronDown, Copy, LogOut, RefreshCw } from "lucide-react";
import { ConnectWalletModal } from "@/components/shell/connect-wallet-modal";
import { RadialGlowButton } from "@/components/react-bits/radial-glow-button";
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

function displayName(wallet: { walletName?: string; provider?: WalletProviderId }) {
  if (wallet.walletName) return wallet.walletName;
  return WALLET_PROVIDERS.find((item) => item.id === wallet.provider)?.name ?? "Wallet";
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
    <dl className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-[11px] text-ink/45">{row.label}</dt>
          <dd className="font-mono text-[12px] text-ink">{row.value}</dd>
        </div>
      ))}
      {balances.dustHint ? (
        <p className="pt-1 text-[11px] leading-relaxed text-ink/40">{balances.dustHint}</p>
      ) : null}
    </dl>
  );
}

function connectedSummary(address: string, balances?: WalletBalances, network?: string) {
  const short = shorten(address);
  if (!balances) return short;
  const night = nightAsset(network);
  const dust = dustAsset(network);
  const unshielded =
    balances.unshielded && balances.unshielded !== "—"
      ? `${formatDisplayAmount(balances.unshielded)} ${night}`
      : null;
  const fee = formatDustLabel(balances, dust);
  return [short, unshielded, fee].filter(Boolean).join(" · ");
}

export function WalletButton() {
  const { wallet, connectWallet, disconnectWallet, refreshWalletBalances } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [injected, setInjected] = useState<DiscoveredWallet[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    function refresh() {
      setInjected(listInjectedWallets());
    }
    refresh();
    const timer = window.setInterval(refresh, 800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (wallet.status === "connecting") {
      setModalOpen(false);
      setMenuOpen(false);
    }
    if (wallet.status === "connected") {
      setModalOpen(false);
    }
  }, [wallet.status]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const handleConnect = useCallback(
    (provider: WalletProviderId) => {
      try {
        const session = startWalletConnect(provider);
        void connectWallet(provider, session);
      } catch {
        void connectWallet(provider);
      }
      setModalOpen(false);
    },
    [connectWallet],
  );

  const copyAddress = useCallback(async () => {
    if (!wallet.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }, [wallet.address]);

  if (wallet.status === "connected" && wallet.address) {
    const providerIcon = WALLET_PROVIDERS.find((item) => item.id === wallet.provider)?.icon;

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className={cn(
            "inline-flex max-w-[min(100vw-8rem,28rem)] items-center gap-2 rounded-full border border-ink/10 px-4 py-3 text-left transition-colors hover:border-ink/20",
            menuOpen && "border-brand-a",
          )}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          {providerIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={providerIcon} alt="" className="h-5 w-5 shrink-0 rounded-md" />
          ) : null}
          <span className="min-w-0 truncate font-mono text-[12px] text-ink">
            {connectedSummary(wallet.address, wallet.balances, wallet.network)}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-fg transition-transform",
              menuOpen && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full right-0 z-50 mt-4 w-[20.5rem] overflow-hidden rounded-[1.35rem]  bg-ink/5 p-4 shadow-lg backdrop-blur-md"
            >
              <div className="rounded-2xl border border-ink/5 bg-black p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink">{displayName(wallet)}</p>
                    <p className="mt-0.5 text-[11px] text-ink/45">
                      {displayNetworkLabel(wallet.network)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-2 py-1 text-[10px] font-semibold text-ink/60 transition-colors hover:bg-ink/8 hover:text-ink"
                  >
                    <Copy className="h-3 w-3" strokeWidth={1.75} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-3 break-all font-mono text-[11px] leading-5 text-ink/70">
                  {wallet.address}
                </p>
              </div>

              <div className="mt-3 rounded-2xl bg-black px-3.5 py-3">
                {wallet.balances ? (
                  <BalanceRows balances={wallet.balances} network={wallet.network} />
                ) : (
                  <p className="text-[11px] text-ink/45">{copy.wallet.balancesUnavailable}</p>
                )}
              </div>

              <div className="mt-3 grid gap-2">
                <Link
                  href="/identity"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-4 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90"
                >
                  {copy.wallet.viewIdentity}
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Link>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => void refreshWalletBalances()}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-ink/10 bg-ink/[0.04] text-[12px] font-medium text-ink/80 transition-colors hover:bg-ink/[0.08]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {copy.wallet.refresh}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      disconnectWallet();
                      setMenuOpen(false);
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-ink/10 bg-ink/[0.04] text-[12px] font-medium text-ink/80 transition-colors hover:bg-ink/[0.08]"
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {copy.wallet.disconnect}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {wallet.status === "connecting" ? (
        <div className="flex items-center gap-2">
          <RadialGlowButton size="sm" rounded="full" disabled>
            {copy.wallet.verifying}
          </RadialGlowButton>
          <Button variant="ghost" size="sm" onClick={disconnectWallet}>
            {copy.wallet.cancel}
          </Button>
        </div>
      ) : (
        <RadialGlowButton size="sm" rounded="full" onClick={() => setModalOpen(true)}>
          {copy.wallet.connect}
        </RadialGlowButton>
      )}

      <ConnectWalletModal
        open={modalOpen && wallet.status !== "connecting"}
        onClose={closeModal}
        injected={injected}
        error={wallet.error}
        onConnect={handleConnect}
      />

      {wallet.error && !modalOpen ? (
        <p className="absolute top-full right-0 z-30 mt-2 max-w-72 text-right text-[11px] text-danger">
          {wallet.error}
        </p>
      ) : null}
    </div>
  );
}

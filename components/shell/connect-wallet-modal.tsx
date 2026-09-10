"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound, Shield, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { type DiscoveredWallet } from "@/lib/midnight-wallet";
import { WALLET_PROVIDERS, type WalletProviderId } from "@/lib/types";

function safeIcon(icon: string | undefined) {
  if (!icon) return undefined;
  if (icon.startsWith("https://") || icon.startsWith("data:image/")) return icon;
  return undefined;
}

type ConnectWalletModalProps = {
  open: boolean;
  onClose: () => void;
  injected: DiscoveredWallet[];
  error?: string;
  onConnect: (provider: WalletProviderId) => void;
};

export function ConnectWalletModal({
  open,
  onClose,
  injected,
  error,
  onConnect,
}: ConnectWalletModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const detected = injected.map((item) => item.name);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/55 "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-wallet-title"
            className="relative z-10 grid w-full max-w-[860px] overflow-hidden rounded-[28px] bg-ink/5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:grid-cols-2"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div
              className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-80 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--brand-accent) 55%, transparent) 0%, color-mix(in srgb, var(--brand-a) 35%, transparent) 42%, transparent 70%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-0 right-0 h-40 w-56 opacity-70 blur-3xl"
              style={{
                background:
                  "linear-gradient(225deg, color-mix(in srgb, var(--brand-accent) 40%, transparent), transparent 70%)",
              }}
              aria-hidden
            />

            <div className="relative flex flex-col justify-between gap-10 p-7 sm:p-8 md:p-9">
              <div>
                <h2 className="text-[1.65rem] font-semibold tracking-tight text-ink sm:text-[1.85rem]">
                  {copy.wallet.modalEducateTitle}
                </h2>

                <ul className="mt-8 space-y-6">
                  <li className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl  bg-ink/[0.04] text-ink">
                      <Shield className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">
                        {copy.wallet.modalEducateAssetsTitle}
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-ink/55">
                        {copy.wallet.modalEducateAssetsBody}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink">
                      <KeyRound className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">
                        {copy.wallet.modalEducateLoginTitle}
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-ink/55">
                        {copy.wallet.modalEducateLoginBody}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="https://midnight.network"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-10 items-center rounded-full border border-ink/12 bg-ink/[0.06] px-4 text-[13px] font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-ink/[0.1]"
                >
                  {copy.wallet.modalGetWallet}
                </a>
                <a
                  href="https://docs.midnight.network"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[13px] font-medium text-ink/55 transition-colors hover:text-ink"
                >
                  {copy.wallet.modalLearnMore}
                </a>
              </div>
            </div>

            <div className="relative p-4 sm:p-5 md:pl-0 md:pr-5 md:py-5">
              <div className="flex h-full flex-col rounded-[22px] border border-ink/10 bg-black/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id="connect-wallet-title"
                    className="text-[1.05rem] font-semibold tracking-tight text-ink"
                  >
                    {copy.wallet.modalTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/10 hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>

                <p className="mt-3 text-[12px] leading-5 text-ink/45">{copy.wallet.choose}</p>
                <p className="mt-1 text-[12px] leading-5 text-ink/45">
                  {detected.length > 0
                    ? `${copy.wallet.modalDetected}: ${detected.join(", ")}`
                    : copy.wallet.modalEmpty}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-ink/40">
                  {copy.wallet.modalApproveHint}
                </p>

                {error ? <p className="mt-3 text-[12px] text-danger">{error}</p> : null}

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-ink/35 uppercase">
                    {copy.wallet.modalRecommended}
                  </p>
                  <div className="space-y-1.5">
                    {WALLET_PROVIDERS.map((provider, index) => {
                      const supported = provider.status === "supported";
                      const live = injected.some(
                        (item) => item.knownId === provider.id || item.key === provider.id,
                      );
                      const injectedIcon = safeIcon(
                        injected.find((item) => item.knownId === provider.id)?.icon,
                      );
                      const icon = injectedIcon ?? provider.icon;
                      const canConnect = supported && live;

                      return (
                        <motion.button
                          key={provider.id}
                          type="button"
                          disabled={!canConnect}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 + index * 0.04, duration: 0.25 }}
                          onClick={() => {
                            if (!canConnect) return;
                            onConnect(provider.id);
                          }}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                            canConnect
                              ? "hover:bg-ink/5"
                              : "cursor-not-allowed opacity-55",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={icon}
                            alt=""
                            className="h-9 w-9 rounded-xl  object-cover"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="block text-[14px] font-medium text-ink">
                                {provider.name}
                              </span>
                              {provider.recommended ? (
                                <span className="rounded-full bg-[color-mix(in_srgb,var(--brand-a)_22%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color-mix(in_srgb,var(--brand-accent)_85%,ink)]">
                                  {copy.wallet.modalSupported}
                                </span>
                              ) : (
                                <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10px] font-semibold text-ink/45">
                                  {copy.wallet.modalComingSoon}
                                </span>
                              )}
                              {supported && live ? (
                                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  {copy.wallet.modalDetected}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-ink/40">
                              {!supported
                                ? copy.wallet.modalComingSoonHint
                                : live
                                  ? provider.hint
                                  : copy.wallet.modalUnavailable}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

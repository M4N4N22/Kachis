"use client";

import { Fingerprint } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { displayNetworkLabel, dustAsset, nightAsset } from "@/lib/midnight-wallet";

export function IdentityView() {
  const { profile, wallet } = useApp();
  const connected = wallet.status === "connected";

  const credentials = [
    {
      title: connected ? (wallet.walletName ?? "Midnight wallet") : "Midnight wallet",
      issuer: "dApp connector",
      disclosed: connected ? "Unshielded address" : "Not connected",
      live: connected,
    },
    {
      title: "Employment",
      issuer: "Not issued",
      disclosed: "Passport later",
      live: false,
    },
    {
      title: "Org membership",
      issuer: "Not issued",
      disclosed: "Passport later",
      live: false,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <Bento className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--brand)_22%,transparent),transparent_46%)]" />
        <div className="relative">
          <p className="text-[11px] font-semibold text-brand">{copy.identity.eyebrow}</p>
          <h2 className="mt-6 text-2xl font-light tracking-tight">{profile.name}</h2>
          <p className="mt-1 text-[13px] text-muted-fg">
            {profile.organization} · {profile.title}
          </p>
          <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-fg">
            <Fingerprint className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
            {connected
              ? `${copy.wallet.verifiedSuffix} · ${displayNetworkLabel(wallet.network)}`
              : copy.status.unverified}
          </div>
          <p className="mt-6 break-all font-mono text-[11px] text-muted-fg">
            {wallet.address ?? "Connect Midnight Lace to bind this seat."}
          </p>
          {connected && wallet.balances ? (
            <dl className="mt-6 space-y-2">
              <div className="flex justify-between gap-3 text-[11px]">
                <dt className="text-muted-fg">{copy.wallet.unshielded}</dt>
                <dd className="font-mono">
                  {wallet.balances.unshielded} {nightAsset(wallet.network)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-[11px]">
                <dt className="text-muted-fg">{copy.wallet.shielded}</dt>
                <dd className="font-mono">
                  {wallet.balances.shielded} {nightAsset(wallet.network)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-[11px]">
                <dt className="text-muted-fg">{copy.wallet.dust}</dt>
                <dd className="font-mono">
                  {wallet.balances.dust}
                  {wallet.balances.dustCap !== "—" ? ` / ${wallet.balances.dustCap}` : ""}{" "}
                  {dustAsset(wallet.network)}
                </dd>
              </div>
            </dl>
          ) : connected ? (
            <p className="mt-6 text-[11px] text-muted-fg">{copy.wallet.balancesUnavailable}</p>
          ) : null}
        </div>
      </Bento>

      <div className="space-y-4">
        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">Selective disclosure</p>
          <h2 className="mt-1 text-sm font-semibold tracking-tight">
            Verify a fact, keep the rest
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {credentials.map((credential) => (
              <div key={credential.title} className="rounded-2xl bg-bg p-4">
                <p className="text-[13px] font-medium">{credential.title}</p>
                <p className="mt-1 text-[11px] text-muted-fg">{credential.issuer}</p>
                <p className={`mt-4 text-[11px] ${credential.live ? "text-brand" : "text-muted-fg"}`}>
                  {credential.disclosed}
                </p>
              </div>
            ))}
          </div>
        </Bento>

        <Bento className="p-5">
          <p className="text-[11px] font-semibold text-brand">On-device clearance</p>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-fg">
            {copy.identity.context}
          </p>
        </Bento>
      </div>
    </div>
  );
}

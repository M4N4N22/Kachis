"use client";

import { useEffect, useState } from "react";
import { Building2, Fingerprint, KeyRound } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import {
  displayNetworkLabel,
  dustAsset,
  formatDisplayAmount,
  formatDustLabel,
  nightAsset,
} from "@/lib/midnight-wallet";

type ProviderStatus = {
  openai: boolean;
  anthropic: boolean;
  gemini: boolean;
};

export function IdentityView() {
  const {
    profile,
    wallet,
    organization,
    tier,
    createOrganization,
    leaveOrganization,
  } = useApp();
  const connected = wallet.status === "connected";
  const [providers, setProviders] = useState<ProviderStatus>({
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [orgName, setOrgName] = useState("");
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/providers")
      .then((response) => response.json())
      .then((data: ProviderStatus) => {
        if (!cancelled) setProviders(data);
      })
      .catch(() => {
        if (!cancelled) {
          setProviders({ openai: false, anthropic: false, gemini: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const providerRows = [
    { id: "openai" as const, label: copy.providers.openai, env: "OPENAI_API_KEY" },
    { id: "anthropic" as const, label: copy.providers.anthropic, env: "ANTHROPIC_API_KEY" },
    { id: "gemini" as const, label: copy.providers.gemini, env: "GEMINI_API_KEY" },
  ];

  async function onCreateOrg() {
    setOrgBusy(true);
    setOrgError(null);
    const result = await createOrganization(orgName);
    setOrgBusy(false);
    if (!result.ok) {
      setOrgError(result.error);
      return;
    }
    setOrgName("");
  }

  async function onLeaveOrg() {
    setOrgBusy(true);
    setOrgError(null);
    const result = await leaveOrganization();
    setOrgBusy(false);
    if (!result.ok) setOrgError(result.error);
  }

  return (
    <div className="space-y-4">
      <Bento className="p-5">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 text-brand" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">{copy.org.title}</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
              {copy.org.helper}
            </p>
            <p className="mt-3 text-[13px] text-muted-fg">
              {organization ? copy.org.institutionalBody : copy.org.sandboxBody}
            </p>

            {organization ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-bg px-4 py-3">
                  <p className="text-[13px] font-medium">{organization.name}</p>
                  <p className="mt-1 text-[11px] text-muted-fg">
                    {copy.tiers.institutional.badge} · {copy.org.members}:{" "}
                    {organization.memberAddresses.length}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-fg">
                    {copy.org.admin}: {organization.adminAddress.slice(0, 12)}…
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!connected || orgBusy}
                  onClick={() => void onLeaveOrg()}
                >
                  {orgBusy ? copy.org.leaving : copy.org.leave}
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold text-muted-fg">
                    {copy.org.nameLabel}
                  </span>
                  <input
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    placeholder={copy.org.namePlaceholder}
                    disabled={!connected || orgBusy}
                    className="mt-1.5 w-full max-w-md rounded-xl border border-ink/10 bg-black/25 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
                  />
                </label>
                <Button
                  size="sm"
                  disabled={!connected || orgBusy || orgName.trim().length < 2}
                  onClick={() => void onCreateOrg()}
                >
                  {orgBusy ? copy.org.creating : copy.org.create}
                </Button>
                {!connected ? (
                  <p className="text-[11px] text-muted-fg">{copy.org.walletRequired}</p>
                ) : null}
              </div>
            )}

            {orgError ? (
              <p className="mt-3 text-[11px] text-danger">{orgError}</p>
            ) : null}
            <p className="mt-3 text-[11px] text-muted-fg">
              {copy.nav.contextLabel}:{" "}
              {organization
                ? `${organization.name} · ${copy.nav.orgSuffix}`
                : copy.nav.sandbox}{" "}
              ({tier === "institutional" ? copy.tiers.institutional.pill : copy.tiers.sandbox.pill})
            </p>
          </div>
        </div>
      </Bento>

      <Bento className="p-5">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-4 w-4 text-brand" strokeWidth={1.75} />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{copy.providers.title}</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
              {copy.providers.helper}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {providerRows.map((provider) => {
            const configured = providers[provider.id];
            return (
              <div key={provider.id} className="rounded-2xl bg-bg px-4 py-3">
                <p className="text-[13px] font-medium">{provider.label}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-fg">{provider.env}</p>
                <p className={`mt-3 text-[11px] ${configured ? "text-brand" : "text-muted-fg"}`}>
                  {configured ? copy.providers.configured : copy.providers.missing}
                </p>
              </div>
            );
          })}
        </div>
      </Bento>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <Bento className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--brand)_22%,transparent),transparent_46%)]" />
          <div className="relative">
            <p className="text-[11px] font-semibold text-muted-fg">{copy.providers.seatTitle}</p>
            <h2 className="mt-2 text-2xl font-light tracking-tight">{profile.name}</h2>
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
              {wallet.address ?? "Connect a wallet to continue."}
            </p>
            {connected && wallet.balances ? (
              <dl className="mt-6 space-y-2">
                <div className="flex justify-between gap-3 text-[11px]">
                  <dt className="text-muted-fg">{copy.wallet.unshielded}</dt>
                  <dd className="font-mono">
                    {formatDisplayAmount(wallet.balances.unshielded)} {nightAsset(wallet.network)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-[11px]">
                  <dt className="text-muted-fg">{copy.wallet.shielded}</dt>
                  <dd className="font-mono">
                    {formatDisplayAmount(wallet.balances.shielded)} {nightAsset(wallet.network)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-[11px]">
                  <dt className="text-muted-fg">{copy.wallet.dust}</dt>
                  <dd className="font-mono">
                    {formatDustLabel(wallet.balances, dustAsset(wallet.network))}
                  </dd>
                </div>
              </dl>
            ) : connected ? (
              <p className="mt-6 text-[11px] text-muted-fg">{copy.wallet.balancesUnavailable}</p>
            ) : null}
          </div>
        </Bento>

        <Bento className="p-5">
          <h2 className="text-sm font-semibold tracking-tight">{copy.identity.disclose}</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-fg">
            {connected ? copy.identity.context : copy.guardrails.seatEmpty}
          </p>
        </Bento>
      </div>
    </div>
  );
}

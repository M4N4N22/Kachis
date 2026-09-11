"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Building2, Loader2, UserRound } from "lucide-react";
import { NodeProvisionChecklist } from "@/components/onboarding/node-provision-checklist";
import { OnboardingSuccess } from "@/components/onboarding/onboarding-success";
import { ConnectWalletModal } from "@/components/shell/connect-wallet-modal";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import Stepper, { Step } from "@/components/react-bits/Stepper";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { listInjectedWallets, type DiscoveredWallet } from "@/lib/midnight-wallet";
import type { WalletProviderId } from "@/lib/types";

type WorkspacePath = "solo" | "institutional";
type OutroPhase = "idle" | "success" | "setup";

const SETUP_DURATION_MS = 1400;

function OnboardingChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#07090f] text-ink">
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo inverted />
        </Link>
        <Link href="/demo" className="text-[13px] text-ink/55 hover:text-ink">
          {copy.demo.landing}
        </Link>
      </header>
      {children}
    </div>
  );
}

function OnboardingBootShell({ message }: { message?: string }) {
  return (
    <OnboardingChrome>
      <div className="relative z-10 flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6">
        <Loader2 className="h-5 w-5 animate-spin text-brand" strokeWidth={1.75} />
        {message ? (
          <p className="text-[13px] text-ink/55">{message}</p>
        ) : null}
      </div>
    </OnboardingChrome>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const {
    wallet,
    connectWallet,
    orgLoading,
    seatProfile,
    seatResolved,
    supabaseConfigured,
    onboardSandbox,
    onboardInstitutional,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [path, setPath] = useState<WorkspacePath | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [injected, setInjected] = useState<DiscoveredWallet[]>([]);
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionReady, setProvisionReady] = useState(false);
  const [outro, setOutro] = useState<OutroPhase>("idle");
  const provisionStarted = useRef(false);

  const connected = wallet.status === "connected" && Boolean(wallet.address);
  const alreadyOnboarded = Boolean(seatProfile?.onboardingCompleted);
  const resolvingSeat = connected && (!seatResolved || orgLoading);
  /** Returning users + in-flight seat lookup — never show the create-workspace stepper. */
  const holdForExisting =
    outro === "idle" && (alreadyOnboarded || resolvingSeat);
  /** New users only: wallet connected and no completed profile yet. */
  const showCreateWorkspace =
    outro === "idle" &&
    connected &&
    seatResolved &&
    !orgLoading &&
    !alreadyOnboarded;
  const showSignIn = outro === "idle" && !connected && wallet.status !== "connecting";
  const connecting = wallet.status === "connecting";

  const setupStates = useMemo(
    () => copy.onboarding.setupLoading.map((item) => ({ text: item.text })),
    [],
  );

  useEffect(() => {
    setInjected(listInjectedWallets());
    const timer = window.setInterval(() => setInjected(listInjectedWallets()), 1500);
    return () => window.clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    if (outro !== "idle") return;
    if (!alreadyOnboarded) return;
    router.replace("/workspace");
  }, [alreadyOnboarded, outro, router]);

  useEffect(() => {
    if (outro !== "success") return;
    const timer = window.setTimeout(() => setOutro("setup"), 2200);
    return () => window.clearTimeout(timer);
  }, [outro]);

  useEffect(() => {
    if (outro !== "setup") return;
    const total = setupStates.length * SETUP_DURATION_MS + 500;
    const timer = window.setTimeout(() => {
      router.replace("/workspace");
    }, total);
    return () => window.clearTimeout(timer);
  }, [outro, router, setupStates.length]);

  const onConnect = useCallback(
    (provider: WalletProviderId) => {
      setModalOpen(false);
      void connectWallet(provider);
    },
    [connectWallet],
  );

  const canAdvance = useMemo(() => {
    if (!supabaseConfigured || outro !== "idle") return false;
    if (currentStep === 1) return path != null;
    if (currentStep === 2) {
      if (path === "institutional") return orgName.trim().length >= 2;
      return path === "solo";
    }
    if (currentStep === 3) {
      if (path === "institutional") return provisionReady && !busy;
      return path === "solo" && !busy;
    }
    return false;
  }, [
    busy,
    currentStep,
    orgName,
    outro,
    path,
    provisionReady,
    supabaseConfigured,
  ]);

  const nextLabel = useMemo(() => {
    if (currentStep === 3) return copy.onboarding.stepComplete;
    return copy.onboarding.stepNext;
  }, [currentStep]);

  const runSolo = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await onboardSandbox();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }, [onboardSandbox]);

  const runInstitutional = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await onboardInstitutional(orgName.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setProvisionReady(false);
      provisionStarted.current = false;
      return false;
    }
    setProvisionReady(true);
    return true;
  }, [onboardInstitutional, orgName]);

  const onChecklistComplete = useCallback(() => {
    if (provisionStarted.current) return;
    provisionStarted.current = true;
    void runInstitutional();
  }, [runInstitutional]);

  const onFinalStepCompleted = useCallback(async () => {
    if (path === "solo") {
      const ok = await runSolo();
      if (ok) setOutro("success");
      return;
    }
    if (path === "institutional" && provisionReady) {
      setOutro("success");
    }
  }, [path, provisionReady, runSolo]);

  useEffect(() => {
    if (currentStep !== 3 || path !== "institutional") {
      setProvisionReady(false);
      provisionStarted.current = false;
    }
  }, [currentStep, path]);

  if (holdForExisting) {
    return (
      <OnboardingBootShell
        message={
          alreadyOnboarded
            ? copy.onboarding.openingWorkspace
            : copy.onboarding.verifyingAccount
        }
      />
    );
  }

  if (connecting) {
    return <OnboardingBootShell message={copy.wallet.verifying} />;
  }

  return (
    <OnboardingChrome>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 pb-16 pt-4 md:pt-8">
        {!supabaseConfigured ? (
          <p className="mb-4 text-center text-[12px] text-ink/55">
            {copy.onboarding.supabaseMissing}
          </p>
        ) : null}

        {showSignIn ? (
          <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-ink/10 bg-bg/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md md:p-8">
            <h1 className="text-2xl font-light tracking-tight">{copy.onboarding.signInTitle}</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink/60">{copy.onboarding.signInBody}</p>
            <p className="mt-4 text-[13px] leading-6 text-ink/70">{copy.onboarding.walletFirst}</p>
            <Button className="mt-6" onClick={() => setModalOpen(true)}>
              {copy.wallet.connect}
            </Button>
            {wallet.error ? (
              <p className="mt-3 text-[12px] text-danger">{wallet.error}</p>
            ) : null}
          </div>
        ) : null}

        {showCreateWorkspace ? (
          <Stepper
            key="create-workspace"
            initialStep={1}
            onStepChange={setCurrentStep}
            onFinalStepCompleted={() => void onFinalStepCompleted()}
            backButtonText={copy.onboarding.stepBack}
            nextButtonText={nextLabel}
            disableStepIndicators
            nextButtonProps={{
              disabled: !canAdvance,
              children:
                currentStep === 3 && busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                    {copy.onboarding.stepComplete}
                  </span>
                ) : (
                  nextLabel
                ),
            }}
            backButtonProps={{
              disabled: busy || outro !== "idle",
            }}
          >
            <Step>
              <h2 className="text-xl font-light tracking-tight">{copy.onboarding.chooseTitle}</h2>
              <p className="mt-2 text-[13px] leading-6 text-ink/60">{copy.onboarding.chooseBody}</p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPath("solo");
                    setError(null);
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    path === "solo"
                      ? "border-brand bg-brand/10"
                      : "border-ink/10 bg-black/20 hover:border-ink/20",
                  )}
                >
                  <div className="flex items-center gap-2 text-brand">
                    <UserRound className="h-4 w-4" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium text-ink">
                      {copy.onboarding.soloTitle}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-ink/60">
                    {copy.onboarding.soloBody}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPath("institutional");
                    setError(null);
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    path === "institutional"
                      ? "border-[color-mix(in_srgb,var(--brand-a)_55%,transparent)] bg-brand/10"
                      : "border-ink/10 bg-black/20 hover:border-ink/20",
                  )}
                >
                  <div className="flex items-center gap-2 text-brand">
                    <Building2 className="h-4 w-4" strokeWidth={1.75} />
                    <span className="text-[14px] font-medium text-ink">
                      {copy.onboarding.institutionalTitle}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-ink/60">
                    {copy.onboarding.institutionalBody}
                  </p>
                </button>
              </div>
            </Step>

            <Step>
              <h2 className="text-xl font-light tracking-tight">
                {copy.onboarding.configureTitle}
              </h2>
              {path === "institutional" ? (
                <>
                  <p className="mt-2 text-[13px] leading-6 text-ink/60">
                    {copy.onboarding.configureOrgBody}
                  </p>
                  <label className="mt-5 block">
                    <span className="text-[11px] font-semibold text-ink/50">
                      {copy.org.nameLabel}
                    </span>
                    <input
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                      placeholder={copy.org.namePlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-ink/10 bg-black/30 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
                    />
                  </label>
                </>
              ) : (
                <p className="mt-2 text-[13px] leading-6 text-ink/60">
                  {copy.onboarding.configureSoloBody}
                </p>
              )}
            </Step>

            <Step>
              <h2 className="text-xl font-light tracking-tight">{copy.onboarding.finishTitle}</h2>
              {path === "institutional" ? (
                <>
                  <p className="mt-2 mb-4 text-[13px] leading-6 text-ink/60">
                    {copy.onboarding.finishOrgBody}
                  </p>
                  <NodeProvisionChecklist
                    orgName={orgName.trim() || copy.org.namePlaceholder}
                    active={currentStep === 3 && path === "institutional"}
                    onComplete={onChecklistComplete}
                  />
                </>
              ) : (
                <p className="mt-2 text-[13px] leading-6 text-ink/60">
                  {copy.onboarding.finishSoloBody}
                </p>
              )}
            </Step>
          </Stepper>
        ) : null}

        {error ? (
          <p className="mt-4 text-center text-[13px] text-danger">{error}</p>
        ) : null}
      </main>

      <ConnectWalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        injected={injected}
        error={wallet.error}
        onConnect={onConnect}
      />

      <AnimatePresence>
        {outro === "success" && path ? (
          <OnboardingSuccess key="onboarding-success" path={path} orgName={orgName} />
        ) : null}
      </AnimatePresence>

      <MultiStepLoader
        loadingStates={setupStates}
        loading={outro === "setup"}
        duration={SETUP_DURATION_MS}
        loop={false}
      />
    </OnboardingChrome>
  );
}

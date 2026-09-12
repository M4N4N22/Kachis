"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { copy } from "@/lib/copy";
import {
  clearConnectedWalletApi,
  displayNetworkLabel,
  finishWalletConnect,
  humanizeConnectError,
  refreshConnectedBalances,
  releaseConnectedWalletApi,
  startWalletConnect,
  type WalletConnectSession,
} from "@/lib/midnight-wallet";
import type { Profile, Tier, WalletProviderId, WalletState } from "@/lib/types";

interface UsageStats {
  proofsGenerated: number;
  bytesShielded: number;
  queries: number;
  blockedSecrets: number;
}

export type OrganizationSummary = {
  id: string;
  name: string;
  createdAt: string;
  adminAddress: string;
  memberAddresses: string[];
  requiredPackMask?: number;
};

export type SeatProfile = {
  id: string;
  walletAddress: string;
  activeTier: "sandbox" | "institutional";
  onboardingCompleted: boolean;
  createdAt: string;
};

interface AppContextValue {
  /** Derived from Supabase profile / org membership — not a free toggle. */
  tier: Tier;
  organization: OrganizationSummary | null;
  seatProfile: SeatProfile | null;
  orgLoading: boolean;
  /** False while seat context for the connected wallet is still loading. */
  seatResolved: boolean;
  supabaseConfigured: boolean;
  needsOnboarding: boolean;
  createOrganization: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  leaveOrganization: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onboardSandbox: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onboardInstitutional: (
    name: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  refreshOrganization: () => Promise<void>;
  wallet: WalletState;
  connectWallet: (provider: WalletProviderId, session?: WalletConnectSession) => Promise<void>;
  disconnectWallet: () => void;
  refreshWalletBalances: () => Promise<void>;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  profile: Profile;
  usage: UsageStats;
  recordProof: (inputLength: number, blockedSecrets: number) => void;
  recordQuery: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function shortenAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-4)}`;
}

function initialsFromAddress(address: string) {
  const alnum = address.replace(/[^a-zA-Z0-9]/g, "");
  return (alnum.slice(0, 2) || "K").toUpperCase();
}

function profileFor(
  tier: Tier,
  wallet: WalletState,
  organization: OrganizationSummary | null,
): Profile {
  if (wallet.status === "connected" && wallet.address) {
    const network = displayNetworkLabel(wallet.network);
    return {
      name: shortenAddress(wallet.address),
      initials: initialsFromAddress(wallet.address),
      title: copy.seat.verified,
      organization: organization
        ? `${organization.name} · ${copy.nav.orgSuffix}`
        : wallet.walletName
          ? `${copy.nav.sandbox} · ${wallet.walletName}`
          : `${copy.nav.sandbox} · ${network}`,
    };
  }

  return {
    name: copy.seat.unbound,
    initials: "K",
    title: copy.seat.notConnected,
    organization: copy.nav.sandbox,
  };
}

type SeatResponse = {
  tier?: Tier;
  organization?: OrganizationSummary | null;
  profile?: SeatProfile | null;
  configured?: boolean;
  error?: string;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const connectGeneration = useRef(0);
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [seatProfile, setSeatProfile] = useState<SeatProfile | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [seatResolved, setSeatResolved] = useState(true);
  const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [usage, setUsage] = useState<UsageStats>({
    proofsGenerated: 0,
    bytesShielded: 0,
    queries: 0,
    blockedSecrets: 0,
  });

  const tier: Tier =
    seatProfile?.activeTier === "institutional" || organization
      ? "institutional"
      : "freelancer";

  const needsOnboarding =
    supabaseConfigured &&
    wallet.status === "connected" &&
    Boolean(wallet.address) &&
    seatResolved &&
    !orgLoading &&
    (!seatProfile || !seatProfile.onboardingCompleted);

  const applySeat = useCallback((data: SeatResponse) => {
    setSupabaseConfigured(data.configured !== false);
    setOrganization(data.organization ?? null);
    setSeatProfile(data.profile ?? null);
  }, []);

  const refreshOrganization = useCallback(async () => {
    const address = wallet.status === "connected" ? wallet.address : undefined;
    if (!address) {
      setOrganization(null);
      setSeatProfile(null);
      setOrgLoading(false);
      setSeatResolved(true);
      return;
    }
    setSeatResolved(false);
    setOrgLoading(true);
    try {
      const response = await fetch(`/api/org?address=${encodeURIComponent(address)}`);
      const data = (await response.json()) as SeatResponse;
      if (!response.ok) {
        setOrganization(null);
        setSeatProfile(null);
        return;
      }
      applySeat(data);
    } catch {
      setOrganization(null);
      setSeatProfile(null);
    } finally {
      setOrgLoading(false);
      setSeatResolved(true);
    }
  }, [applySeat, wallet]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/org")
      .then((response) => response.json())
      .then((data: SeatResponse) => {
        if (!cancelled) setSupabaseConfigured(data.configured !== false);
      })
      .catch(() => {
        if (!cancelled) setSupabaseConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshOrganization();
  }, [refreshOrganization]);

  const postOrg = useCallback(
    async (body: Record<string, string>) => {
      if (wallet.status !== "connected" || !wallet.address) {
        return { ok: false as const, error: copy.org.walletRequired };
      }
      try {
        const response = await fetch("/api/org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, address: wallet.address }),
        });
        const data = (await response.json()) as SeatResponse;
        if (!response.ok) {
          return {
            ok: false as const,
            error: data.error ?? copy.org.createFailed,
          };
        }
        applySeat(data);
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: copy.org.createFailed };
      }
    },
    [applySeat, wallet],
  );

  const createOrganization = useCallback(
    async (name: string) => postOrg({ action: "create", name }),
    [postOrg],
  );

  const leaveOrganization = useCallback(async () => {
    if (wallet.status !== "connected" || !wallet.address) {
      return { ok: false as const, error: copy.org.walletRequired };
    }
    try {
      const response = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", address: wallet.address }),
      });
      const data = (await response.json()) as SeatResponse;
      if (!response.ok) {
        return { ok: false as const, error: data.error ?? copy.org.leaveFailed };
      }
      applySeat(data);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: copy.org.leaveFailed };
    }
  }, [applySeat, wallet]);

  const onboardSandbox = useCallback(
    async () => postOrg({ action: "onboard_sandbox" }),
    [postOrg],
  );

  const onboardInstitutional = useCallback(
    async (name: string) => postOrg({ action: "onboard_institutional", name }),
    [postOrg],
  );

  const connectWallet = useCallback(
    async (provider: WalletProviderId, session?: WalletConnectSession) => {
      let started = session;
      try {
        if (started) {
          // connect() already fired in the click handler — do not race an extension
          // disconnect underneath the in-flight approval.
          releaseConnectedWalletApi();
        } else {
          clearConnectedWalletApi();
          started = startWalletConnect(provider);
        }
      } catch (error) {
        setWallet({
          status: "disconnected",
          provider,
          live: false,
          error: humanizeConnectError(error),
        });
        return;
      }

      if (!started) return;

      const generation = ++connectGeneration.current;
      setWallet({ status: "connecting", provider, error: undefined });
      setSeatResolved(false);
      try {
        const connected = await finishWalletConnect(started);
        if (generation !== connectGeneration.current) return;
        setOrganization(null);
        setSeatProfile(null);
        setWallet({
          status: "connected",
          provider,
          address: connected.address,
          network: connected.network,
          live: true,
          walletName: connected.name,
          balances: connected.balances,
        });
        // Warm ledger WASM + settle keys so the first Approve & Settle is not cold.
        void import("@/lib/midnight-submit")
          .then((mod) => mod.warmSettleRuntime())
          .catch(() => undefined);
        // If balances were empty on first paint, refresh once the extension settles.
        if (!connected.balances) {
          void refreshConnectedBalances()
            .then((balances) => {
              if (!balances || generation !== connectGeneration.current) return;
              setWallet((current) =>
                current.status === "connected"
                  ? { ...current, balances, error: undefined }
                  : current,
              );
            })
            .catch(() => undefined);
        }
      } catch (error) {
        if (generation !== connectGeneration.current) return;
        setSeatResolved(true);
        setWallet({
          status: "disconnected",
          provider,
          live: false,
          error: humanizeConnectError(error),
        });
      }
    },
    [],
  );

  const disconnectWallet = useCallback(() => {
    connectGeneration.current += 1;
    clearConnectedWalletApi();
    setOrganization(null);
    setSeatProfile(null);
    setSeatResolved(true);
    setOrgLoading(false);
    setWallet({ status: "disconnected" });
  }, []);

  const refreshWalletBalances = useCallback(async () => {
    const balances = await refreshConnectedBalances();
    setWallet((current) => {
      if (current.status !== "connected") return current;
      if (!balances) {
        return {
          ...current,
          error:
            "Could not refresh wallet balances. Reconnect the wallet if this persists.",
        };
      }
      return { ...current, balances, error: undefined };
    });
  }, []);

  const recordProof = useCallback((inputLength: number, blockedSecrets: number) => {
    setUsage((current) => ({
      proofsGenerated: current.proofsGenerated + 1,
      bytesShielded: current.bytesShielded + inputLength,
      queries: current.queries,
      blockedSecrets: current.blockedSecrets + blockedSecrets,
    }));
  }, []);

  const recordQuery = useCallback(() => {
    setUsage((current) => ({ ...current, queries: current.queries + 1 }));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      tier,
      organization,
      seatProfile,
      orgLoading,
      seatResolved,
      supabaseConfigured,
      needsOnboarding,
      createOrganization,
      leaveOrganization,
      onboardSandbox,
      onboardInstitutional,
      refreshOrganization,
      wallet,
      connectWallet,
      disconnectWallet,
      refreshWalletBalances,
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((open) => !open),
      mobileNavOpen,
      setMobileNavOpen,
      profile: profileFor(tier, wallet, organization),
      usage,
      recordProof,
      recordQuery,
    }),
    [
      connectWallet,
      createOrganization,
      disconnectWallet,
      leaveOrganization,
      mobileNavOpen,
      needsOnboarding,
      onboardInstitutional,
      onboardSandbox,
      organization,
      orgLoading,
      recordProof,
      recordQuery,
      refreshOrganization,
      refreshWalletBalances,
      seatProfile,
      seatResolved,
      sidebarCollapsed,
      supabaseConfigured,
      tier,
      usage,
      wallet,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}

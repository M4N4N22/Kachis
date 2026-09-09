"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearConnectedWalletApi, finishWalletConnect, refreshConnectedBalances, startWalletConnect, type WalletConnectSession } from "@/lib/midnight-wallet";
import type { Profile, Tier, WalletProviderId, WalletState } from "@/lib/types";

interface UsageStats {
  proofsGenerated: number;
  bytesShielded: number;
  queries: number;
  blockedSecrets: number;
}

interface AppContextValue {
  tier: Tier;
  setTier: (tier: Tier) => void;
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

function profileFor(tier: Tier): Profile {
  if (tier === "institutional") {
    return {
      name: "Alex Rivera",
      initials: "AR",
      title: "Security Admin",
      organization: "Northwind Capital",
    };
  }

  return {
    name: "Alex Rivera",
    initials: "AR",
    title: "Independent consultant",
      organization: "Sandbox Workspace",
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const connectGeneration = useRef(0);
  const [tier, setTierState] = useState<Tier>("institutional");
  const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [usage, setUsage] = useState<UsageStats>({
    proofsGenerated: 0,
    bytesShielded: 0,
    queries: 0,
    blockedSecrets: 0,
  });

  const setTier = useCallback((next: Tier) => {
    setTierState(next);
  }, []);

  const connectWallet = useCallback(
    async (provider: WalletProviderId, session?: WalletConnectSession) => {
      let started = session;
      try {
        started ??= startWalletConnect(provider);
      } catch (error) {
        setWallet({
          status: "disconnected",
          provider,
          live: false,
          error: error instanceof Error ? error.message : "Wallet connection failed",
        });
        return;
      }

      if (!started) return;

      const generation = ++connectGeneration.current;
      setWallet({ status: "connecting", provider, error: undefined });
      try {
        const connected = await finishWalletConnect(started);
        if (generation !== connectGeneration.current) return;
        setWallet({
          status: "connected",
          provider,
          address: connected.address,
          network: connected.network,
          live: true,
          walletName: connected.name,
          balances: connected.balances,
        });
      } catch (error) {
        if (generation !== connectGeneration.current) return;
        setWallet({
          status: "disconnected",
          provider,
          live: false,
          error: error instanceof Error ? error.message : "Wallet connection failed",
        });
      }
    },
    [],
  );

  const disconnectWallet = useCallback(() => {
    connectGeneration.current += 1;
    clearConnectedWalletApi();
    setWallet({ status: "disconnected" });
  }, []);

  const refreshWalletBalances = useCallback(async () => {
    const balances = await refreshConnectedBalances();
    if (!balances) return;
    setWallet((current) =>
      current.status === "connected" ? { ...current, balances } : current,
    );
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
      setTier,
      wallet,
      connectWallet,
      disconnectWallet,
      refreshWalletBalances,
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((open) => !open),
      mobileNavOpen,
      setMobileNavOpen,
      profile: profileFor(tier),
      usage,
      recordProof,
      recordQuery,
    }),
    [
      connectWallet,
      disconnectWallet,
      refreshWalletBalances,
      mobileNavOpen,
      recordProof,
      recordQuery,
      setTier,
      sidebarCollapsed,
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

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockWalletAddress } from "@/lib/midnight";
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
  connectWallet: (provider: WalletProviderId) => Promise<void>;
  disconnectWallet: () => void;
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
    organization: "Freelancer",
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<Tier>("institutional");
  const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [usage, setUsage] = useState<UsageStats>({
    proofsGenerated: 18,
    bytesShielded: 2_480_000,
    queries: 41,
    blockedSecrets: 7,
  });

  const setTier = useCallback((next: Tier) => {
    setTierState(next);
  }, []);

  const connectWallet = useCallback(async (provider: WalletProviderId) => {
    setWallet({ status: "connecting", provider });
    await new Promise((resolve) => setTimeout(resolve, 700));
    setWallet({
      status: "connected",
      provider,
      address: mockWalletAddress(provider),
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({ status: "disconnected" });
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

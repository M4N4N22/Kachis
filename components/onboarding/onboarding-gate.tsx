"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-store";

const EXEMPT = new Set(["/demo", "/onboarding"]);

/** Sends connected wallets without a completed profile to /onboarding. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { needsOnboarding, orgLoading, seatResolved, wallet } = useApp();

  useEffect(() => {
    if (EXEMPT.has(pathname)) return;
    if (wallet.status !== "connected") return;
    if (orgLoading || !seatResolved) return;
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, orgLoading, pathname, router, seatResolved, wallet.status]);

  return <>{children}</>;
}

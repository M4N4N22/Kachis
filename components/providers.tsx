"use client";

import { AppProvider } from "@/lib/app-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

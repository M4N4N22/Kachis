"use client";

import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/app-store";
import { ByocProvider } from "@/lib/byoc-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ByocProvider>
        {children}
        <Toaster />
      </ByocProvider>
    </AppProvider>
  );
}

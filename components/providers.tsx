"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/lib/app-store";
import { ByocProvider } from "@/lib/byoc-store";
import { WorkspaceLayoutProvider } from "@/lib/workspace-layout-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AppProvider>
        <ByocProvider>
          <WorkspaceLayoutProvider>
            {children}
            <Toaster />
          </WorkspaceLayoutProvider>
        </ByocProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

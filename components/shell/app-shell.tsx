"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { cn } from "@/lib/cn";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locked = pathname === "/workspace" || pathname === "/demo";

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4 px-5 py-4",
            locked ? "overflow-auto xl:overflow-hidden" : "overflow-auto",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

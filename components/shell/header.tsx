"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { WalletButton } from "@/components/shell/wallet-button";
import { WorkspaceLayoutToggle } from "@/components/workspace/layout-toggle";
import { useApp } from "@/lib/app-store";
import { PAGE_COPY, type PageHref } from "@/lib/nav";

export function Header() {
  const pathname = usePathname();
  const { setMobileNavOpen } = useApp();
  const copy = PAGE_COPY[pathname as PageHref] ?? PAGE_COPY["/workspace"];
  const showWorkspaceLayout =
    pathname === "/workspace" || pathname === "/demo";

  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 bg-bg/95 px-6 py-2 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-xl p-2 text-muted-fg hover:bg-muted md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate">{copy.title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {showWorkspaceLayout ? <WorkspaceLayoutToggle /> : null}
  
        <WalletButton />
      </div>
    </header>
  );
}

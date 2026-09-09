"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { TierSelector } from "@/components/shell/tier-selector";
import { WalletButton } from "@/components/shell/wallet-button";
import { useApp } from "@/lib/app-store";
import { PAGE_COPY, type PageHref } from "@/lib/nav";

export function Header() {
  const pathname = usePathname();
  const { setMobileNavOpen } = useApp();
  const copy = PAGE_COPY[pathname as PageHref] ?? PAGE_COPY["/workspace"];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
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
          <p className="text-[11px] font-semibold text-brand">{copy.eyebrow}</p>
          <h1 className="truncate text-sm font-semibold tracking-tight">{copy.title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <TierSelector />
        </div>
        <WalletButton />
        <ProfileMenu />
      </div>
    </header>
  );
}

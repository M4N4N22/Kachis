"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";

/** Shown on sandbox seats for institutional-only surfaces. */
export function InstitutionalUpgradeCard({ className }: { className?: string }) {
  const { tier } = useApp();
  if (tier !== "freelancer") return null;

  return (
    <div
      className={
        className ??
        "rounded-2xl border border-ink/8 bg-black/25 px-4 py-3"
      }
    >
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-sidebar-fg">
            {copy.onboarding.upgradeTitle}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-muted">
            {copy.onboarding.upgradeBody}
          </p>
          <Link href="/identity" className="mt-3 inline-flex">
            <Button size="sm" variant="outline" className="h-8 text-[12px]">
              {copy.onboarding.upgradeCta}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

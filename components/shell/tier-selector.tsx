"use client";

import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import type { Tier } from "@/lib/types";

const TIERS: { id: Tier; label: string }[] = [
  { id: "freelancer", label: "Freelancer" },
  { id: "institutional", label: "Institutional" },
];

export function TierSelector() {
  const { tier, setTier } = useApp();

  return (
    <div className="flex rounded-full bg-muted p-1">
      {TIERS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setTier(item.id)}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold tracking-tight transition-colors",
            tier === item.id
              ? "bg-surface text-ink shadow-[0_1px_0_rgba(255,255,255,0.04)]"
              : "text-muted-fg hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

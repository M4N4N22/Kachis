"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** Stylized K mark with brand-a → brand-b → brand-accent gradient. */
export function KachinaMark({ className }: { className?: string }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="4"
          y1="28"
          x2="28"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--brand-b)" />
          <stop offset="48%" stopColor="var(--brand-a)" />
          <stop offset="100%" stopColor="var(--brand-accent)" />
        </linearGradient>
      </defs>
      <path
        d="M10 8v16M10 16l11-8M10 16l11 8"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <KachinaMark className="h-8 w-8 shrink-0" />
      {!compact ? (
        <span
          className={cn(
            "text-2xl leading-none tracking-tight",
            inverted ? "text-ink" : "text-ink",
          )}
        >
          
        </span>
      ) : null}
    </span>
  );
}

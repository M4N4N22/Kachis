"use client";

import { useEffect, useRef, useState } from "react";
import { TierSelector } from "@/components/shell/tier-selector";
import { useApp } from "@/lib/app-store";

export function ProfileMenu() {
  const { profile } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-muted"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand)_18%,var(--surface))] text-[11px] font-semibold text-brand">
          {profile.initials}
        </span>
        <span className="hidden min-w-0 flex-col items-start leading-none sm:flex">
          <span className="max-w-[120px] truncate text-[13px] font-medium">
            {profile.name}
          </span>
          <span className="mt-0.5 text-[11px] text-muted-fg">{profile.title}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-2xl bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-border">
          <p className="text-[13px] font-medium">{profile.name}</p>
          <p className="text-[11px] text-muted-fg">{profile.organization}</p>
          <div className="mt-3 sm:hidden">
            <TierSelector />
          </div>
        </div>
      ) : null}
    </div>
  );
}

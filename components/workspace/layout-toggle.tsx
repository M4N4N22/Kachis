"use client";

import { copy } from "@/lib/copy";
import { useWorkspaceLayout, type WorkspaceLayoutMode } from "@/lib/workspace-layout-store";
import { cn } from "@/lib/cn";

export function WorkspaceLayoutToggle({ className }: { className?: string }) {
  const { mode, hydrated, setMode } = useWorkspaceLayout();

  if (!hydrated) {
    return (
      <div
        className={cn("h-9 w-[8.5rem] shrink-0 rounded-full bg-muted", className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      role="group"
      aria-label={copy.workspace.modeLabel}
      className={cn("inline-flex shrink-0 rounded-full bg-muted p-1", className)}
    >
      {(["chat", "classic"] as WorkspaceLayoutMode[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setMode(item)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
            mode === item
              ? "bg-surface text-ink shadow-sm"
              : "text-muted-fg hover:text-ink",
          )}
        >
          {item === "chat" ? copy.workspace.modeChat : copy.workspace.modeClassic}
        </button>
      ))}
    </div>
  );
}

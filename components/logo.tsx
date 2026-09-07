import { cn } from "@/lib/cn";

export function KachinaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M7 5v14M7 12l10-7M7 12l10 7"
        stroke="currentColor"
        strokeWidth="1.75"
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
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand text-brand-fg">
        <KachinaMark className="h-4 w-4" />
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[13px] font-semibold tracking-tight",
              inverted ? "text-white" : "text-ink",
            )}
          >
            Kachina
          </span>
          <span
            className={cn(
              "mt-0.5 text-[11px]",
              inverted ? "text-white/55" : "text-muted-fg",
            )}
          >
            AI Guardrail
          </span>
        </span>
      ) : null}
    </span>
  );
}

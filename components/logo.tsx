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
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-xl tracking-tight",
              inverted ? "text-white" : "text-ink",
            )}
          >
            Kachis
          </span>
        </span>
      ) : null}
    </span>
  );
}

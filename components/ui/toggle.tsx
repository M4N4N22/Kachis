import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: ToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-2xl px-1 py-1",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium tracking-tight text-ink">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-fg">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors",
          checked
            ? "bg-brand"
            : "bg-muted ring-1 ring-border",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-4 w-4 rounded-full bg-ink transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
    </label>
  );
}

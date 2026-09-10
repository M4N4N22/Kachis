import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "brand" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  brand: "bg-brand-gradient text-brand-fg hover:opacity-90",
  outline:
    "bg-transparent text-ink ring-1 ring-border hover:bg-muted",
  ghost: "rounded-xl bg-transparent text-ink hover:bg-muted",
  danger: "bg-danger text-ink hover:opacity-90",
  success: "bg-success text-ink hover:opacity-90",
};

export function Button({
  className,
  variant = "brand",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-colors",
        "rounded-full disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-[14px]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

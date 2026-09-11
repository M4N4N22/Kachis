"use client";

import type { CSSProperties } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** App shell is dark by default — force dark toast chrome. */
export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      closeButton
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={1.75} />,
        info: <InfoIcon className="size-4" strokeWidth={1.75} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={1.75} />,
        error: <OctagonXIcon className="size-4" strokeWidth={1.75} />,
        loading: <Loader2Icon className="size-4 animate-spin" strokeWidth={1.75} />,
      }}
      toastOptions={{
        classNames: {
          toast: "border border-border bg-surface text-ink shadow-lg font-sans",
          title: "text-ink text-[13px] font-medium",
          description: "text-muted-fg text-[12px]",
          actionButton: "bg-brand text-brand-fg",
          cancelButton: "bg-muted text-muted-fg",
          closeButton: "border-border bg-surface text-muted-fg",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--border)",
          "--border-radius": "1rem",
          "--success-bg": "color-mix(in srgb, var(--success) 16%, var(--surface))",
          "--success-text": "var(--ink)",
          "--success-border": "color-mix(in srgb, var(--success) 40%, transparent)",
          "--error-bg": "color-mix(in srgb, var(--danger) 14%, var(--surface))",
          "--error-text": "var(--ink)",
          "--error-border": "color-mix(in srgb, var(--danger) 42%, transparent)",
          "--warning-bg": "color-mix(in srgb, #f59e0b 14%, var(--surface))",
          "--warning-text": "var(--ink)",
          "--warning-border": "color-mix(in srgb, #f59e0b 40%, transparent)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

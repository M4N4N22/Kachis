import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Bento({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bento", className)} {...props} />;
}

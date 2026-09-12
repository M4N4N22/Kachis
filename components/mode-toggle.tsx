"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={copy.theme.toggle}
        className={cn(
          "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink transition-colors hover:border-ink/20 hover:bg-muted",
          className,
        )}
      >
        <Sun
          className="h-[1.15rem] w-[1.15rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          strokeWidth={1.75}
        />
        <Moon
          className="absolute h-[1.15rem] w-[1.15rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          strokeWidth={1.75}
        />
        <span className="sr-only">{copy.theme.toggle}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-36 w-auto">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {copy.theme.light}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {copy.theme.dark}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {copy.theme.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

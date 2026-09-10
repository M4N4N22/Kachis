"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, PanelLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } =
    useApp();

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-ink/5 border-r text-sidebar-fg transition-[width,transform] duration-300",
          sidebarCollapsed ? "w-[4.25rem]" : "w-[15.5rem]",
          "fixed inset-y-0 left-0 z-50 md:static md:z-auto",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center p-4",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link href="/" onClick={() => setMobileNavOpen(false)}>
            <Logo compact={sidebarCollapsed} />
          </Link>
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden rounded-xl p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-fg md:inline-flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="mx-auto mb-2 hidden rounded-xl p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-fg md:inline-flex"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}

        <nav className="flex flex-1 flex-col gap-4 px-2 pt-6">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl p-3 transition-colors text-sm",
                  sidebarCollapsed && "justify-center px-0",
                  active
                    ? " text-ink bg-black"
                    : "text-sidebar-muted hover:text-sidebar-fg",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", active && "text-brand")}
                  
                />
                {!sidebarCollapsed ? (
                  <span className="leading-tight">{item.label}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 px-3 pb-4">
          <Link
            href="/demo"
            title={sidebarCollapsed ? copy.demo.nav : undefined}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition-colors",
              sidebarCollapsed && "justify-center px-0",
              pathname === "/demo"
                ? "bg-sidebar-accent text-sidebar-fg"
                : "text-sidebar-muted hover:bg-sidebar-accent/70 hover:text-sidebar-fg",
            )}
          >
            <BookOpen
              className={cn("h-3.5 w-3.5", pathname === "/demo" && "text-brand")}
              strokeWidth={1.75}
            />
            {!sidebarCollapsed ? copy.demo.nav : null}
          </Link>
          {!sidebarCollapsed ? (
            <p className="text-[11px] leading-relaxed text-sidebar-muted">
              Internal data remains local. Verification never leaves this machine.
            </p>
          ) : null}
        </div>
      </aside>
    </>
  );
}

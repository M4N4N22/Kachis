"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronUp, PanelLeft, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { InstitutionalUpgradeCard } from "@/components/shell/institutional-upgrade";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { NAV_SECTIONS, type NavItem, type NavSection } from "@/lib/nav";

function sectionLabel(id: NavSection["id"]) {
  if (id === "workspace") return copy.nav.workspace;
  if (id === "security") return copy.nav.security;
  return copy.nav.settings;
}

function NavLinkList({
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-2xl p-2.5 text-[13px] transition-colors  ",
              collapsed && "justify-center px-0",
              active
                ? " text-ink"
                : "text-sidebar-muted hover:text-sidebar-fg",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active && "text-brand")}
              strokeWidth={1.75}
            />
            {!collapsed ? <span className="leading-tight">{item.label}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function ProfileMenu({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const { profile, wallet, disconnectWallet, organization } = useApp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const connected = wallet.status === "connected";

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={collapsed ? copy.nav.profile : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-ink/8 bg-black/25 p-2.5 text-left transition-colors hover:bg-sidebar-accent/60",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-fg">
          {connected ? profile.initials : <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-sidebar-fg">
                {connected ? profile.name : copy.nav.profileSignedOut}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-sidebar-muted">
                {organization?.name ?? copy.nav.sandbox}
              </span>
            </span>
            <ChevronUp
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform",
                !open && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-full min-w-[12rem] overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-lg">
          <div className="border-b border-ink/8 px-3 py-2">
            <p className="truncate text-[12px] font-medium text-ink">
              {connected ? profile.name : copy.nav.profileSignedOut}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-fg">
              {organization
                ? `${organization.name} · ${copy.nav.orgSuffix}`
                : copy.nav.sandbox}
            </p>
          </div>
          <div className="p-1">
            <Link
              href="/providers"
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
              className="block rounded-lg px-2.5 py-2 text-[12px] text-ink hover:bg-muted"
            >
              {copy.nav.profileIdentity}
            </Link>
            <Link
              href="/identity"
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
              className="block rounded-lg px-2.5 py-2 text-[12px] text-ink hover:bg-muted"
            >
              {copy.nav.profileOrg}
            </Link>
            {connected ? (
              <button
                type="button"
                onClick={() => {
                  disconnectWallet();
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-2.5 py-2 text-left text-[12px] text-danger hover:bg-muted"
              >
                {copy.nav.profileSignOut}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
    tier,
    organization,
    orgLoading,
    wallet,
  } = useApp();

  const connected = wallet.status === "connected";
  const isOrgAdmin =
    Boolean(organization) &&
    Boolean(wallet.address) &&
    organization!.adminAddress.toLowerCase() === wallet.address!.toLowerCase();

  const contextLabel = organization
    ? `${organization.name} · ${copy.nav.orgSuffix}`
    : copy.nav.sandbox;
  const contextHint = orgLoading
    ? "…"
    : !connected
      ? copy.nav.connectHint
      : organization
        ? copy.nav.manageOrg
        : copy.nav.createOrg;

  function visibleItems(section: NavSection) {
    return section.items.filter((item) => {
      if (!item.adminOnly) return true;
      return isOrgAdmin;
    });
  }

  const primarySections = NAV_SECTIONS.filter((section) => !section.pinBottom);
  const bottomSections = NAV_SECTIONS.filter((section) => section.pinBottom);

  function closeMobile() {
    setMobileNavOpen(false);
  }

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-ink/5 border-r bg-neutral-900/50 text-sidebar-fg transition-[width,transform] duration-300",
          sidebarCollapsed ? "w-[4.25rem]" : "w-[17.5rem]",
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
          <Link href="/" onClick={closeMobile}>
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

        {!sidebarCollapsed ? (
          <div className="px-3 pb-2">
            <p className="mb-1.5 px-1 text-[10px] font-semibold  text-sidebar-muted ">
              {copy.nav.contextLabel}
            </p>
            <Link
              href="/identity"
              onClick={closeMobile}
              className="block rounded-xl border border-ink/8 bg-black/25 px-3 py-2.5 transition-colors hover:bg-sidebar-accent/60"
            >
              <span className="block truncate text-[12px] font-medium text-sidebar-fg">
                {contextLabel}
              </span>
              <span className="mt-1 block text-[10px] text-sidebar-muted">
                {tier === "institutional"
                  ? copy.tiers.institutional.pill
                  : copy.tiers.sandbox.pill}{" "}
                · {contextHint}
              </span>
            </Link>
          </div>
        ) : null}

        <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pt-3 pb-2">
          {primarySections.map((section) => {
            const items = visibleItems(section);
            if (items.length === 0) return null;
            return (
              <div key={section.id}>
                {!sidebarCollapsed ? (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold  text-sidebar-muted ">
                    {sectionLabel(section.id)}
                  </p>
                ) : null}
                <NavLinkList
                  items={items}
                  pathname={pathname}
                  collapsed={sidebarCollapsed}
                  onNavigate={closeMobile}
                />
              </div>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-ink/6 px-2 pt-3 pb-4">
          {bottomSections.map((section) => {
            const items = visibleItems(section);
            if (items.length === 0) return null;
            return (
              <div key={section.id} className="px-0">
                {!sidebarCollapsed ? (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold  text-sidebar-muted ">
                    {sectionLabel(section.id)}
                  </p>
                ) : null}
                <NavLinkList
                  items={items}
                  pathname={pathname}
                  collapsed={sidebarCollapsed}
                  onNavigate={closeMobile}
                />
              </div>
            );
          })}

          {!sidebarCollapsed && tier === "freelancer" ? (
            <div className="px-1">
              <InstitutionalUpgradeCard />
            </div>
          ) : null}

          <Link
            href="/demo"
            title={sidebarCollapsed ? copy.demo.nav : undefined}
            onClick={closeMobile}
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

          <div className="px-1">
            <ProfileMenu collapsed={sidebarCollapsed} onNavigate={closeMobile} />
          </div>
        </div>
      </aside>
    </>
  );
}

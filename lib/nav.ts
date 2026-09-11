import {
  Blocks,
  ChartNoAxesColumn,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavHref =
  | "/workspace"
  | "/integrations"
  | "/analytics"
  | "/audits"
  | "/guardrails"
  | "/identity";

export interface NavItem {
  href: NavHref;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Hide unless institutional org admin. */
  adminOnly?: boolean;
}

export interface NavSection {
  id: "workspace" | "security" | "settings";
  label: string;
  /** When true, section renders in the sidebar footer stack. */
  pinBottom?: boolean;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        href: "/workspace",
        label: "Protected AI Chat",
        short: "Chat",
        icon: Sparkles,
      },
      {
        href: "/integrations",
        label: "Integrate Kachis",
        short: "Apps",
        icon: Blocks,
      },
    ],
  },
  {
    id: "security",
    label: "Security & Evidence",
    items: [
      {
        href: "/analytics",
        label: "Shield Analytics",
        short: "Analytics",
        icon: ChartNoAxesColumn,
      },
      {
        href: "/audits",
        label: "Midnight Audit Trail",
        short: "Audits",
        icon: ScrollText,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    pinBottom: true,
    items: [
      {
        href: "/guardrails",
        label: "Company Rules",
        short: "Rules",
        icon: ShieldCheck,
        adminOnly: true,
      },
      {
        href: "/identity",
        label: "AI Providers (BYOC)",
        short: "Providers",
        icon: KeyRound,
      },
    ],
  },
];

/** Flat list for active-route helpers */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export type PageHref = NavHref | "/demo";

export const PAGE_COPY: Record<PageHref, { title: string; blurb: string }> = {
  "/workspace": {
    title: "Protected AI Chat",
    blurb:
      "Review shielded inputs and converse safely with your models. Secrets stay on this machine.",
  },
  "/demo": {
    title: "Demo",
    blurb: "Canned payroll paste — no wallet. Local shield, simulated prove, canned reply.",
  },
  "/integrations": {
    title: "Integrate Kachis",
    blurb:
      "Active connections for Cursor/IDE, background scripts, and browser extensions in the shield loop.",
  },
  "/analytics": {
    title: "Shield Analytics",
    blurb:
      "Leaks blocked, files insulated, and private entries intercepted on this device.",
  },
  "/audits": {
    title: "Midnight Audit Trail",
    blurb:
      "Chronological proofs, tracking ids, and settlement hashes — the compliance ledger.",
  },
  "/guardrails": {
    title: "Company Rules",
    blurb:
      "Choose which categories are mandatory to filter: identifiers, financials, secrets, source, client.",
  },
  "/identity": {
    title: "AI Providers (BYOC)",
    blurb:
      "Session-only API credentials for OpenAI, Anthropic, Gemini, or custom company servers.",
  },
};

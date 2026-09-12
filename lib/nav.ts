import {
  Blocks,
  Bot,
  BotMessageSquare,
  Building2,
  ChartNoAxesColumn,
  KeyRound,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavHref =
  | "/workspace"
  | "/integrations"
  | "/integrations/agent"
  | "/analytics"
  | "/audits"
  | "/guardrails"
  | "/identity"
  | "/providers";

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
        icon: BotMessageSquare,
      },
      {
        href: "/integrations",
        label: "Integrate Kachis",
        short: "Apps",
        icon: Blocks,
      },
      {
        href: "/integrations/agent",
        label: "Kachis Agent",
        short: "Agent",
        icon: Bot,
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
        label: "Organization",
        short: "Org",
        icon: Building2,
      },
      {
        href: "/providers",
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
    title: "Integration Workspace",
    blurb:
      "Deploy and manage the local shield across developer environments, apps, and network perimeters.",
  },
  "/integrations/agent": {
    title: "Kachis Agent",
    blurb:
      "Install, configure, and monitor the MCP server. Public commitments only — originals never leave the host.",
  },
  "/analytics": {
    title: "Shield Analytics",
    blurb:
      "On-chain Preprod settlements, pack mix, and ledger sequence — walkthrough excluded.",
  },
  "/audits": {
    title: "Midnight Audit Trail",
    blurb:
      "Live Preprod settlements only — public commitments, pack flags, explorer links.",
  },
  "/guardrails": {
    title: "Company Rules",
    blurb:
      "Choose which categories are mandatory to filter: identifiers, financials, secrets, source, client.",
  },
  "/identity": {
    title: "Organization",
    blurb:
      "Create or leave an institutional network. Wallet-bound seats and clearance stay with this account.",
  },
  "/providers": {
    title: "AI Providers (BYOC)",
    blurb:
      "Session-only API credentials for OpenAI, Anthropic, Gemini, or custom company servers.",
  },
};

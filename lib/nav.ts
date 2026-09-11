import {
  Blocks,
  ChartNoAxesColumn,
  Fingerprint,
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
}

export interface NavSection {
  id: "operations" | "compliance" | "administration";
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/workspace",
        label: "Secure AI Workspace",
        short: "Workspace",
        icon: Sparkles,
      },
      {
        href: "/integrations",
        label: "Integration Directory",
        short: "Integrations",
        icon: Blocks,
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance & Auditing",
    items: [
      {
        href: "/analytics",
        label: "Risk Metrics",
        short: "Metrics",
        icon: ChartNoAxesColumn,
      },
      {
        href: "/audits",
        label: "Audit Trail",
        short: "Audits",
        icon: ScrollText,
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      {
        href: "/guardrails",
        label: "Governance Policies",
        short: "Policies",
        icon: ShieldCheck,
      },
      {
        href: "/identity",
        label: "Infrastructure & Providers",
        short: "Providers",
        icon: Fingerprint,
      },
    ],
  },
];

/** Flat list for active-route helpers */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export type PageHref = NavHref | "/demo";

export const PAGE_COPY: Record<PageHref, { title: string; blurb: string }> = {
  "/workspace": {
    title: "Secure AI Workspace",
    blurb: "Shield locally, then send only the insulated prompt to the model.",
  },
  "/demo": {
    title: "Sample shield",
    blurb: "Canned payroll paste — no wallet. Local shield, simulated prove, canned reply.",
  },
  "/integrations": {
    title: "Integration Directory",
    blurb: "Inventory of SDK, MCP, and companion entry points into the shield loop.",
  },
  "/analytics": {
    title: "Risk Metrics",
    blurb: "Policy hits, secrets held, and leaks mitigated this quarter.",
  },
  "/audits": {
    title: "Audit Trail",
    blurb: "Chronological settlements with commitments and mandatory policy flags.",
  },
  "/guardrails": {
    title: "Governance Policies",
    blurb: "Configure mandatory filters that every institutional shield must attest.",
  },
  "/identity": {
    title: "Infrastructure & Providers",
    blurb: "Wallet binding and model-provider credentials that stay on this machine.",
  },
};

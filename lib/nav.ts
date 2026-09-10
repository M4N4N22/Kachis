import {
  ChartNoAxesColumn,
  Fingerprint,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: "/workspace" | "/guardrails" | "/identity" | "/analytics";
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/workspace",
    label: "Workspace",
    short: "Workspace",
    icon: Sparkles,
  },
  {
    href: "/guardrails",
    label: "Security Guardrails",
    short: "Guardrails",
    icon: ShieldCheck,
  },
  {
    href: "/identity",
    label: "Identity & Credentials",
    short: "Credentials",
    icon: Fingerprint,
  },
  {
    href: "/analytics",
    label: "Usage Analytics",
    short: "Analytics",
    icon: ChartNoAxesColumn,
  },
];

export type PageHref = NavItem["href"] | "/demo";

export const PAGE_COPY: Record<
  PageHref,
  { title: string; blurb: string }
> = {
  "/workspace": {
    title: "Workspace",
    blurb: "Paste original → review shielded → send once. The model only sees the insulated prompt.",
  },
  "/demo": {
    title: "Sample shield",
    blurb: "Canned payroll paste — no wallet. Local shield, simulated prove, canned reply.",
  },
  "/guardrails": {
    title: "Security Guardrails",
    blurb: "Enterprise-wide rules that never leave the tenant boundary.",
  },
  "/identity": {
    title: "Identity & Credentials",
    blurb: "Authenticate the seat without revealing the token.",
  },
  "/analytics": {
    title: "Usage Analytics",
    blurb: "Leaks prevented, credentials verified, settlements sealed.",
  },
};

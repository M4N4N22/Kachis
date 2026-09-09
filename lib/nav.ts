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
  { eyebrow: string; title: string; blurb: string }
> = {
  "/workspace": {
    eyebrow: "Local Guardrail",
    title: "Workspace",
    blurb: "Shield internal data locally, then open a secure channel.",
  },
  "/demo": {
    eyebrow: "Walkthrough",
    title: "Sample shield",
    blurb: "Canned payroll paste. Production workspace is live paste only.",
  },
  "/guardrails": {
    eyebrow: "Institutional Access Controls",
    title: "Security Guardrails",
    blurb: "Enterprise-wide rules that never leave the tenant boundary.",
  },
  "/identity": {
    eyebrow: "Sovereign credentials",
    title: "Identity & Credentials",
    blurb: "Authenticate the seat without revealing the token.",
  },
  "/analytics": {
    eyebrow: "Compliance reporting",
    title: "Usage Analytics",
    blurb: "Leaks prevented, credentials verified, settlements sealed.",
  },
};

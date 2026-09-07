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
    label: "AI Workspace",
    short: "Workspace",
    icon: Sparkles,
  },
  {
    href: "/guardrails",
    label: "Enterprise Security Guardrails",
    short: "Guardrails",
    icon: ShieldCheck,
  },
  {
    href: "/identity",
    label: "Identity & Credentials",
    short: "Passport",
    icon: Fingerprint,
  },
  {
    href: "/analytics",
    label: "Usage Analytics",
    short: "Analytics",
    icon: ChartNoAxesColumn,
  },
];

export const PAGE_COPY: Record<
  NavItem["href"],
  { eyebrow: string; title: string; blurb: string }
> = {
  "/workspace": {
    eyebrow: "Local proof desk",
    title: "AI Workspace",
    blurb: "Sanitize on-device, then talk to the model.",
  },
  "/guardrails": {
    eyebrow: "Policy layer",
    title: "Enterprise Security Guardrails",
    blurb: "Role-aware rules that never leave the tenant boundary.",
  },
  "/identity": {
    eyebrow: "Selective disclosure",
    title: "Midnight Passport",
    blurb: "Prove who you are without revealing the credential.",
  },
  "/analytics": {
    eyebrow: "Quiet telemetry",
    title: "Usage Analytics",
    blurb: "Proofs, shielded bytes, and compliance posture.",
  },
};

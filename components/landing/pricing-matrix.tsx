"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PixelCard = dynamic(() => import("@/components/react-bits/PixelCard"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full min-h-[32rem] w-full rounded-[25px] border border-emerald-400/35 bg-black/40"
      aria-hidden
    />
  ),
});

const PRICING_TIERS = [
  {
    name: "Sandbox Workspace",
    target: "Independent builders & freelancers",
    price: "Free",
    cta: "Launch Solo Sandbox",
    href: "/onboarding",
    highlighted: false,
    bullets: [
      "Core on-device prompt insulation",
      "Standard PII & hardcoded secret stripping",
      "Local proof validation",
      "Default compliance filters",
    ],
  },
  {
    name: "Institutional Network",
    target: "Primary enterprise mandate",
    price: "Custom institutional billing",
    cta: "Provision Institutional Node",
    href: "/onboarding",
    highlighted: true,
    bullets: [
      "Everything in Sandbox, plus:",
      "Custom company compliance filters",
      "Organization identity roots",
      "Role-based AI clearance gates",
      "Immutable audit trails for compliance officers",
      "Centralized console tracking leaks prevented",
    ],
  },
] as const;

function TierBody({
  tier,
  tone,
}: {
  tier: (typeof PRICING_TIERS)[number];
  tone: "muted" | "bright";
}) {
  const muted = tone === "muted";
  return (
    <>
      <div>
        <p
          className={`text-[11px] font-semibold   ${
            muted ? "text-[#8a8a96]" : "text-emerald-300/90"
          }`}
        >
          {tier.target}
        </p>
        <h3
          className={`mt-3 font-light tracking-[-0.03em] ${
            muted ? "text-foreground" : "text-ink"
          }`}
          style={{ fontSize: "clamp(1.45rem, 2.4vw, 1.85rem)", lineHeight: 1.15 }}
        >
          {tier.name}
        </h3>
        <p
          className={`mt-3 text-[1.35rem] font-medium tracking-tight ${
            muted ? "text-foreground" : "text-ink"
          }`}
        >
          {tier.price}
        </p>
      </div>

      <ul className="mt-8 flex flex-1 flex-col gap-3">
        {tier.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                muted ? "bg-black/5 text-[#5c5c6a]" : "bg-emerald-400/15 text-emerald-300"
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={2.25} />
            </span>
            <span
              className={`text-[14px] leading-6 ${
                muted ? "text-[#6b6b78]" : "text-ink/70"
              }`}
            >
              {bullet}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link href={tier.href} className="block">
          <Button
            className={
              tier.highlighted
                ? "w-full bg-emerald-400 text-black hover:bg-emerald-300 hover:opacity-100"
                : "w-full border-0 bg-ink/8 text-ink ring-ink/15 hover:bg-ink/12"
            }
            variant={tier.highlighted ? "brand" : "outline"}
          >
            {tier.cta}
          </Button>
        </Link>
      </div>
    </>
  );
}

export function PricingMatrix() {
  const sandbox = PRICING_TIERS[0];
  const institutional = PRICING_TIERS[1];

  return (
    <section id="audiences" className="relative overflow-hidden py-16 md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold  text-ink">
            TWO SEATS
          </p>
          <h2
            className="landing-fade mt-6 font-light tracking-[-0.04em] text-foreground"
            style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
          >
            Sandbox for builders.{" "}
            <span className="text-[#8a8a96]">Institutional for the org.</span>
          </h2>
          <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#6b6b78]">
            Same local shield. Different workspace. Freelancers stay light; enterprises get org-wide
            rules, clearance, and an audit trail counsel can trust.
          </p>
        </div>

        <div className="landing-fade mt-12 grid items-stretch gap-4 md:grid-cols-2 md:gap-5">
          <article className="flex min-h-[32rem] flex-col rounded-[1.75rem] border border-ink/10 bg-ink/[0.03] p-6 md:p-8">
            <TierBody tier={sandbox} tone="muted" />
          </article>

          <div className="min-h-[32rem]">
            <PixelCard
              variant="pink"
              colors="#34d399,#6ee7b7,#a7f3d0"
              activeColor="#064e3b"
              className="aspect-auto h-full min-h-[32rem] w-full border-emerald-400/40 bg-black/50 [--pixel-card-border:rgba(52,211,153,0.4)]"
            >
              <div className="absolute inset-0 z-10 flex flex-col p-6 md:p-8">
                <TierBody tier={institutional} tone="bright" />
              </div>
            </PixelCard>
          </div>
        </div>
      </div>
    </section>
  );
}

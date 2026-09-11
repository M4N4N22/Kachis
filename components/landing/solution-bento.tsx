"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Bot } from "lucide-react";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { Fingerprint } from "@/components/animate-ui/icons/fingerprint";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Lock } from "@/components/animate-ui/icons/lock";
import { RadioTower } from "@/components/animate-ui/icons/radio-tower";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import type { BentoCardProps } from "@/components/react-bits/MagicBento";
import { copy } from "@/lib/copy";

const MagicBento = dynamic(() => import("@/components/react-bits/MagicBento"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto h-[420px] w-[90%] animate-pulse rounded-[20px] bg-ink/5" aria-hidden />
  ),
});

function BgIcon({ children }: { children: ReactNode }) {
  return (
    <AnimateIcon animateOnHover animateOnView loop loopDelay={1600} className="block text-ink">
      {children}
    </AnimateIcon>
  );
}

const SOLUTION_CARDS: BentoCardProps[] = [
  {
    color: "transparent",
    title: "Local sandbox",
    description:
      "Paste stays on this machine. Filters run before a model is allowed to see a token.",
    label: "Insulate",
    icon: (
      <BgIcon>
        <Lock strokeWidth={0.3} size={152} className="text-ink" />
      </BgIcon>
    ),
  },
  {
    color: "transparent",
    title: "Invisible shield",
    description:
      "Strip identifiers, balances, and secrets locally — without shipping the raw paste.",
    label: "Shield",
    icon: (
      <BgIcon>
        <Sparkles strokeWidth={0.3} size={152} className="text-ink" />
      </BgIcon>
    ),
  },
  {
    color: "transparent",
    title: "Verify locally",
    description:
      "Prove the shield ran. The original never leaves; the commitment is what travels.",
    label: "Verify",
    icon: (
      <BgIcon>
        <Fingerprint strokeWidth={0.3} size={152} className="text-ink" />
      </BgIcon>
    ),
  },
  {
    color: "transparent",
    title: "Zero-leak channel",
    description:
      "The secure channel receives only the insulated remainder. Raw values never leave the perimeter.",
    label: "Channel",
    icon: (
      <BgIcon>
        <RadioTower strokeWidth={0.3} size={152} className="text-ink" />
      </BgIcon>
    ),
  },
  {
    color: "transparent",
    title: "Settle & audit",
    description: "Record that the shield ran. Audit without exposing the source text.",
    label: "Audit",
    icon: (
      <BgIcon>
        <ClipboardCheck strokeWidth={0.3} size={152} className="text-ink" />
      </BgIcon>
    ),
  },
  {
    color: "transparent",
    title: copy.agent.title,
    description: copy.agent.description,
    label: copy.agent.label,
    icon: (
      <div className="block text-ink" aria-hidden>
        <Bot strokeWidth={0.3} size={152} className="text-ink" />
      </div>
    ),
  },
];

export function SolutionBento() {
  return (
    <section id="product" className="relative overflow-hidden bg-black py-16 text-ink md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink">
            PRODUCT
          </p>
          <h2
            className="landing-fade mt-6 font-light tracking-[-0.04em] text-ink"
            style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
          >
            Kachis stops the leak before it even starts.
          </h2>
          <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-ink/60">
            Pasting data into public AI is an absolute trap. Kachis drops an automatic shield right
            onto your screen: it strips your secrets locally, proves the scan ran, and only sends
            the safe text. Your raw files never leave your device.
          </p>
        </div>
      </div>

      <div className="landing-fade relative z-10 mt-12">
        <MagicBento
          cards={SOLUTION_CARDS}
          textAutoHide={true}
          enableStars
          enableSpotlight
          enableBorderGlow={true}
          enableTilt={false}
          enableMagnetism={false}
          clickEffect
          spotlightRadius={400}
          particleCount={12}
          glowColor="70, 147, 150"
          disableAnimations={false}
        />
      </div>
    </section>
  );
}

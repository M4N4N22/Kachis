"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

const GradientBlinds = dynamic(() => import("@/components/react-bits/GradientBlinds"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#000022]" aria-hidden />,
});

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="landing-fade relative isolate min-h-[22rem] overflow-hidden rounded-[2rem]  md:min-h-[26rem] md:rounded-[2.5rem]">
          <div className="absolute inset-0">
            <GradientBlinds
              className="h-full w-full"
              gradientColors={["#f1ffa5", "#469396", "#1f3f6d"]}
              angle={20}
              noise={0.5}
              blindCount={16}
              blindMinWidth={60}
              spotlightRadius={0.5}
              spotlightSoftness={1}
              spotlightOpacity={1}
              mouseDampening={0.15}
              distortAmount={0}
              shineDirection="left"
              mixBlendMode="lighten"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-black/70" />

          <div className="relative z-10 flex min-h-[22rem] flex-col items-center justify-center px-6 py-14 text-center md:min-h-[26rem] md:px-12 md:py-16">
            <p className="inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink/90">
              GET STARTED
            </p>
            <h2
              className="mt-6 max-w-3xl font-light tracking-[-0.04em] text-ink"
              style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
            >
              Shield the next prompt.{" "}
              <span className="text-ink/65">Keep the seat verified.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-ink/70">
              Put Kachis in the loop — local insulation first, evidence that the pack ran, public
              AI only after.
            </p>
            <div className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/workspace">
                <Button className="bg-ink text-black hover:bg-ink/90 hover:opacity-100">
                  {copy.action.idle}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" className="border-0 bg-ink/10 text-ink ring-ink/20 hover:bg-ink/15">
                  {copy.demo.landing}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

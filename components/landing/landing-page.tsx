"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { WorryWall } from "@/components/landing/worry-wall";
import { SolutionBento } from "@/components/landing/solution-bento";
import { PipelineProtocol } from "@/components/landing/pipeline-protocol";
import { AgentPipeline } from "@/components/landing/agent-pipeline";
import { PricingMatrix } from "@/components/landing/pricing-matrix";
import { MidnightPower } from "@/components/landing/midnight-power";
import { LandingFaq } from "@/components/landing/landing-faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { MidnightWordmark } from "../brand/midnight-mark";

const AeroShards = dynamic(() => import("@/components/react-bits/Aeroshards"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#000022]" aria-hidden />,
});

export function LandingPage() {
  return (
    <div className=" min-h-screen text-ink">
      <header className="fixed inset-x-0 top-4 z-30 flex justify-center px-4">
        <div className="flex w-full bg-ink/[0.15] dark:bg-black/[0.15] 
               backdrop-blur-md saturate-150
               border border-ink/20 dark:border-ink/10
               shadow-[0_4px_30px_rgba(0,0,0,0.1)] max-w-6xl items-center justify-between rounded-full  p-4 text-ink ">
          <Logo inverted />
          <nav className="hidden items-center gap-6 text-[13px] text-ink/70 md:flex">
            <a href="#signal" className="hover:text-ink">
              Signal
            </a>
            <a href="#product" className="hover:text-ink">
              Product
            </a>
            <a href="#proof" className="hover:text-ink">
              How it works
            </a>
            <a href="#agents" className="hover:text-ink">
              Agents
            </a>
            <a href="#midnight" className="hover:text-ink">
              Midnight
            </a>
            <a href="#audiences" className="hover:text-ink">
              Audiences
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/demo">
              <Button
                variant="ghost"
                size="sm"
                className="text-ink/70 hover:bg-ink/10 hover:text-ink"
              >
                {copy.demo.landing}
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button size="sm">{copy.landing.launchApp}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className=" relative min-h-[100svh] overflow-hidden  ">
        <div className="absolute inset-0 z-0">
          <AeroShards
            className="h-full w-full"
            backgroundColor="#000000"
            shardColor="#d9f99d"
            accentColor="#469396"
            placement="full"
            flow="stream"
            material="pearl"
            detail="balanced"
            effect="none"
            scale={1}
            spread={1}
            depth={1}
            speed={1}
            spin={1}
            interaction="repel"
            density={1.5}
            shardSize={1.1}
            stretch={1}
            turbulence={1}
            glow={1}
            edgeSoftness={2}
            bloom={0.5}
            grain={0.05}
            chromaticAberration={0.0075}
            transitionDuration={1}
            interactionRadius={1.5}
            interactionStrength={0.5}
            rippleIntensity={1}
            holdToGather={true}
          />
        </div>

        <div className="relative text-center z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 pointer-events-none">
          <div className="landing-fade flex items-center gap-2 text-center mx-auto" >
            Powered by
            <MidnightWordmark className="h-8 w-auto text-ink mt-1 bg-[#0000FE] p-2 rounded-xl" />
          </div>
          <h1
            className="landing-fade font-light tracking-[-0.06em] text-ink mt-4"
            style={{
              animationDelay: "40ms",
              fontSize: "clamp(3rem, 12vw, 7.25rem)",
              lineHeight: 0.92,
            }}
          >
            Zero data leaks.
            <br />
            Zero compromise.
          </h1>
          <p
            className="landing-fade mt-8 max-w-3xl mx-auto text-[15px] leading-7 text-ink/70"
            style={{ animationDelay: "80ms" }}
          >
            If your team's AI history leaked today, how cooked is your data? <br/> Kachis builds a
            sovereign perimeter around institutional workflows. Keep internal records on your
            device, and let Midnight attest to the security matrix.
          </p>
          <div
            className="landing-fade mt-8 flex flex-wrap gap-3 pointer-events-auto items-center justify-center"
            style={{ animationDelay: "120ms" }}
          >
            <Link href="/onboarding">
              <Button>
                {copy.landing.launchApp}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-0 bg-ink/8 text-ink ring-ink/15">
                {copy.demo.landing}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <WorryWall />

      <SolutionBento />

      <PipelineProtocol />

      <AgentPipeline />

      <PricingMatrix />

      <MidnightPower />

      <LandingFaq />

      <FinalCta />

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-12 text-[11px] text-muted-fg">
        <span>Kachis · Local data shield for corporate AI</span>
        <Link href="/demo" className="hover:text-ink">
          {copy.demo.landing}
        </Link>
      </footer>
    </div>
  );
}

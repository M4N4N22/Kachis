"use client";

import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

const FEATURES = [
  {
    icon: Lock,
    title: "Local sandbox",
    body: "Paste the file. Filters run on this machine before a model is allowed to see a token.",
  },
  {
    icon: ShieldCheck,
    title: "Invisible shield",
    body: "Local verification confirms identifiers, balances, and secrets were stripped — without revealing them.",
  },
  {
    icon: Sparkles,
    title: "Zero-leak pipeline",
    body: "The secure channel receives only the insulated remainder. Raw values never leave.",
  },
];

export function LandingPage() {
  return (
    <div className="theme-landing min-h-screen bg-bg text-ink">
      <header className="fixed inset-x-0 top-4 z-30 flex justify-center px-4">
        <div className="flex w-full max-w-6xl items-center justify-between rounded-full bg-[#111] px-4 py-2 text-white">
          <Logo inverted />
          <nav className="hidden items-center gap-6 text-[13px] text-white/70 md:flex">
            <a href="#product" className="hover:text-white">
              Product
            </a>
            <a href="#audiences" className="hover:text-white">
              Audiences
            </a>
            <a href="#proof" className="hover:text-white">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/demo">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                {copy.demo.landing}
              </Button>
            </Link>
            <Link href="/workspace">
              <Button size="sm">Open workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-sky relative overflow-hidden pt-36 pb-28">
        <div className="hero-noise pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6">
          <p
            className="landing-fade text-[11px] font-semibold text-brand"
            style={{ animationDelay: "0ms" }}
          >
            Corporate data shield for AI
          </p>
          <h1
            className="landing-fade mt-5 max-w-4xl font-light tracking-[-0.06em] text-white"
            style={{
              animationDelay: "40ms",
              fontSize: "clamp(3rem, 12vw, 7.25rem)",
              lineHeight: 0.92,
            }}
          >
            Shield internally.
            <br />
            Verify locally.
          </h1>
          <p
            className="landing-fade mt-8 max-w-xl text-[15px] leading-7 text-white/70"
            style={{ animationDelay: "80ms" }}
          >
            Kachis is a local guardrail for enterprise and freelance teams. Internal
            data remains in your sandbox. The model only receives what you allow.
          </p>
          <div
            className="landing-fade mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: "120ms" }}
          >
            <Link href="/workspace">
              <Button>
                {copy.action.idle}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="border-0 bg-white/8 text-white ring-white/15">
                {copy.demo.landing}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-6 py-20">
        <p className="landing-fade inline-flex rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,white)] px-3 py-1 text-[11px] font-semibold text-brand">
          Invisible shield
        </p>
        <h2 className="landing-fade mt-4 text-3xl font-light tracking-tight md:text-4xl">
          Enterprise infrastructure for private AI.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-fade bento p-6"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <feature.icon className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-muted-fg">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="audiences" className="mx-auto max-w-6xl px-6 py-20">
        <p className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,white)] px-3 py-1 text-[11px] font-semibold text-brand">
          Two seats, one guardrail
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.75rem] bg-surface p-8 shadow-[0_20px_50px_rgba(10,10,20,0.06)] ring-1 ring-[rgba(10,10,20,0.08)]">
            <p className="text-[11px] font-semibold text-brand">
              {copy.tiers.sandbox.badge}
            </p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">
              Individual sandbox
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-muted-fg">
              {copy.tiers.sandbox.description}
            </p>
          </article>
          <article className="rounded-[1.75rem] bg-[#14141c] p-8 text-white">
            <p className="text-[11px] font-semibold text-brand">
              {copy.tiers.institutional.badge}
            </p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">
              Company-wide governance
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-white/65">
              {copy.tiers.institutional.description}
            </p>
          </article>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-light tracking-tight">Four steps. Data never leaves.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {["Paste internally", "Apply filters", "Verify locally", "Open the channel"].map(
            (step, index) => (
              <li key={step} className="bento p-5">
                <p className="text-[11px] font-semibold text-brand">0{index + 1}</p>
                <p className="mt-3 text-sm font-medium tracking-tight">{step}</p>
              </li>
            ),
          )}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/workspace" className="inline-flex">
            <Button>
              {copy.action.idle}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </Link>
          <Link href="/demo" className="inline-flex">
            <Button variant="outline">{copy.demo.landing}</Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-12 text-[11px] text-muted-fg">
        <span>Kachis · Local data shield for corporate AI</span>
        <Link href="/demo" className="hover:text-ink">
          {copy.demo.landing}
        </Link>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Lock,
    title: "Local-first desk",
    body: "Paste the file. Guardrails run in the browser before a model is allowed to see a token.",
  },
  {
    icon: ShieldCheck,
    title: "Midnight attestation",
    body: "A ZK proof records that PII, money, and secrets were stripped — without revealing them.",
  },
  {
    icon: Sparkles,
    title: "Then, and only then, chat",
    body: "The Secure Chat Arena receives the leftover prompt. Raw values never cross the wire.",
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
              Proof path
            </a>
          </nav>
          <Link href="/workspace">
            <Button size="sm">Open workspace</Button>
          </Link>
        </div>
      </header>

      <section className="hero-sky relative overflow-hidden pt-36 pb-28">
        <div className="hero-noise pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6">
          <p
            className="landing-fade text-[11px] font-semibold text-brand"
            style={{ animationDelay: "0ms" }}
          >
            Built for the Midnight Buildathon
          </p>
          <h1
            className="landing-fade mt-5 max-w-4xl font-light tracking-[-0.06em] text-white"
            style={{
              animationDelay: "40ms",
              fontSize: "clamp(3rem, 12vw, 7.25rem)",
              lineHeight: 0.92,
            }}
          >
            Paste secrets.
            <br />
            Prove nothing leaked.
          </h1>
          <p
            className="landing-fade mt-8 max-w-xl text-[15px] leading-7 text-white/70"
            style={{ animationDelay: "80ms" }}
          >
            Kachina AI is a privacy-first ZK guardrail for enterprise and freelance
            desks. Sensitive context stays on-device. Midnight attests the
            sanitization. The model only sees what is left.
          </p>
          <div
            className="landing-fade mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: "120ms" }}
          >
            <Link href="/workspace">
              <Button>
                Enter the desk
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </Link>
            <a href="#proof">
              <Button variant="outline" className="border-0 bg-white/8 text-white ring-white/15">
                How the proof works
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-6 py-20">
        <p className="landing-fade inline-flex rounded-full bg-[color-mix(in_srgb,var(--brand)_14%,white)] px-3 py-1 text-[11px] font-semibold text-brand">
          Quiet desk, not a CLI
        </p>
        <h2 className="landing-fade mt-4 text-3xl font-light tracking-tight md:text-4xl">
          A Linear-grade workspace for ZK AI.
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
          Two desks, one circuit
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.75rem] bg-surface p-8 shadow-[0_20px_50px_rgba(10,10,20,0.06)] ring-1 ring-[rgba(10,10,20,0.08)]">
            <p className="text-[11px] font-semibold text-brand">Freelancer</p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">Freemium, try the desk</h3>
            <p className="mt-3 text-[13px] leading-6 text-muted-fg">
              Independent consultants paste client files, generate a local proof,
              and chat without becoming the leak.
            </p>
          </article>
          <article className="rounded-[1.75rem] bg-[#14141c] p-8 text-white">
            <p className="text-[11px] font-semibold text-brand">Institutional</p>
            <h3 className="mt-2 text-2xl font-light tracking-tight">The paying core</h3>
            <p className="mt-3 text-[13px] leading-6 text-white/65">
              RBAC, compliance packs, Midnight Passport, and an audit trail that
              proves policy without exposing the packet.
            </p>
          </article>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-light tracking-tight">Four steps. No neon terminal.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            "Paste locally",
            "Toggle guardrails",
            "Generate the ZK proof",
            "Chat with leftovers",
          ].map((step, index) => (
            <li key={step} className="bento p-5">
              <p className="text-[11px] font-semibold text-brand">0{index + 1}</p>
              <p className="mt-3 text-sm font-medium tracking-tight">{step}</p>
            </li>
          ))}
        </ol>
        <Link href="/workspace" className="mt-10 inline-flex">
          <Button>
            Start in the workspace
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
        </Link>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-12 text-[11px] text-muted-fg">
        Kachina AI · Midnight Protocol · Wave 1 frontend shell
      </footer>
    </div>
  );
}

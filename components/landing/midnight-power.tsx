"use client";

import Link from "next/link";
import { MidnightMark, MidnightWordmark } from "@/components/brand/midnight-mark";

const PILLARS = [
  {
    title: "Prove the shield ran",
    body: "Midnight seals that Kachis shielded the prompt — a receipt for security and counsel, not a dump of the file.",
  },
  {
    title: "Keep the original private",
    body: "The raw paste never becomes public evidence. What settles is the fact of the shield, not the payroll sheet.",
  },
  {
    title: "Settle from a verified wallet",
    body: "Corporate wallets on Midnight bind the job to an account. Institutions get control + evidence without a new AI stack.",
  },
] as const;

export function MidnightPower() {
  return (
    <section id="midnight" className="relative overflow-hidden bg-[#0A0A0A] py-16 text-ink md:py-24">
      <div
        className="pointer-events-none absolute inset-0"

      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="landing-fade flex items-center gap-2">
           Powered by 
              <MidnightWordmark className="h-5 w-auto text-ink" />
            </div>
            <h2
              className="landing-fade mt-8 font-light tracking-[-0.04em]"
              style={{ fontSize: "clamp(1.85rem, 4.2vw, 3rem)", lineHeight: 1.1 }}
            >
              Midnight powers the evidence layer.
            </h2>
            <p className="landing-fade mt-4 max-w-xl text-[15px] leading-7 text-ink/60">
              Kachis Agent cleans the prompt on your machine. Midnight is how you prove that
              happened — without handing chat history (or counsel) the original paste. Same
              freedoms Midnight protects: keep the work private, show the receipt.
            </p>
          </div>
          <Link
            href="https://midnight.network"
            target="_blank"
            rel="noreferrer noopener"
            className="landing-fade inline-flex items-center gap-2 rounded-full border border-ink/15 bg-ink/5 px-4 py-2 text-[12px] font-medium text-ink/80 transition-colors hover:border-ink/25 hover:text-ink"
          >
            midnight.network
            <span className="text-ink/40">↗</span>
          </Link>
        </div>

        <div className="landing-fade mt-12 grid gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <article
              key={pillar.title}
              className="rounded-[1.5rem] bg-black p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full ">
                  <MidnightMark className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-ink/35">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-[1.15rem] font-medium tracking-tight text-ink">
                {pillar.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-ink/55">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

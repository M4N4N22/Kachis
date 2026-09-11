"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Does my sensitive corporate data ever hit Midnight or public indexers?",
    a: "Absolute zero. Your internal text and source code remain completely dark inside your local machine’s memory. Kachis only ships a localized cryptographic commitment — a hash signature — to verify compliance. The original never travels.",
  },
  {
    q: "Will running local scans slow down our team’s AI output?",
    a: "No. Token scanning and identity checks happen instantly in your local sandbox. Verification finishes in milliseconds — secure AI responses feel native and friction-free.",
  },
  {
    q: "Why would an institution pay if freelancers can use the sandbox for free?",
    a: "Casual users want basic personal privacy filters. Institutions need control and evidence. Enterprises mandate custom corporate compliance rules, credential logging, and auditable proof chains that satisfy legal and regulatory requirements.",
  },
  {
    q: "How does Kachis flag corporate secrets if it never sees the raw file?",
    a: "The work is split. Your local app runs fast pattern scanners on this machine and reduces the result to a compliance flag. The evidence layer reads that flag and enforces your company’s operational rules — without ever reading the source text.",
  },
] as const;

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden py-16 md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold  text-ink">
            FAQ
          </p>
          <h2
            className="landing-fade mt-6 font-light tracking-[-0.04em] text-foreground"
            style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
          >
            Straight answers.{" "}
            <span className="text-[#8a8a96]">No theater.</span>
          </h2>
          <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#6b6b78]">
            What stays local, what gets proven, and why institutions buy control + evidence.
          </p>
        </div>

        <div className="landing-fade mx-auto mt-12 max-w-3xl divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors hover:text-ink"
                >
                  <span
                    className={cn(
                      "text-[16px] font-medium leading-7 tracking-tight md:text-[17px]",
                      open ? "text-foreground" : "text-foreground/85"
                    )}
                  >
                    {item.q}
                  </span>
                  <span
                    className={cn(
                      "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/70 transition-transform duration-300",
                      open && "rotate-45 border-ink/25 text-ink"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-12 text-[15px] leading-7 text-[#6b6b78]">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

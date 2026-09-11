"use client";

import { ArrowRight, Bot, KeyRound, Shield, Waypoints } from "lucide-react";
import { copy } from "@/lib/copy";

const FLOW = [
  {
    n: "01",
    title: "Agent workflow",
    body: "Support bots, analysts, and background scripts generate internal context.",
  },
  {
    n: "02",
    title: "Kachis Agent gateway",
    body: "Local SDK / MCP intercept. Scan on-device. Build the compliance flag.",
  },
  {
    n: "03",
    title: "Secrets stay local",
    body: "Raw customer rows, source, and numbers never leave the host perimeter.",
  },
  {
    n: "04",
    title: "Evidence sealed",
    body: "Prove the shield ran. If policy fails, the call never reaches public AI.",
  },
  {
    n: "05",
    title: "Public model",
    body: "Only the insulated remainder is sent. Clean output returns downstream.",
  },
] as const;

const INTERCEPTS = [
  {
    icon: KeyRound,
    title: "Machine-to-machine identity",
    body: "Each automated agent gets a verified identity — same clearance model as a human operator. Unauthorized agents cannot request an external model call.",
  },
  {
    icon: Shield,
    title: "Programmatic sanitization",
    body: "Before the agent fires OpenAI or Anthropic, the payload is intercepted on the local host. Accidental database dumps and source pastes are stripped instantly.",
  },
  {
    icon: Waypoints,
    title: "Autonomous audit trail",
    body: "Agents cannot skip the rulebook. Policy failure halts the pipeline before anything leaves the company perimeter — with evidence counsel can verify.",
  },
] as const;

export function AgentPipeline() {
  return (
    <section id="agents" className="relative overflow-hidden py-16 md:py-24">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="landing-fade inline-flex rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink">
            AGENTS
          </p>
          <h2
            className="landing-fade mt-6 font-light tracking-[-0.04em] text-foreground"
            style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
          >
            {copy.agent.title}.{" "}
            <span className="text-[#8a8a96]">Same shield as a human operator.</span>
          </h2>
          <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#6b6b78]">
            {copy.agent.description}
          </p>
          <div className="landing-fade mt-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/[0.04] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-ink/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            {copy.agent.badge}
          </div>
        </div>

        <div className="landing-fade mt-12 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-ink/[0.03] p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/10 text-ink">
                <Bot className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Agent pipeline</p>
                <p className="text-[11px] text-[#8a8a96]">User or agent — one unskippable loop</p>
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8a96]">
              {copy.agent.label}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {FLOW.map((step, index) => (
              <div
                key={step.n}
                className="relative flex flex-col rounded-2xl border border-ink/10 bg-black/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-ink/40">{step.n}</span>
                  {index < FLOW.length - 1 ? (
                    <ArrowRight
                      className="hidden h-3.5 w-3.5 text-ink/25 md:block"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <h3 className="mt-3 text-[14px] font-medium tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[12px] leading-5 text-[#6b6b78]">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-dashed border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-5 text-[#8a8a96]">
              Host agent must call the shield before any public model sees a token. Bypass is not a
              path — the pipeline terminates at the perimeter.
            </p>
            <p className="shrink-0 font-mono text-[11px] text-emerald-300/90">
              kachis_shield → only then LLM
            </p>
          </div>
        </div>

        <div className="landing-fade mt-4 grid gap-4 md:grid-cols-3 md:gap-5">
          {INTERCEPTS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-ink/10 bg-ink/[0.03] p-6 md:p-7"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-[1.15rem] font-medium tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-[#6b6b78]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

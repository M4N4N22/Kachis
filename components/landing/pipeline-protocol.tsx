"use client";

import { ArrowRight, Check, Lock, Shield } from "lucide-react";

export function PipelineProtocol() {
  return (
    <section id="proof" className="relative overflow-hidden  py-16 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
      
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem]   px-5 py-12 shadow-[0_30px_80px_rgba(20,20,28,0.08)] sm:px-8 md:rounded-[2.5rem] md:px-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="landing-fade inline-flex rounded-full  px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink">
              HOW IT WORKS
            </p>
            <h2
              className="landing-fade mt-6 font-light tracking-[-0.04em] text-foreground"
              style={{ fontSize: "clamp(1.85rem, 4.2vw, 3.15rem)", lineHeight: 1.12 }}
            >
              Keep your AI stack.{" "}
              <span className="text-[#8a8a96]">Put Kachis in the loop.</span>
            </h2>
            <p className="landing-fade mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#6b6b78]">
              Teams already live in Cursor, Claude, ChatGPT, v0, and the rest. Kachis Agent sits
              in that path — every prompt is shielded locally first, then the clean remainder
              reaches public AI. Control on-device. Evidence that the shield ran.
            </p>
          </div>

          <div className="landing-fade mt-12 grid gap-4 md:grid-cols-2 md:gap-5">
            <article className="flex flex-col overflow-hidden rounded-[1.75rem] border border-ink/10  p-6 md:p-8">
              <h3 className="text-[1.35rem] tracking-tight text-foreground">
                Agent in your existing tools
              </h3>
              <p className="mt-2 max-w-sm text-[14px] leading-6 text-[#6b6b78]">
                Kachis Agent plugs into the platforms you already pay for. No new chatbot to
                adopt — the host must call the shield before the model sees a token.
              </p>

              <div className="mt-8 flex flex-1 items-end justify-center pb-2">
                <div className="w-full max-w-[22rem] border border-ink/5 rounded-2xl p-4 shadow-[0_18px_40px_rgba(20,20,28,0.08)]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg  text-ink">
                      <Lock className="" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">Kachis Agent</p>
                      <p className="text-[10px] text-[#8a8a96]">In the loop · local shield</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 rounded-xl px-3 py-3 font-mono text-[11px] leading-5 text-[#5c5c6a]">
                    <p className="text-[#8a8a96]">Host · Cursor / Claude / ChatGPT</p>
                    <p className="text-foreground">→ must call kachis_shield</p>
                    <p className="text-[#c45b6a]">raw payroll paste held on-device</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-full border border-ink/10  p-2">
                    <span className="text-[11px] text-[#8a8a96]">Prompt enters your AI tool…</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#14141c] text-ink">
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="flex flex-col overflow-hidden rounded-[1.75rem] border border-ink/10  p-6 md:p-8">
              <h3 className="text-[1.35rem] tracking-tight text-foreground">
                Shield before public AI
              </h3>
              <p className="mt-2 max-w-sm text-[14px] leading-6 text-[#6b6b78]">
                Filters strip identifiers and balances on this machine. Kachis proves the shield
                ran — without publishing the original paste.
              </p>

              <div className="mt-8 flex flex-1 flex-col items-center justify-end gap-3 pb-2">
                <div className="w-full max-w-[22rem] rounded-2xl border border-ink/5 p-4 shadow-[0_18px_40px_rgba(20,20,28,0.08)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg ">
                        <Shield className="" strokeWidth={1.75} />
                      </span>
                      <p className="text-[12px] font-semibold text-foreground">Shielded remainder</p>
                    </div>
                    <span className="rounded-full  text-[10px] font-semibold text-green-300">
                      Clean
                    </span>
                  </div>
                  <div className="mt-3  font-mono text-[11px]">
                    <p className="rounded-lg  px-2.5 py-1.5 text-brand-a">
                      Pay [PERSON] $[AMOUNT] · SSN [REDACTED]
                    </p>
                    <p className="rounded-lg px-2.5 py-1.5 text-brand-a">
                      Wire ABA [ROUTING] · acct [ACCOUNT]
                    </p>
                    <p className="rounded-lg  px-2.5 py-1.5 text-[#5c5c6a]">
                      Q3 headcount review for Eng Platform
                    </p>
                  </div>
                </div>

                <div className="flex w-full max-w-[22rem] items-center gap-2 rounded-full border border-ink/5 px-3.5 py-3 shadow-[0_12px_28px_rgba(20,20,28,0.06)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full  text-ink">
                    <Check className="" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">Evidence sealed</p>
                    <p className="truncate text-[10px] text-[#8a8a96]">
                      Shield verified · original never uploaded
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.75rem] border border-ink/10 md:col-span-2">
              <div className="grid items-stretch gap-6 p-6 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-8 md:p-8 lg:p-10">
                <div className="flex flex-col justify-center">
                  <h3 className="text-[1.35rem] tracking-tight text-foreground md:text-[1.6rem]">
                    Your tool → Kachis → public AI
                  </h3>
                  <p className="mt-3 max-w-md text-[14px] leading-6 text-[#6b6b78]">
                    That handoff is the product. Institutions keep Claude, ChatGPT, Cursor, and
                    the rest — Kachis is the unskippable guardrail in front. The console paste
                    flow is for tryouts and freemium workspaces to feel the shield, not the corporate
                    path.
                  </p>
                </div>

                <div className="relative min-h-[280px]">
                  <div className="absolute inset-0 rounded-[1.5rem] " />
                  <div className="relative flex h-full overflow-hidden rounded-[1.5rem] border border-ink/5 bg-black shadow-[0_22px_50px_rgba(20,20,28,0.1)]">
                    <aside className="hidden w-[7.5rem] shrink-0 border-r border-ink/5 p-3 sm:block">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a8a96]">
                        Path
                      </p>
                      <ul className="mt-3 space-y-2 text-[11px] text-[#5c5c6a]">
                        <li className="rounded-lg  px-2 py-1.5 font-medium text-foreground shadow-sm ring-1 ring-ink/5">
                          Host AI
                        </li>
                        <li className="px-2 py-1.5">Kachis</li>
                        <li className="px-2 py-1.5">Shield</li>
                        <li className="px-2 py-1.5">Public AI</li>
                      </ul>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-foreground">Agent handoff</p>
                        <span className="rounded-full  px-2 py-0.5 text-[10px] font-semibold text-green-300">
                          In the loop
                        </span>
                      </div>

                      <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
                        <div className="rounded-xl border border-ink/5 p-3">
                          <p className="text-[10px]  uppercase  text-[#8a8a96]">
                            Held locally
                          </p>
                          <p className="mt-2 font-mono text-[10px] leading-4 text-[#c45b6a]/90">
                            Maya Chen
                            <br />
                            $184,200
                            <br />
                            SSN · routing
                          </p>
                          <p className="mt-3 text-[10px] font-medium text-[#8a8a96]">Never sent</p>
                        </div>
                        <div className="rounded-xl border border-ink/5  p-3 shadow-sm">
                          <p className="text-[10px] font-semibold uppercase text-brand-a">
                            Sent to model
                          </p>
                          <p className="mt-2 font-mono text-[10px] leading-4 text-[#5c5c6a]">
                            [PERSON]
                            <br />
                            $[AMOUNT]
                            <br />
                            [REDACTED]
                          </p>
                          <p className="mt-3 text-[10px] font-medium text-green-300">
                            Insulated remainder
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-ink/5 px-3 py-2.5 text-[11px] text-ink/80">
                        <span className="text-brand-b">Evidence</span>
                        <span className="text-ink/40"> · </span>
                        Shield verified locally · original stays on-device
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

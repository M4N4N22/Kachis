"use client";

import { useEffect, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { ChatComposer } from "@/components/workspace/chat-composer";
import { ChatStageActions } from "@/components/workspace/chat-stage-actions";
import { ChatThread } from "@/components/workspace/chat-thread";
import { LogRail } from "@/components/workspace/log-rail";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

function welcomePrefix() {
  const hour = new Date().getHours();
  if (hour < 12) return copy.workspace.welcomeMorning;
  if (hour < 17) return copy.workspace.welcomeAfternoon;
  return copy.workspace.welcomeEvening;
}

function WelcomeGreeting() {
  const [prefix, setPrefix] = useState<string>(copy.workspace.welcomeMorning);

  useEffect(() => {
    setPrefix(welcomePrefix());
  }, []);

  return (
    <div className="px-6 text-center">
      <h2 className="text-4xl font-light tracking-tight text-ink sm:text-5xl">
        {prefix}{" "}
        <span className="text-brand">{copy.brand.name}</span>
      </h2>
      <p className="mt-3 text-[13px] leading-6 text-muted-fg">{copy.input.helper}</p>
    </div>
  );
}

export function ChatWorkspace() {
  const { rawInput, setRawInput, proofStatus, busy, settling, scanning, sending, messages } =
    useWorkspace();
  const [draft, setDraft] = useState("");
  const [turnActive, setTurnActive] = useState(() => Boolean(rawInput.trim()));

  useEffect(() => {
    if (rawInput.trim()) {
      setTurnActive(true);
      return;
    }
    if (proofStatus === "idle") {
      setTurnActive(false);
    }
  }, [rawInput, proofStatus]);

  function submitTurn() {
    const next = draft.trim();
    if (!next) return;
    setRawInput(next);
    setDraft("");
    setTurnActive(true);
  }

  const latestReply = messages.some((message) => message.role === "assistant");
  const composerLocked =
    busy ||
    settling ||
    scanning ||
    sending ||
    proofStatus === "rewriting" ||
    proofStatus === "proving" ||
    proofStatus === "attesting" ||
    proofStatus === "reviewed" ||
    (proofStatus === "shielded" && !latestReply);

  const composer = (
    <ChatComposer
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={submitTurn}
      disabled={composerLocked}
    />
  );

  return (
    <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,0.7fr)_minmax(16rem,0.3fr)]">
      <LayoutGroup id="kachis-chat-shell">
        <div className="relative min-h-[28rem] overflow-hidden lg:min-h-0">
          {!turnActive ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 px-4">
              <WelcomeGreeting />
              <motion.div
                layoutId="kachis-chat-composer"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-3xl"
              >
                {composer}
              </motion.div>
            </div>
          ) : (
            <>
              <ChatThread turnActive dockPaddingClass="pb-56" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg to-transparent pt-10">
                <div className="pointer-events-auto space-y-2 px-4 pb-3">
                  <ChatStageActions turnActive />
                  <motion.div
                    layoutId="kachis-chat-composer"
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full"
                  >
                    {composer}
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </div>
      </LayoutGroup>
      <div className="min-h-[16rem] lg:min-h-0">
        <LogRail />
      </div>
    </div>
  );
}

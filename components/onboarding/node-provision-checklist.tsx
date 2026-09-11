"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { copy } from "@/lib/copy";

const STEPS = copy.onboarding.provisionSteps;

/** Inline provision checklist for the onboarding stepper (not a full-screen overlay). */
export function NodeProvisionChecklist({
  orgName,
  active,
  onComplete,
}: {
  orgName: string;
  active: boolean;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setDone(false);
      finishedRef.current = false;
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    STEPS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setStepIndex(index);
        }, index * 750),
      );
    });

    timers.push(
      window.setTimeout(() => {
        if (cancelled || finishedRef.current) return;
        finishedRef.current = true;
        setDone(true);
        onCompleteRef.current();
      }, STEPS.length * 750 + 400),
    );

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [active]);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-black/40">
      <div className="flex items-center gap-2 border-b border-ink/8 px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-ink/20" />
        <span className="h-2 w-2 rounded-full bg-ink/20" />
        <span className="h-2 w-2 rounded-full bg-ink/20" />
        <p className="ml-1 font-mono text-[10px] text-ink/45">
          kachis · provision · {orgName}
        </p>
      </div>
      <div className="space-y-2.5 px-3.5 py-4 font-mono text-[12px] leading-5 text-emerald-300/90">
        {STEPS.map((step, index) => {
          const visible = index <= stepIndex;
          const current = index === stepIndex && !done;
          return (
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: visible ? 1 : 0.2, y: 0 }}
              className={current ? "text-emerald-200" : undefined}
            >
              <span className="text-ink/35">$</span> {step}
              {current ? <span className="ml-1 animate-pulse">▮</span> : null}
            </motion.p>
          );
        })}
        {done ? (
          <p className="pt-1 text-brand">{copy.onboarding.provisionDone}</p>
        ) : null}
      </div>
    </div>
  );
}

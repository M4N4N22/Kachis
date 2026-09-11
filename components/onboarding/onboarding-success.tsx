"use client";

import { motion } from "motion/react";
import { copy } from "@/lib/copy";

export function OnboardingSuccess({
  path,
  orgName,
}: {
  path: "solo" | "institutional";
  orgName?: string;
}) {
  const title =
    path === "institutional"
      ? copy.onboarding.successOrgTitle
      : copy.onboarding.successSoloTitle;
  const body =
    path === "institutional"
      ? copy.onboarding.successOrgBody.replace("{name}", orgName?.trim() || "your organization")
      : copy.onboarding.successSoloBody;

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#07090f]/90 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/20"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-brand"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
        >
          <motion.path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
          />
        </motion.svg>
      </motion.div>

      <motion.h2
        className="mt-6 text-center text-3xl font-light tracking-tight text-ink"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="mt-3 max-w-md text-center text-[15px] leading-7 text-ink/60"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {body}
      </motion.p>
    </motion.div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { copy } from "@/lib/copy";
import { useWorkspace } from "@/lib/workspace-store";

function shorten(value: string, edge = 8) {
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

function shortSha(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

type LogRow = {
  id: string;
  preview: string;
  sha: string;
  at: string;
};

export function LogRail() {
  const { shieldTokenMap, proof, proofStatus, messages } = useWorkspace();
  const [visibleCount, setVisibleCount] = useState(0);
  const reduceMotion = useReducedMotion();
  const latest = messages.filter((m) => m.role === "assistant").at(-1);

  const pendingRows = useMemo(() => {
    const entries = Object.entries(shieldTokenMap);
    if (entries.length === 0) return [] as LogRow[];
    const base = Date.now();
    // Newest first so the latest redaction stays at the top without scrolling.
    return [...entries].reverse().map(([token, original], index) => ({
      id: token,
      preview: original.length > 28 ? `${original.slice(0, 28)}…` : original,
      sha: shortSha(`${token}:${original}`),
      at: new Date(base - index * 900).toISOString(),
    }));
  }, [shieldTokenMap]);

  const pendingKey = pendingRows.map((row) => row.id).join("|");

  useEffect(() => {
    if (pendingRows.length === 0) {
      setVisibleCount(0);
      return;
    }

    if (reduceMotion) {
      setVisibleCount(pendingRows.length);
      return;
    }

    setVisibleCount(0);
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= pendingRows.length) {
        window.clearInterval(id);
      }
    }, 240);

    return () => window.clearInterval(id);
  }, [pendingKey, pendingRows.length, reduceMotion]);

  const visibleRows = pendingRows.slice(0, visibleCount);

  const showReceipt =
    proof &&
    (proofStatus === "shielded" ||
      proofStatus === "attesting" ||
      Boolean(latest));

  return (
    <aside className="flex h-full min-h-0  flex-col overflow-hidden  border border-ink/10">
      <div className="shrink-0 border-b border-ink/10 px-4 py-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-ink">
          {copy.workspace.logTitle}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto ">
        {visibleRows.length === 0 && !showReceipt && !latest?.restored ? (
          <p className="px-1 py-6 text-center text-[12px] leading-5 text-muted-fg">
            {copy.workspace.logEmpty}
          </p>
        ) : (
          <>
            {latest?.restored ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className=" flex gap-2.5 p-4 "
              >
                <p className="text-[12px] leading-5 text-green-400/90">
                  {copy.response.restoreNote}
                </p>
              </motion.div>
            ) : null}

            {showReceipt && proof ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 border-y border-green-700 p-4"
              >
                <p className="text-[11px] font-semibold text-muted-fg">
                  {copy.sanitized.receiptTitle}
                </p>
                <p className="text-[12px] text-ink/90">{copy.sanitized.receiptReady}</p>
                <dl className="space-y-1.5 font-mono text-[10px] text-muted-fg">
                  <div className="flex justify-between gap-3">
                    <dt>{copy.sanitized.receiptHash}</dt>
                    <dd className="truncate text-ink/80">{shorten(proof.hash, 10)}</dd>
                  </div>
                  {proof.txId ? (
                    <div className="flex justify-between gap-3">
                      <dt>{copy.sanitized.receiptTx}</dt>
                      <dd className="truncate text-ink/80">{shorten(proof.txId, 10)}</dd>
                    </div>
                  ) : null}
                  {proof.ledgerId != null ? (
                    <div className="flex justify-between gap-3">
                      <dt>{copy.sanitized.receiptLedger}</dt>
                      <dd className="text-ink/80">#{proof.ledgerId}</dd>
                    </div>
                  ) : null}
                </dl>
              </motion.div>
            ) : null}

            <ul className="divide-y divide-ink/10">
              <AnimatePresence initial={false}>
                {visibleRows.map((row) => (
                  <motion.li
                    key={row.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className=" p-4"
                  >
                    <p className="text-[12px] font-medium text-ink">
                      {copy.workspace.logRedacted}:{" "}
                      <span className="font-mono text-ink/85">{row.preview}</span>
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-muted-fg">
                      <span>{formatTime(row.at)}</span>
                      <span>SHA-{row.sha}</span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}

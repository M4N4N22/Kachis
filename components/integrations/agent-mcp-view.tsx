"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Copy, Loader, RotateCcw } from "lucide-react";
import {
  DonutChart,
  HorizontalBars,
  chartColor,
} from "@/components/analytics/analytics-charts";
import {
  PACK_KINDS,
  PACK_LABEL,
  isWalkthroughAttestation,
  shortenHash,
  useShieldFeed,
  type PublicAttestation,
} from "@/components/analytics/attestation-shared";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { useApp } from "@/lib/app-store";
import {
  fetchAgentWitness,
  probeWitnessBridge,
} from "@/lib/agent-witness";
import { hasFeeReserve } from "@/lib/midnight-wallet";
import { humanizeSettleError } from "@/lib/settle-feedback";
import { decodePackFlags } from "@/shared/types";
import type { GuardrailFinding } from "@/shared/types";

const MCP_CONFIG = `{
  "mcpServers": {
    "kachis-agent": {
      "command": "npx",
      "args": ["-y", "@kachis/agent"],
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000",
        "KACHIS_SEAT_KEY": ""
      }
    }
  }
}`;

const MCP_CONFIG_LOCAL = `{
  "mcpServers": {
    "kachis-agent": {
      "command": "node",
      "args": ["PATH/TO/next-app/agent/dist/cli.js"],
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000",
        "KACHIS_SEAT_KEY": ""
      }
    }
  }
}`;

const SETUP_STEPS = [
  { title: copy.agentMcp.step1Title, body: copy.agentMcp.step1Body },
  { title: copy.agentMcp.step2Title, body: copy.agentMcp.step2Body },
  { title: copy.agentMcp.step3Title, body: copy.agentMcp.step3Body },
] as const;

type AgentTab = "activity" | "pending" | "usage" | "configure" | "tools";

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

function formatDay(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function isAgentRow(row: PublicAttestation) {
  return row.source === "agent" || row.source === "extension";
}

function isPendingSettle(row: PublicAttestation) {
  return isAgentRow(row) && !row.onChain && !isWalkthroughAttestation(row);
}

function FeedLoading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-muted-fg">
      <Loader className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      <p className="text-[12px] leading-5">{label ?? copy.agentMcp.loading}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
  helper,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  helper?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border border-ink/10",
        className,
      )}
    >
      <div className="shrink-0 border-b border-ink/10 px-4 py-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {helper ? (
          <p className="mt-1 text-[11px] leading-5 text-muted-fg">{helper}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right text-ink/80">{value}</dd>
    </div>
  );
}

function ConfigBlock({
  label,
  helper,
  value,
}: {
  label: string;
  helper?: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="border-t border-ink/10 first:border-t-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-ink">{label}</p>
          {helper ? (
            <p className="mt-0.5 text-[11px] leading-5 text-muted-fg">{helper}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex shrink-0 items-center gap-1.5 border border-ink/10 px-2.5 py-1.5 text-[10px] font-medium text-muted-fg transition-colors hover:border-ink/20 hover:text-ink"
        >
          <Copy className="h-3 w-3" strokeWidth={1.75} />
          {copied ? copy.agentMcp.copied : copy.agentMcp.copy}
        </button>
      </div>
      <pre className="overflow-x-auto border-t border-ink/10 bg-black/20 px-4 py-3 font-mono text-[10px] leading-5 text-ink/80">
        {value}
      </pre>
    </div>
  );
}

export function AgentMcpView() {
  const { wallet, tier, recordProof } = useApp();
  const { attestations, loading, refresh } = useShieldFeed();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<AgentTab>("activity");
  const [healthLabel, setHealthLabel] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [bridgeLabel, setBridgeLabel] = useState<string | null>(null);
  const [bridgeChecking, setBridgeChecking] = useState(false);
  const [settlingHash, setSettlingHash] = useState<string | null>(null);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);

  const funded = hasFeeReserve(
    wallet.status === "connected" ? wallet.balances : undefined,
  );
  const canWalletSettle =
    wallet.status === "connected" && Boolean(wallet.address) && funded;

  const agentRows = useMemo(
    () => attestations.filter(isAgentRow),
    [attestations],
  );

  const mcpCount = useMemo(
    () => agentRows.filter((row) => row.source === "agent").length,
    [agentRows],
  );
  const extensionCount = useMemo(
    () => agentRows.filter((row) => row.source === "extension").length,
    [agentRows],
  );
  const findingsHeld = useMemo(
    () =>
      agentRows.reduce(
        (sum, row) =>
          sum + row.findings.reduce((inner, finding) => inner + finding.count, 0),
        0,
      ),
    [agentRows],
  );

  const packRows = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      PACK_KINDS.map((kind) => [kind, 0]),
    );
    for (const row of agentRows) {
      for (const kind of decodePackFlags(row.packFlags ?? 0)) {
        counts[kind] = (counts[kind] ?? 0) + 1;
      }
    }
    return PACK_KINDS.map((kind) => ({
      key: kind,
      label: PACK_LABEL[kind],
      value: counts[kind] ?? 0,
    })).filter((row) => row.value > 0);
  }, [agentRows]);

  const settledCount = useMemo(
    () => agentRows.filter((row) => Boolean(row.onChain)).length,
    [agentRows],
  );
  const pendingCount = useMemo(
    () => agentRows.filter(isPendingSettle).length,
    [agentRows],
  );
  const avgHeld =
    agentRows.length > 0
      ? (findingsHeld / agentRows.length).toFixed(1)
      : "0";

  const sourceSlices = useMemo(() => {
    const rows = [
      {
        key: "agent",
        label: copy.agentMcp.usageMcp,
        value: mcpCount,
        color: chartColor(0),
      },
      {
        key: "extension",
        label: copy.agentMcp.usageExtension,
        value: extensionCount,
        color: chartColor(1),
      },
    ].filter((row) => row.value > 0);
    return rows;
  }, [mcpCount, extensionCount]);

  const settleSlices = useMemo(
    () =>
      [
        {
          key: "settled",
          label: copy.agentMcp.usageSettled,
          value: settledCount,
          color: chartColor(2),
        },
        {
          key: "pending",
          label: copy.agentMcp.usagePending,
          value: pendingCount,
          color: chartColor(3),
        },
      ].filter((row) => row.value > 0),
    [settledCount, pendingCount],
  );

  const recent = agentRows.slice(0, 24);
  const pendingSettle = useMemo(
    () => agentRows.filter(isPendingSettle).slice(0, 24),
    [agentRows],
  );
  const live = agentRows.length > 0;
  const latest = recent[0];

  const tabs: { id: AgentTab; label: string; count?: number }[] = [
    { id: "activity", label: copy.agentMcp.tabActivity },
    {
      id: "pending",
      label: copy.agentMcp.tabPending,
      count: pendingSettle.length,
    },
    { id: "usage", label: copy.agentMcp.tabUsage },
    { id: "configure", label: copy.agentMcp.tabConfigure },
    { id: "tools", label: copy.agentMcp.tabTools },
  ];

  useEffect(() => {
    if (tab !== "pending") return;
    void refreshBridge();
  }, [tab]);

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      window.setTimeout(() => setCopiedHash(null), 1400);
    } catch {
      /* ignore */
    }
  }

  async function refreshBridge() {
    setBridgeChecking(true);
    try {
      const probe = await probeWitnessBridge();
      setBridgeLabel(
        probe.ok
          ? `${copy.agentMcp.pendingBridgeOk}${
              typeof probe.pending === "number" ? ` · ${probe.pending} local` : ""
            }`
          : copy.agentMcp.pendingBridgeDown,
      );
      return probe.ok;
    } finally {
      setBridgeChecking(false);
    }
  }

  async function refreshPending() {
    if (pendingRefreshing) return;
    setPendingRefreshing(true);
    setSettleMessage(null);
    try {
      await Promise.all([refresh(), refreshBridge()]);
    } finally {
      setPendingRefreshing(false);
    }
  }

  async function settlePending(row: PublicAttestation) {
    if (settlingHash) return;
    setSettleMessage(null);
    if (!canWalletSettle) {
      setSettleMessage(copy.agentMcp.pendingWalletNeeded);
      return;
    }

    setSettlingHash(row.cleanedHash);
    try {
      const bridgeOk = await refreshBridge();
      if (!bridgeOk) {
        setSettleMessage(copy.agentMcp.pendingBridgeDown);
        return;
      }

      const witness = await fetchAgentWitness(row.cleanedHash);
      if (!witness.ok) {
        setSettleMessage(witness.error);
        return;
      }

      if (witness.witness.binding.toLowerCase() !== row.binding.toLowerCase()) {
        setSettleMessage("Console binding does not match local witness.");
        return;
      }

      const { submitGuardrail } = await import("@/lib/midnight-submit");
      const { getConnectedWalletApi } = await import("@/lib/midnight-wallet");
      if (!getConnectedWalletApi()) {
        setSettleMessage(copy.action.reconnectWallet);
        return;
      }

      const live = await submitGuardrail({
        originalHash: witness.witness.originalHash,
        cleanedHash: witness.witness.cleanedHash,
        packFlags: witness.witness.packFlags,
        network: wallet.network,
        tier: tier === "institutional" ? "institutional" : "freelancer",
      });
      if (!live.ok) {
        setSettleMessage(
          humanizeSettleError(live.error?.trim() || copy.action.settleFailed),
        );
        return;
      }

      const findings = (row.findings ?? []) as GuardrailFinding[];
      const response = await fetch("/api/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanedHash: row.cleanedHash,
          binding: row.binding,
          packFlags: row.packFlags ?? witness.witness.packFlags,
          findings,
          attestedAt: row.attestedAt,
          source: row.source === "extension" ? "extension" : "agent",
          walletAddress: wallet.address,
          txId: live.txId,
          contractAddress: live.contractAddress,
          network: live.network,
          status: "settled",
        }),
      });
      if (!response.ok) {
        setSettleMessage(copy.action.settleLogFailed);
        return;
      }

      recordProof(0, 0);
      setSettleMessage(`${copy.agentMcp.pendingSettleOk} · ${live.txId.slice(0, 18)}…`);
    } catch (error) {
      setSettleMessage(humanizeSettleError(error));
    } finally {
      setSettlingHash(null);
    }
  }

  async function verifyConnection() {
    setChecking(true);
    setHealthLabel(copy.agentMcp.statusChecking);
    try {
      const response = await fetch("/api/agent/health");
      const body = (await response.json()) as {
        ok?: boolean;
        seat?: { authenticated?: boolean; label?: string };
      };
      if (response.ok && body.ok) {
        const seat =
          body.seat?.authenticated && body.seat.label
            ? ` · ${body.seat.label}`
            : "";
        setHealthLabel(`${copy.agentMcp.statusReachable}${seat}`);
      } else {
        setHealthLabel(copy.agentMcp.statusUnreachable);
      }
    } catch {
      setHealthLabel(copy.agentMcp.statusUnreachable);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-fg transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          {copy.agentMcp.backIntegrations}
        </Link>
      </div>

      <section className="border border-ink/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-ink">
              {copy.agentMcp.statusTitle}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-fg">
              {loading
                ? copy.agentMcp.loading
                : (healthLabel ??
                  (live ? copy.agentMcp.statusLive : copy.agentMcp.statusIdle))}
              {!loading ? (
                <>
                  {" · "}
                  {copy.agentMcp.settleMode}
                  {pendingSettle.length > 0
                    ? ` · ${pendingSettle.length} ${copy.agentMcp.pendingCount.toLowerCase()}`
                    : ""}
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            disabled={checking}
            onClick={() => void verifyConnection()}
            className="inline-flex items-center gap-1.5 border border-ink/10 px-2.5 py-1.5 text-[10px] font-medium text-muted-fg transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
          >
            <RotateCcw
              className={cn("h-3 w-3", checking && "animate-spin")}
              strokeWidth={1.75}
            />
            {copy.agentMcp.verify}
          </button>
        </div>

        {live && latest ? (
          <dl className="grid gap-px border-b border-ink/10 bg-ink/10 sm:grid-cols-3">
            <div className="bg-bg px-4 py-3 font-mono text-[10px] text-muted-fg">
              <MetaRow
                label={copy.agentMcp.activityHash}
                value={shortenHash(latest.cleanedHash)}
              />
            </div>
            <div className="bg-bg px-4 py-3 font-mono text-[10px] text-muted-fg">
              <MetaRow label="Ledger" value={`#${latest.ledgerId}`} />
            </div>
            <div className="bg-bg px-4 py-3 font-mono text-[10px] text-muted-fg">
              <MetaRow
                label="When"
                value={`${formatDay(latest.attestedAt)} ${formatTime(latest.attestedAt)}`}
              />
            </div>
          </dl>
        ) : null}

        <nav className="flex flex-wrap gap-0 border-b border-ink/10">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "border-b-2 px-4 py-2.5 text-[12px] transition-colors",
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-muted-fg hover:text-ink",
                )}
              >
                {item.label}
                {typeof item.count === "number" && item.count > 0 ? (
                  <span className="ml-1.5 font-mono text-[10px] text-muted-fg">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </section>

      {tab === "activity" ? (
        <Panel
          title={copy.agentMcp.activityTitle}
          helper={copy.agentMcp.activityHelper}
          className="min-h-[24rem]"
        >
          {loading ? (
            <FeedLoading />
          ) : recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] leading-5 text-muted-fg">
              {copy.agentMcp.activityEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              <AnimatePresence initial={false}>
                {recent.map((row) => (
                  <motion.li
                    key={`${row.ledgerId}-${row.cleanedHash}`}
                    layout
                    initial={
                      reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="p-4"
                  >
                    <p className="text-[12px] font-medium text-ink">
                      {row.source === "extension"
                        ? copy.agentMcp.usageExtension
                        : copy.agentMcp.usageMcp}
                      {": "}
                      <span className="font-mono text-ink/85">
                        {shortenHash(row.cleanedHash)}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-muted-fg">
                      <span>
                        {formatDay(row.attestedAt)} {formatTime(row.attestedAt)}
                      </span>
                      <span>
                        #{row.ledgerId} · {row.status}
                        {row.onChain
                          ? " · settled"
                          : isPendingSettle(row)
                            ? " · pending settle"
                            : ""}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>
      ) : null}

      {tab === "pending" ? (
        <Panel
          title={copy.agentMcp.pendingTitle}
          helper={copy.agentMcp.pendingHelper}
          className="min-h-[24rem]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-2.5 font-mono text-[10px] text-muted-fg">
            <span>
              {bridgeChecking || !bridgeLabel
                ? "Checking witness bridge…"
                : bridgeLabel}
              {" · "}
              {canWalletSettle
                ? "Wallet ready"
                : wallet.status === "connected"
                  ? "Wallet connected — needs fee reserve"
                  : copy.agentMcp.pendingWalletNeeded}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={bridgeChecking || pendingRefreshing}
                onClick={() => void refreshBridge()}
                className="inline-flex items-center gap-1 border border-ink/10 px-2 py-1 text-[10px] text-muted-fg transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
              >
                <RotateCcw
                  className={cn("h-3 w-3", bridgeChecking && "animate-spin")}
                  strokeWidth={1.75}
                />
                Bridge
              </button>
              <button
                type="button"
                disabled={pendingRefreshing || loading}
                onClick={() => void refreshPending()}
                className="inline-flex items-center gap-1 border border-ink/10 px-2 py-1 text-[10px] text-muted-fg transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
              >
                <RotateCcw
                  className={cn(
                    "h-3 w-3",
                    (pendingRefreshing || loading) && "animate-spin",
                  )}
                  strokeWidth={1.75}
                />
                {pendingRefreshing
                  ? copy.agentMcp.pendingRefreshing
                  : copy.agentMcp.pendingRefresh}
              </button>
            </div>
          </div>
          {settleMessage ? (
            <p className="border-b border-ink/10 px-4 py-2.5 text-[11px] leading-5 text-ink/85">
              {settleMessage}
            </p>
          ) : null}
          {loading || pendingRefreshing ? (
            <FeedLoading />
          ) : pendingSettle.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] leading-5 text-muted-fg">
              {copy.agentMcp.pendingEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              <AnimatePresence initial={false}>
                {pendingSettle.map((row) => {
                  const busy = settlingHash === row.cleanedHash;
                  return (
                    <motion.li
                      key={`pending-${row.ledgerId}-${row.cleanedHash}`}
                      layout
                      initial={
                        reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="p-4"
                    >
                      <p className="text-[12px] font-medium text-ink">
                        {copy.agentMcp.pendingStatus}
                        {": "}
                        <span className="font-mono text-ink/85">
                          {shortenHash(row.cleanedHash)}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-fg">
                          {formatDay(row.attestedAt)} {formatTime(row.attestedAt)}
                          {" · "}
                          {row.source === "extension"
                            ? copy.agentMcp.usageExtension
                            : copy.agentMcp.usageMcp}
                          {" · #"}
                          {row.ledgerId}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void copyHash(row.cleanedHash)}
                            className="inline-flex items-center gap-1 border border-ink/10 px-2 py-1 text-[10px] text-muted-fg transition-colors hover:border-ink/20 hover:text-ink"
                          >
                            <Copy className="h-3 w-3" strokeWidth={1.75} />
                            {copiedHash === row.cleanedHash
                              ? copy.agentMcp.pendingCopied
                              : copy.agentMcp.pendingCopyHash}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(settlingHash)}
                            onClick={() => void settlePending(row)}
                            className="inline-flex items-center gap-1 border border-ink/20 bg-ink px-2.5 py-1 text-[10px] font-medium text-bg transition-opacity disabled:opacity-50"
                          >
                            {busy
                              ? copy.agentMcp.pendingSettling
                              : copy.agentMcp.pendingSettle}
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
          <div className="border-t border-ink/10 px-4 py-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-fg transition-colors hover:text-ink"
            >
              {copy.agentMcp.pendingOpenWorkspace}
            </Link>
          </div>
        </Panel>
      ) : null}

      {tab === "usage" ? (
        <Panel
          title={copy.agentMcp.usageTitle}
          helper={copy.agentMcp.usageHelper}
          className="min-h-[24rem]"
        >
          {loading ? (
            <FeedLoading />
          ) : agentRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] leading-5 text-muted-fg">
              {copy.agentMcp.usageEmpty}
            </p>
          ) : (
            <div className="divide-y divide-ink/10">
              <div className="grid gap-px bg-ink/10 sm:grid-cols-3">
                <div className="bg-bg px-4 py-4">
                  <p className="text-[10px] font-medium text-muted-fg">
                    {copy.agentMcp.usageTotal}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-light tracking-tight text-ink">
                    {agentRows.length}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-fg">
                    {mcpCount} {copy.agentMcp.usageMcp.toLowerCase()}
                    {" · "}
                    {extensionCount} {copy.agentMcp.usageExtension.toLowerCase()}
                  </p>
                </div>
                <div className="bg-bg px-4 py-4">
                  <p className="text-[10px] font-medium text-muted-fg">
                    {copy.agentMcp.usageFindings}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-light tracking-tight text-ink">
                    {findingsHeld}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-fg">
                    {copy.agentMcp.usageFindingsHint}
                  </p>
                </div>
                <div className="bg-bg px-4 py-4">
                  <p className="text-[10px] font-medium text-muted-fg">
                    {copy.agentMcp.usageAvgHeld}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-light tracking-tight text-ink">
                    {avgHeld}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-fg">
                    {pendingCount} {copy.agentMcp.usagePending.toLowerCase()}
                    {" · "}
                    {settledCount} {copy.agentMcp.usageSettled.toLowerCase()}
                  </p>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-ink/10 p-4 lg:border-b-0 lg:border-r">
                  <p className="mb-4 text-[11px] font-semibold text-ink">
                    {copy.agentMcp.usageSources}
                  </p>
                  <DonutChart
                    data={sourceSlices}
                    emptyLabel={copy.agentMcp.usageChartEmpty}
                    centerLabel={copy.agentMcp.usageTotal}
                    centerValue={String(agentRows.length)}
                  />
                </div>
                <div className="p-4">
                  <p className="mb-4 text-[11px] font-semibold text-ink">
                    {copy.agentMcp.usageSettle}
                  </p>
                  <DonutChart
                    data={settleSlices}
                    emptyLabel={copy.agentMcp.usageChartEmpty}
                    centerLabel={copy.agentMcp.usagePending}
                    centerValue={String(pendingCount)}
                  />
                </div>
              </div>

              <div className="p-4">
                <p className="mb-4 text-[11px] font-semibold text-ink">
                  {copy.agentMcp.usagePacks}
                </p>
                <HorizontalBars
                  data={packRows}
                  emptyLabel={copy.agentMcp.usageChartEmpty}
                />
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === "configure" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title={copy.agentMcp.installTitle}
            helper={copy.agentMcp.installHelper}
          >
            <ol className="divide-y divide-ink/10">
              {SETUP_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3 p-4">
                  <span className="mt-0.5 font-mono text-[10px] text-muted-fg">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-ink">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title={copy.agentMcp.envTitle}>
            <div className="border-b border-ink/10 px-4 py-3">
              <p className="font-mono text-[12px] text-ink/90">
                {copy.agentMcp.settleMode}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                {copy.agentMcp.settleBody}
              </p>
            </div>
            <dl className="divide-y divide-ink/10">
              <div className="px-4 py-3">
                <p className="font-mono text-[11px] text-ink">
                  {copy.agentMcp.envConsole}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                  {copy.agentMcp.envConsoleHelper}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="font-mono text-[11px] text-ink">
                  {copy.agentMcp.envSeat}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                  {copy.agentMcp.envSeatHelper}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="font-mono text-[11px] text-ink">
                  {copy.agentMcp.envTier}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                  {copy.agentMcp.envTierHelper}
                </p>
              </div>
            </dl>
          </Panel>

          <Panel title={copy.agentMcp.configTitle} className="lg:col-span-2">
            <ConfigBlock label={copy.agentMcp.configNpx} value={MCP_CONFIG} />
            <ConfigBlock
              label={copy.agentMcp.configLocal}
              helper={copy.agentMcp.configLocalHelper}
              value={MCP_CONFIG_LOCAL}
            />
          </Panel>
        </div>
      ) : null}

      {tab === "tools" ? (
        <Panel
          title={copy.agentMcp.toolsTitle}
          helper={copy.agentMcp.toolsHelper}
          className="min-h-[24rem]"
        >
          <ul className="divide-y divide-ink/10">
            <li className="p-4">
              <p className="font-mono text-[12px] text-ink">
                {copy.agentMcp.toolShield}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                {copy.agentMcp.toolShieldBody}
              </p>
            </li>
            <li className="p-4">
              <p className="font-mono text-[12px] text-ink">
                {copy.agentMcp.toolRestore}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                {copy.agentMcp.toolRestoreBody}
              </p>
            </li>
            <li className="p-4">
              <p className="font-mono text-[12px] text-ink">
                {copy.agentMcp.toolStatus}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-fg">
                {copy.agentMcp.toolStatusBody}
              </p>
            </li>
          </ul>
          <p className="border-t border-ink/10 px-4 py-3 text-[11px] font-medium text-ink/80">
            {copy.agentMcp.toolRule}
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

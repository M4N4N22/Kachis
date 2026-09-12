"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import {
  PACK_KINDS,
  PACK_LABEL,
  shortenHash,
  useAttestations,
  type PublicAttestation,
} from "@/components/analytics/attestation-shared";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";
import { decodePackFlags } from "@/shared/types";

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

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
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
  const attestations = useAttestations();
  const reduceMotion = useReducedMotion();
  const [healthLabel, setHealthLabel] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

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

  const recent = agentRows.slice(0, 24);
  const live = agentRows.length > 0;
  const latest = recent[0];

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
    <div className="space-y-4 p-4">
      <Link
        href="/integrations"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-fg transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        {copy.agentMcp.backIntegrations}
      </Link>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <Panel title={copy.agentMcp.statusTitle}>
            {live && latest ? (
              <div className="space-y-1.5 border-b border-green-700 p-4">
                <p className="text-[11px] font-semibold text-muted-fg">
                  {copy.agentMcp.statusLive}
                </p>
                <p className="text-[12px] text-ink/90">
                  {latest.source === "extension"
                    ? copy.agentMcp.usageExtension
                    : copy.agentMcp.usageMcp}{" "}
                  · {latest.status}
                </p>
                <dl className="space-y-1.5 font-mono text-[10px] text-muted-fg">
                  <MetaRow
                    label={copy.agentMcp.activityHash}
                    value={shortenHash(latest.cleanedHash)}
                  />
                  <MetaRow label="Ledger" value={`#${latest.ledgerId}`} />
                  <MetaRow
                    label="When"
                    value={`${formatDay(latest.attestedAt)} ${formatTime(latest.attestedAt)}`}
                  />
                </dl>
              </div>
            ) : (
              <p className="border-b border-ink/10 px-4 py-6 text-center text-[12px] leading-5 text-muted-fg">
                {copy.agentMcp.statusIdle}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="font-mono text-[10px] text-muted-fg">
                {healthLabel ?? copy.agentMcp.settleMode}
              </p>
              <button
                type="button"
                disabled={checking}
                onClick={() => void verifyConnection()}
                className="inline-flex items-center gap-1.5 border border-ink/10 px-2.5 py-1.5 text-[10px] font-medium text-muted-fg transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("h-3 w-3", checking && "animate-spin")}
                  strokeWidth={1.75}
                />
                {copy.agentMcp.verify}
              </button>
            </div>
          </Panel>

          <Panel title={copy.agentMcp.usageTitle}>
            <dl className="divide-y divide-ink/10 font-mono text-[10px] text-muted-fg">
              <div className="px-4 py-3">
                <MetaRow label={copy.agentMcp.usageTotal} value={agentRows.length} />
              </div>
              <div className="px-4 py-3">
                <MetaRow label={copy.agentMcp.usageMcp} value={mcpCount} />
              </div>
              <div className="px-4 py-3">
                <MetaRow
                  label={copy.agentMcp.usageExtension}
                  value={extensionCount}
                />
              </div>
              <div className="px-4 py-3">
                <MetaRow label={copy.agentMcp.usageFindings} value={findingsHeld} />
              </div>
            </dl>

            {packRows.length > 0 ? (
              <div className="border-t border-ink/10">
                <p className="border-b border-ink/10 px-4 py-2 text-[11px] font-semibold text-muted-fg">
                  {copy.agentMcp.usagePacks}
                </p>
                <ul className="divide-y divide-ink/10">
                  {packRows.map((row) => (
                    <li
                      key={row.key}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="text-[12px] text-ink">{row.label}</span>
                      <span className="font-mono text-[10px] text-muted-fg">
                        {row.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>

          <Panel title={copy.agentMcp.activityTitle} className="min-h-[22rem]">
            <p className="border-b border-ink/10 px-4 py-2 text-[11px] leading-5 text-muted-fg">
              {copy.agentMcp.activityHelper}
            </p>
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] leading-5 text-muted-fg">
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
                          {row.onChain ? " · settled" : ""}
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title={copy.agentMcp.settleTitle}>
            <div className="space-y-1.5 p-4">
              <p className="font-mono text-[12px] text-ink/90">
                {copy.agentMcp.settleMode}
              </p>
              <p className="text-[12px] leading-5 text-muted-fg">
                {copy.agentMcp.settleBody}
              </p>
            </div>
          </Panel>

          <Panel title={copy.agentMcp.installTitle}>
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

          <Panel title={copy.agentMcp.configTitle}>
            <ConfigBlock label={copy.agentMcp.configNpx} value={MCP_CONFIG} />
            <ConfigBlock
              label={copy.agentMcp.configLocal}
              helper={copy.agentMcp.configLocalHelper}
              value={MCP_CONFIG_LOCAL}
            />
          </Panel>

          <Panel title={copy.agentMcp.envTitle}>
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

          <Panel title={copy.agentMcp.toolsTitle}>
            <p className="border-b border-ink/10 px-4 py-2 text-[11px] leading-5 text-muted-fg">
              {copy.agentMcp.toolsHelper}
            </p>
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
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Bot, Code2, Copy, Puzzle, Blocks } from "lucide-react";
import {
  shortenHash,
  useAttestations,
} from "@/components/analytics/attestation-shared";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

const MCP_CONFIG = `{
  "mcpServers": {
    "kachis-agent": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "\${workspaceFolder}/agent",
      "env": {
        "KACHIS_CONSOLE_URL": "http://localhost:3000"
      }
    }
  }
}`;

const SETUP_STEPS = [
  {
    title: copy.integrations.step1Title,
    body: copy.integrations.step1Body,
  },
  {
    title: copy.integrations.step2Title,
    body: copy.integrations.step2Body,
  },
  {
    title: copy.integrations.step3Title,
    body: copy.integrations.step3Body,
  },
] as const;

function formatAttestedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function IntegrationsView() {
  const attestations = useAttestations();
  const [copied, setCopied] = useState(false);

  const agentRows = useMemo(
    () => attestations.filter((row) => row.source === "agent").slice(0, 12),
    [attestations],
  );

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(MCP_CONFIG);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-4">
      <Bento className="p-5">
        <div className="flex items-start gap-3">
          <Blocks className="mt-0.5 h-4 w-4 text-brand" strokeWidth={1.75} />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {copy.integrations.title}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
              {copy.integrations.helper}
            </p>
          </div>
        </div>
      </Bento>

      <Bento className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">
                {copy.integrations.agentTitle}
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
                {copy.integrations.agentBody}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-brand">
            {copy.integrations.agentStatusLive}
          </span>
        </div>

        <ol className="mt-6 space-y-3">
          {SETUP_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-2xl bg-bg px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[11px] font-semibold text-ink">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{step.title}</p>
                <p className="mt-1 text-[12px] leading-5 text-muted-fg">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-muted-fg">
              {copy.integrations.configLabel}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-[11px]"
              onClick={() => void copyConfig()}
            >
              <Copy className="h-3 w-3" strokeWidth={1.75} />
              {copied ? copy.integrations.copiedConfig : copy.integrations.copyConfig}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-black/40 px-4 py-3 font-mono text-[11px] leading-5 text-ink/80">
            {MCP_CONFIG}
          </pre>
        </div>

        <div className="mt-5 rounded-2xl bg-bg px-4 py-3">
          <p className="text-[11px] font-semibold text-muted-fg">
            {copy.integrations.toolTitle}
          </p>
          <p className="mt-2 font-mono text-[12px] text-ink">
            {copy.integrations.toolName}
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-muted-fg">
            <li>{copy.integrations.toolInput}</li>
            <li>{copy.integrations.toolOutput}</li>
            <li className="text-ink/80">{copy.integrations.toolRule}</li>
          </ul>
        </div>
      </Bento>

      <Bento className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">
          {copy.integrations.activityTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
          {copy.integrations.activityHelper}
        </p>

        {agentRows.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-bg px-4 py-3 text-[12px] leading-5 text-muted-fg">
            {copy.integrations.activityEmpty}
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {agentRows.map((row) => (
              <li
                key={`${row.ledgerId}-${row.cleanedHash}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl bg-bg px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px]">{shortenHash(row.cleanedHash)}</p>
                  <p className="mt-1 text-[11px] text-muted-fg">
                    #{row.ledgerId} · {row.source} · {row.status}
                    {row.onChain ? " · settled" : ""}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] text-muted-fg">
                  {formatAttestedAt(row.attestedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bento>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bento className="p-5">
          <div className="flex items-center justify-between gap-3">
            <Code2 className="h-4 w-4 text-brand" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold tracking-wide text-brand">
              {copy.integrations.statusLive}
            </span>
          </div>
          <h3 className="mt-4 text-[13px] font-medium">{copy.integrations.libraryTitle}</h3>
          <p className="mt-2 text-[12px] leading-6 text-muted-fg">
            {copy.integrations.libraryBody}
          </p>
        </Bento>

        <Bento className="p-5">
          <div className="flex items-center justify-between gap-3">
            <Puzzle className="h-4 w-4 text-brand" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold tracking-wide text-muted-fg">
              {copy.integrations.statusLater}
            </span>
          </div>
          <h3 className="mt-4 text-[13px] font-medium">{copy.integrations.companionTitle}</h3>
          <p className="mt-2 text-[12px] leading-6 text-muted-fg">
            {copy.integrations.companionBody}
          </p>
        </Bento>
      </div>
    </div>
  );
}

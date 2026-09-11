"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  Boxes,
  BotMessageSquare,
  Code2,
  Copy,
  Puzzle,
  Server,
  type LucideIcon,
} from "lucide-react";
import {
  shortenHash,
  useAttestations,
} from "@/components/analytics/attestation-shared";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
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

type BadgeTone = "live" | "ready" | "pipeline" | "muted";

function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] tracking-wide",
        tone === "live" && " text-success",
        tone === "ready" && " text-brand",
        tone === "pipeline" && "text-muted-fg",
        tone === "muted" && " text-muted-fg",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "live" && "bg-success",
          tone === "ready" && "bg-brand",
          (tone === "pipeline" || tone === "muted") && "bg-muted-fg/60",
        )}
      />
      {label}
    </span>
  );
}

function IntegrationCard({
  icon: Icon,
  category,
  title,
  body,
  compat,
  badge,
  badgeTone,
  muted,
  action,
}: {
  icon: LucideIcon;
  category: string;
  title: string;
  body: string;
  compat: string;
  badge: string;
  badgeTone: BadgeTone;
  muted?: boolean;
  action: ReactNode;
}) {
  return (
    <Bento
      className={cn(
        "flex h-full flex-col p-5 bg-muted",
        muted && "bg-muted opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon
          className={cn("h-4 w-4 shrink-0", muted ? "text-muted-fg" : "text-brand")}
          strokeWidth={1.75}
        />
        <StatusBadge label={badge} tone={badgeTone} />
      </div>
      <h3 className="mt-1.5 text-[13px] font-medium tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-[12px] leading-6 text-muted-fg">{body}</p>
      <p className="mt-3 text-[11px] text-muted-fg">{compat}</p>
      <div className="mt-4">{action}</div>
    </Bento>
  );
}

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
  const [showConfig, setShowConfig] = useState(false);
  const [extensionNote, setExtensionNote] = useState(false);
  const [sdkNote, setSdkNote] = useState(false);
  const [gatewayNote, setGatewayNote] = useState(false);
  const [showDiagDetail, setShowDiagDetail] = useState(false);

  const agentRows = useMemo(
    () => attestations.filter((row) => row.source === "agent").slice(0, 12),
    [attestations],
  );
  const agentConnected = agentRows.length > 0;

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
    <div className="space-y-6 p-4">
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {copy.integrations.livePhase}
          </h2>
          <p className="mt-1 text-[12px] text-muted-fg">
            {copy.integrations.livePhaseHelper}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <IntegrationCard
            icon={Bot}
            category={copy.integrations.categoryDev}
            title={copy.integrations.mcpTitle}
            body={copy.integrations.mcpBody}
            compat={copy.integrations.mcpCompat}
            badge={
              agentConnected
                ? copy.integrations.badgeConnected
                : copy.integrations.badgeSetup
            }
            badgeTone={agentConnected ? "live" : "ready"}
            action={
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setShowConfig((value) => !value)}
              >
                {showConfig
                  ? copy.integrations.mcpHideConfig
                  : copy.integrations.mcpAction}
              </Button>
            }
          />

          <IntegrationCard
            icon={Puzzle}
            category={copy.integrations.categoryApps}
            title={copy.integrations.extensionTitle}
            body={copy.integrations.extensionBody}
            compat={copy.integrations.extensionCompat}
            badge={copy.integrations.badgeReady}
            badgeTone="ready"
            action={
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setExtensionNote((value) => !value)}
                >
                  {copy.integrations.extensionAction}
                </Button>
                {extensionNote ? (
                  <p className="text-[11px] leading-5 text-muted-fg">
                    {copy.integrations.extensionNote}
                  </p>
                ) : null}
              </div>
            }
          />

          <IntegrationCard
            icon={BotMessageSquare}
            category={copy.integrations.categoryNative}
            title={copy.integrations.workspaceTitle}
            body={copy.integrations.workspaceBody}
            compat={copy.integrations.workspaceCompat}
            badge={copy.integrations.badgeLaunch}
            badgeTone="ready"
            action={
              <Link
                href="/workspace"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-3.5 text-[13px] font-medium tracking-tight text-brand-fg transition-colors hover:opacity-90 sm:w-auto"
              >
                {copy.integrations.workspaceAction}
              </Link>
            }
          />
        </div>

        {showConfig ? (
          <Bento className="p-5">
            <ol className="space-y-3">
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
                    <p className="mt-1 text-[12px] leading-5 text-muted-fg">
                      {step.body}
                    </p>
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
                  {copied
                    ? copy.integrations.copiedConfig
                    : copy.integrations.copyConfig}
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
              <p className="mt-4 font-mono text-[12px] text-ink">
                {copy.integrations.restoreTool}
              </p>
              <p className="mt-1.5 text-[12px] leading-5 text-muted-fg">
                {copy.integrations.restoreHelper}
              </p>
            </div>
          </Bento>
        ) : null}
      </section>

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
                  <p className="font-mono text-[12px]">
                    {shortenHash(row.cleanedHash)}
                  </p>
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

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            {copy.integrations.pipelinePhase}
          </h2>
          <p className="mt-1 text-[12px] text-muted-fg">
            {copy.integrations.pipelinePhaseHelper}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <IntegrationCard
            muted
            icon={Code2}
            category={copy.integrations.categoryMachine}
            title={copy.integrations.sdkTitle}
            body={copy.integrations.sdkBody}
            compat={copy.integrations.sdkCompat}
            badge={copy.integrations.badgePipeline}
            badgeTone="pipeline"
            action={
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setSdkNote((value) => !value)}
                >
                  {copy.integrations.sdkAction}
                </Button>
                {sdkNote ? (
                  <p className="text-[11px] leading-5 text-muted-fg">
                    {copy.integrations.sdkNote}
                  </p>
                ) : null}
              </div>
            }
          />

          <IntegrationCard
            muted
            icon={Boxes}
            category={copy.integrations.categoryInfra}
            title={copy.integrations.gatewayTitle}
            body={copy.integrations.gatewayBody}
            compat={copy.integrations.gatewayCompat}
            badge={copy.integrations.badgeInstitutional}
            badgeTone="pipeline"
            action={
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setGatewayNote((value) => !value)}
                >
                  {copy.integrations.gatewayAction}
                </Button>
                {gatewayNote ? (
                  <p className="text-[11px] leading-5 text-muted-fg">
                    {copy.integrations.gatewayNote}
                  </p>
                ) : null}
              </div>
            }
          />

          <IntegrationCard
            muted
            icon={Server}
            category={copy.integrations.categorySystem}
            title={copy.integrations.sidecarTitle}
            body={copy.integrations.sidecarBody}
            compat={copy.integrations.sidecarCompat}
            badge={copy.integrations.badgePlanned}
            badgeTone="muted"
            action={
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setShowDiagDetail((value) => !value)}
                >
                  {copy.integrations.sidecarAction}
                </Button>
                {showDiagDetail ? (
                  <div className="space-y-1.5 rounded-2xl bg-bg px-3 py-2.5 text-[11px] leading-5 text-muted-fg">
                    <p>
                      {copy.integrations.diagEngine}:{" "}
                      {copy.integrations.diagEngineActive}
                    </p>
                    <p>
                      {copy.integrations.diagEvidence}:{" "}
                      {agentConnected
                        ? copy.integrations.diagEvidenceVerified
                        : copy.integrations.diagEvidenceWaiting}
                    </p>
                    <p>
                      Agent posts: {agentRows.length}
                      {agentRows.length === 1 ? " commitment" : " commitments"}
                    </p>
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
      </section>
    </div>
  );
}

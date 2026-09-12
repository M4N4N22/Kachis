"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  Boxes,
  BotMessageSquare,
  Code2,
  Puzzle,
  Server,
  type LucideIcon,
} from "lucide-react";
import { useAttestations } from "@/components/analytics/attestation-shared";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { copy } from "@/lib/copy";

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
  title,
  body,
  compat,
  badge,
  badgeTone,
  muted,
  action,
}: {
  icon: LucideIcon;
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

export function IntegrationsView() {
  const attestations = useAttestations();
  const [extensionNote, setExtensionNote] = useState(false);
  const [sdkNote, setSdkNote] = useState(false);
  const [gatewayNote, setGatewayNote] = useState(false);
  const [showDiagDetail, setShowDiagDetail] = useState(false);

  const agentConnected = useMemo(
    () =>
      attestations.some(
        (row) => row.source === "agent" || row.source === "extension",
      ),
    [attestations],
  );

  const agentCount = useMemo(
    () =>
      attestations.filter(
        (row) => row.source === "agent" || row.source === "extension",
      ).length,
    [attestations],
  );

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
              <Link
                href="/integrations/agent"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-3.5 text-[13px] font-medium tracking-tight text-brand-fg transition-colors hover:opacity-90 sm:w-auto"
              >
                {copy.integrations.mcpAction}
              </Link>
            }
          />

          <IntegrationCard
            icon={Puzzle}
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
      </section>

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
                      Agent posts: {agentCount}
                      {agentCount === 1 ? " commitment" : " commitments"}
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

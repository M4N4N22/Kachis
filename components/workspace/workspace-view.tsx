"use client";

import { ChatWorkspace } from "@/components/workspace/chat-workspace";
import { ResponsePanel } from "@/components/workspace/response-panel";
import { SanitizedPanel } from "@/components/workspace/sanitized-panel";
import { ZkInputPanel } from "@/components/workspace/zk-input-panel";
import { copy } from "@/lib/copy";
import { useWorkspaceLayout } from "@/lib/workspace-layout-store";
import { WorkspaceProvider } from "@/lib/workspace-store";

function ClassicWorkspace() {
  return (
    <div className="grid min-h-0 flex-1 gap-1 overflow-hidden rounded-3xl lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
      <div className="min-h-[480px] border-b border-ink/6 lg:min-h-0 lg:border-b-0">
        <ZkInputPanel />
      </div>
      <div className="min-h-[420px] border-b border-ink/6 lg:min-h-0 lg:border-b-0">
        <SanitizedPanel />
      </div>
      <div className="min-h-[420px] lg:min-h-0">
        <ResponsePanel />
      </div>
    </div>
  );
}

export function WorkspaceView({ demo = false }: { demo?: boolean }) {
  const { mode } = useWorkspaceLayout();

  return (
    <WorkspaceProvider demo={demo}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {demo ? (
          <p className="shrink-0 rounded-full px-3 py-2 text-[13px] text-brand">
            {copy.demo.banner}
          </p>
        ) : null}
        {mode === "classic" ? <ClassicWorkspace /> : <ChatWorkspace />}
      </div>
    </WorkspaceProvider>
  );
}

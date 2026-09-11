"use client";

import { ResponsePanel } from "@/components/workspace/response-panel";
import { SanitizedPanel } from "@/components/workspace/sanitized-panel";
import { ZkInputPanel } from "@/components/workspace/zk-input-panel";
import { copy } from "@/lib/copy";
import { WorkspaceProvider } from "@/lib/workspace-store";

export function WorkspaceView({ demo = false }: { demo?: boolean }) {
  return (
    <WorkspaceProvider demo={demo}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 ">
        {demo ? (
          <p className="shrink-0 rounded-full w-fit px-3 py-2  text-[13px]  text-brand">
            {copy.demo.banner}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-1 overflow-hidden rounded-3xl lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="min-h-[480px]  border-b border-ink/6 lg:min-h-0 lg:border-b-0">
            <ZkInputPanel />
          </div>
          <div className="min-h-[420px] border-b border-ink/6 lg:min-h-0 lg:border-b-0">
            <SanitizedPanel />
          </div>
          <div className="min-h-[420px] lg:min-h-0">
            <ResponsePanel />
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}

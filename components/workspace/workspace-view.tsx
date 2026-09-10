"use client";

import { ResponsePanel } from "@/components/workspace/response-panel";
import { SanitizedPanel } from "@/components/workspace/sanitized-panel";
import { ZkInputPanel } from "@/components/workspace/zk-input-panel";
import { copy } from "@/lib/copy";
import { WorkspaceProvider } from "@/lib/workspace-store";

export function WorkspaceView({ demo = false }: { demo?: boolean }) {
  return (
    <WorkspaceProvider demo={demo}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
        {demo ? (
          <p className="shrink-0 rounded-2xl bg-brand-b px-5 py-3 text-[13px] leading-6 text-ink">
            {copy.demo.banner}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-3xl border border-white/10 lg:grid-cols-3">
          <div className="min-h-[480px] border-b border-white/6 lg:min-h-0 lg:border-b-0">
            <ZkInputPanel />
          </div>
          <div className="min-h-[420px] border-b border-white/6 lg:min-h-0 lg:border-b-0">
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

"use client";

import { ChatArena } from "@/components/workspace/chat-arena";
import { GuideRail } from "@/components/workspace/guide-rail";
import { ZkInputPanel } from "@/components/workspace/zk-input-panel";
import { copy } from "@/lib/copy";
import { WorkspaceProvider } from "@/lib/workspace-store";

export function WorkspaceView({ demo = false }: { demo?: boolean }) {
  return (
    <WorkspaceProvider demo={demo}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {demo ? (
          <p className="shrink-0 rounded-2xl bg-[color-mix(in_srgb,var(--brand)_10%,var(--surface))] px-5 py-3 text-[13px] leading-6">
            {copy.demo.banner}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-4 xl:h-full xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-h-[640px] gap-4 lg:min-h-0 lg:grid-cols-2 xl:h-full">
            <ZkInputPanel />
            <ChatArena />
          </div>
          <GuideRail />
        </div>
      </div>
    </WorkspaceProvider>
  );
}

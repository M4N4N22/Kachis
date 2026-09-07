"use client";

import { ChatArena } from "@/components/workspace/chat-arena";
import { GuideRail } from "@/components/workspace/guide-rail";
import { ZkInputPanel } from "@/components/workspace/zk-input-panel";
import { WorkspaceProvider } from "@/lib/workspace-store";

export function WorkspaceView() {
  return (
    <WorkspaceProvider>
      <div className="grid min-h-0 flex-1 gap-4 xl:h-full xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-h-[640px] gap-4 lg:min-h-0 lg:grid-cols-2 xl:h-full">
          <ZkInputPanel />
          <ChatArena />
        </div>
        <GuideRail />
      </div>
    </WorkspaceProvider>
  );
}

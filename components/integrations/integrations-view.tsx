"use client";

import { Blocks, Bot, Code2, Puzzle } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { copy } from "@/lib/copy";

const ENTRIES = [
  {
    icon: Code2,
    title: copy.integrations.sdkTitle,
    body: copy.integrations.sdkBody,
    status: copy.integrations.statusLive,
  },
  {
    icon: Bot,
    title: copy.integrations.mcpTitle,
    body: copy.integrations.mcpBody,
    status: copy.integrations.statusLive,
  },
  {
    icon: Puzzle,
    title: copy.integrations.companionTitle,
    body: copy.integrations.companionBody,
    status: copy.integrations.statusLater,
  },
] as const;

export function IntegrationsView() {
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

      <div className="grid gap-4 lg:grid-cols-3">
        {ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Bento key={entry.title} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-4 w-4 text-brand" strokeWidth={1.75} />
                <span className="text-[10px] font-semibold tracking-wide text-muted-fg uppercase">
                  {entry.status}
                </span>
              </div>
              <h3 className="mt-4 text-[13px] font-medium">{entry.title}</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted-fg">{entry.body}</p>
            </Bento>
          );
        })}
      </div>
    </div>
  );
}

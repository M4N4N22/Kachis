"use client";

import { Bento } from "@/components/ui/bento";
import { useApp } from "@/lib/app-store";

const BARS = [28, 46, 38, 62, 54, 71, 64, 80, 74, 88, 70, 92];

export function AnalyticsView() {
  const { usage, tier } = useApp();
  const quota = tier === "freelancer" ? 25 : null;

  const stats = [
    {
      label: "Proofs generated",
      value: usage.proofsGenerated.toLocaleString(),
      hint: quota ? `${usage.proofsGenerated} / ${quota} freemium` : "Unlimited org seat",
    },
    {
      label: "Bytes shielded",
      value: formatBytes(usage.bytesShielded),
      hint: "Never left the browser",
    },
    {
      label: "Shielded queries",
      value: usage.queries.toLocaleString(),
      hint: "Model I/O after proof",
    },
    {
      label: "Secrets blocked",
      value: usage.blockedSecrets.toLocaleString(),
      hint: "Compliance pack hits",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Bento key={stat.label} className="p-5">
            <p className="text-[11px] font-semibold text-muted-fg">{stat.label}</p>
            <p className="mt-3 text-2xl font-light tracking-tight">{stat.value}</p>
            <p className="mt-2 text-[11px] text-muted-fg">{stat.hint}</p>
          </Bento>
        ))}
      </div>

      <Bento className="p-5">
        <p className="text-[11px] font-semibold text-brand">Shielded volume</p>
        <h2 className="mt-1 text-sm font-semibold tracking-tight">Last twelve cycles</h2>
        <div className="mt-6 flex h-40 items-end gap-2">
          {BARS.map((height, index) => (
            <div key={`${height}-${index}`} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="rounded-full bg-[color-mix(in_srgb,var(--brand)_70%,transparent)]"
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
      </Bento>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

"use client";

import { cn } from "@/lib/cn";

export type BarDatum = {
  key: string;
  label: string;
  value: number;
};

export type SliceDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const CHART_COLORS = [
  "var(--brand)",
  "color-mix(in srgb, var(--brand) 70%, var(--ink))",
  "color-mix(in srgb, var(--success) 85%, var(--brand))",
  "color-mix(in srgb, var(--ink) 35%, var(--brand))",
  "color-mix(in srgb, var(--muted-fg) 55%, var(--brand))",
];

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

export function HorizontalBars({
  data,
  emptyLabel,
}: {
  data: BarDatum[];
  emptyLabel: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) {
    return <p className="py-8 text-[12px] text-muted-fg">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((item, index) => {
        const width = Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0);
        return (
          <li key={item.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[12px] text-ink">{item.label}</span>
              <span className="font-mono text-[11px] text-muted-fg">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/8">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${width}%`,
                  background: chartColor(index),
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DonutChart({
  data,
  emptyLabel,
  centerLabel,
  centerValue,
}: {
  data: SliceDatum[];
  emptyLabel: string;
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <p className="py-8 text-[12px] text-muted-fg">{emptyLabel}</p>;
  }

  const size = 160;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--ink) 8%, transparent)"
            strokeWidth={stroke}
          />
          {data.map((slice) => {
            if (slice.value <= 0) return null;
            const length = (slice.value / total) * circumference;
            const node = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return node;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-light tracking-tight text-ink">{centerValue}</p>
          <p className="text-[10px] font-semibold text-muted-fg">{centerLabel}</p>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="inline-flex items-center gap-2 text-ink">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              {slice.label}
            </span>
            <span className="font-mono text-[11px] text-muted-fg">
              {slice.value}
              {total > 0 ? ` · ${Math.round((slice.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SequenceArea({
  values,
  emptyLabel,
  yLabel,
}: {
  values: number[];
  emptyLabel: string;
  yLabel: string;
}) {
  if (values.length === 0) {
    return <p className="py-8 text-[12px] text-muted-fg">{emptyLabel}</p>;
  }

  const width = 560;
  const height = 160;
  const padX = 8;
  const padY = 12;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (width - padX * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padX + index * step;
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${padX},${height - padY} ${line} ${points[points.length - 1]!.x},${height - padY}`;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold text-muted-fg">{yLabel}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full overflow-visible"
        role="img"
        aria-label={yLabel}
      >
        <defs>
          <linearGradient id="settlementFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padY - ratio * (height - padY * 2);
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="color-mix(in srgb, var(--ink) 8%, transparent)"
              strokeWidth={1}
            />
          );
        })}
        <polygon points={area} fill="url(#settlementFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={values.length > 24 ? 2 : 3}
            fill="var(--bg)"
            stroke="var(--brand)"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-fg">
        <span>#{1}</span>
        <span>
          {values.length} {values.length === 1 ? "settlement" : "settlements"}
        </span>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[inherit] p-5",
        accent && "bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--brand)_18%,transparent),transparent_55%)]",
      )}
    >
      <p className="text-[11px] font-semibold text-muted-fg">{label}</p>
      <p className="mt-3 text-2xl font-light tracking-tight">{value}</p>
      <p className="mt-2 text-[11px] text-muted-fg">{hint}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { ByocKeyForm } from "@/components/identity/byoc-key-form";
import { Bento } from "@/components/ui/bento";
import { copy } from "@/lib/copy";

type ProvidersPayload = {
  beta: {
    provider: "gemini";
    available: boolean;
    used: number;
    limit: number;
    remaining: number;
    day: string;
  };
};

export function ProvidersView() {
  const [beta, setBeta] = useState<ProvidersPayload["beta"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/providers")
      .then((response) => response.json())
      .then((data: ProvidersPayload) => {
        if (!cancelled) setBeta(data.beta);
      })
      .catch(() => {
        if (!cancelled) setBeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const betaStatus = !beta
    ? copy.providers.betaOffline
    : !beta.available
      ? copy.providers.betaOffline
      : beta.remaining <= 0
        ? copy.providers.betaEmpty
        : copy.providers.betaReady
            .replace("{remaining}", String(beta.remaining))
            .replace("{limit}", String(beta.limit));

  return (
    <div className="space-y-4">
      <Bento className="p-5">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-4 w-4 text-brand" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">
              {copy.providers.title}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-fg">
              {copy.providers.helper}
            </p>
          </div>
        </div>
      </Bento>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bento className="p-5">
          <p className="text-[13px] font-medium">{copy.providers.betaTitle}</p>
          <p className="mt-2 text-[12px] leading-5 text-muted-fg">
            {copy.providers.betaBody}
          </p>
          <p className="mt-2 font-mono text-[10px] text-muted-fg">Gemini · hosted</p>
          <p
            className={`mt-4 text-[11px] ${
              beta?.available && (beta.remaining ?? 0) > 0
                ? "text-brand"
                : "text-muted-fg"
            }`}
          >
            {betaStatus}
          </p>
        </Bento>

        <Bento className="p-5">
          <ByocKeyForm showIntro />
        </Bento>
      </div>
    </div>
  );
}

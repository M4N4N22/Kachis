"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copy } from "@/lib/copy";
import { useByoc } from "@/lib/byoc-store";
import type { ModelProviderId } from "@/lib/types";

const PROVIDER_OPTIONS: { id: ModelProviderId; label: string }[] = [
  { id: "openai", label: copy.providers.openai },
  { id: "anthropic", label: copy.providers.anthropic },
  { id: "gemini", label: copy.providers.gemini },
  { id: "custom", label: copy.providers.custom },
];

type ByocKeyFormProps = {
  onSaved?: () => void;
  showIntro?: boolean;
};

export function ByocKeyForm({ onSaved, showIntro = false }: ByocKeyFormProps) {
  const { ready, provider, displayName, credential, setCredential, clearCredential } =
    useByoc();
  const [draftProvider, setDraftProvider] = useState<ModelProviderId>(
    provider ?? "openai",
  );
  const [draftLabel, setDraftLabel] = useState(credential?.label ?? "");
  const [draftBaseUrl, setDraftBaseUrl] = useState(credential?.baseUrl ?? "");
  const [draftModel, setDraftModel] = useState(credential?.model ?? "");
  const [draftKey, setDraftKey] = useState("");

  useEffect(() => {
    if (!credential) return;
    setDraftProvider(credential.provider);
    setDraftLabel(credential.label ?? "");
    setDraftBaseUrl(credential.baseUrl ?? "");
    setDraftModel(credential.model ?? "");
  }, [credential]);

  const custom = draftProvider === "custom";
  const canSave =
    Boolean(draftKey.trim()) && (!custom || Boolean(draftLabel.trim()));

  function onSave() {
    if (!canSave) return;
    setCredential({
      provider: draftProvider,
      apiKey: draftKey,
      label: custom ? draftLabel : undefined,
      baseUrl: custom ? draftBaseUrl : undefined,
      model: draftModel || undefined,
    });
    setDraftKey("");
    onSaved?.();
  }

  return (
    <div className="space-y-3">
      {showIntro ? (
        <>
          <p className="text-[13px] font-medium text-ink">{copy.providers.byocTitle}</p>
          <p className="text-[12px] leading-5 text-muted-fg">{copy.providers.byocBody}</p>
        </>
      ) : null}      <label className="block">
        <span className="text-[11px] font-semibold text-muted-fg">
          {copy.providers.byocProvider}
        </span>
        <div className="mt-1.5">
          <Select
            value={draftProvider}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setDraftProvider(value as ModelProviderId);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </label>

      {custom ? (
        <>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-fg">
              {copy.providers.byocCustomName}
            </span>
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder={copy.providers.byocCustomNamePlaceholder}
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-black/25 px-3 py-2 text-[13px] text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-fg">
              {copy.providers.byocBaseUrl}
            </span>
            <input
              value={draftBaseUrl}
              onChange={(event) => setDraftBaseUrl(event.target.value)}
              placeholder={copy.providers.byocBaseUrlPlaceholder}
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-ink/10 bg-black/25 px-3 py-2 font-mono text-[12px] text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
            />
            <span className="mt-1 block text-[11px] text-muted-fg">
              {copy.providers.byocBaseUrlHint}
            </span>
          </label>
        </>
      ) : null}

      <label className="block">
        <span className="text-[11px] font-semibold text-muted-fg">
          {copy.providers.byocModel}
        </span>
        <input
          value={draftModel}
          onChange={(event) => setDraftModel(event.target.value)}
          placeholder={copy.providers.byocModelPlaceholder}
          spellCheck={false}
          className="mt-1.5 w-full rounded-xl border border-ink/10 bg-black/25 px-3 py-2 font-mono text-[12px] text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-semibold text-muted-fg">
          {copy.providers.byocKey}
        </span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
          placeholder={copy.providers.byocKeyPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-ink/10 bg-black/25 px-3 py-2 font-mono text-[12px] text-ink outline-none placeholder:text-muted-fg focus:border-[color-mix(in_srgb,var(--brand-a)_45%,transparent)]"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" disabled={!canSave} onClick={onSave}>
          {copy.providers.byocSave}
        </Button>
        {ready ? (
          <Button size="sm" variant="outline" onClick={clearCredential}>
            {copy.providers.byocClear}
          </Button>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-fg">
        {ready && displayName
          ? copy.providers.byocReady.replace("{provider}", displayName)
          : copy.providers.byocEmpty}
      </p>
    </div>
  );
}

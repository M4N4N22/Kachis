"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ModelProviderId } from "@/lib/types";

export type ByocCredential = {
  provider: ModelProviderId;
  /** Present only in browser memory for this tab session. Never written server-side. */
  apiKey: string;
  /** Display name for custom / other providers. */
  label?: string;
  /** OpenAI-compatible base URL for custom providers. */
  baseUrl?: string;
  /** Optional model id for this session. */
  model?: string;
};

type ByocContextValue = {
  credential: ByocCredential | null;
  /** True when a key is loaded for this session (value never exposed to callers). */
  ready: boolean;
  provider: ModelProviderId | null;
  displayName: string | null;
  setCredential: (value: ByocCredential) => void;
  clearCredential: () => void;
};

const ByocContext = createContext<ByocContextValue | null>(null);

function displayNameFor(credential: ByocCredential | null) {
  if (!credential) return null;
  if (credential.provider === "custom") {
    return credential.label?.trim() || "Custom";
  }
  if (credential.provider === "openai") return "OpenAI";
  if (credential.provider === "anthropic") return "Anthropic";
  return "Gemini";
}

/**
 * Bring-your-own-compute keys live in React state only.
 * They are sent ephemerally with /api/chat and never persisted by Kachis.
 */
export function ByocProvider({ children }: { children: ReactNode }) {
  const [credential, setCredentialState] = useState<ByocCredential | null>(null);

  const setCredential = useCallback((value: ByocCredential) => {
    const apiKey = value.apiKey.trim();
    if (!apiKey) {
      setCredentialState(null);
      return;
    }
    setCredentialState({
      provider: value.provider,
      apiKey,
      label: value.label?.trim() || undefined,
      baseUrl: value.baseUrl?.trim() || undefined,
      model: value.model?.trim() || undefined,
    });
  }, []);

  const clearCredential = useCallback(() => {
    setCredentialState(null);
  }, []);

  const value = useMemo<ByocContextValue>(
    () => ({
      credential,
      ready: Boolean(credential?.apiKey),
      provider: credential?.provider ?? null,
      displayName: displayNameFor(credential),
      setCredential,
      clearCredential,
    }),
    [clearCredential, credential, setCredential],
  );

  return <ByocContext.Provider value={value}>{children}</ByocContext.Provider>;
}

export function useByoc() {
  const context = useContext(ByocContext);
  if (!context) {
    throw new Error("useByoc must be used within ByocProvider");
  }
  return context;
}

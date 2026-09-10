"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { SAMPLE_SENSITIVE_PROMPT, runShield } from "@/lib/midnight";
import { hasFeeReserve } from "@/lib/midnight-wallet";
import { sha256Hex } from "@/shared/commit";
import {
  defaultTogglesForTier,
  requiredPackForTier,
  togglesMeetRequired,
} from "@/shared/policy";
import type {
  ChatMessage,
  GuardrailToggles,
  ProofRecord,
  ProofStatus,
} from "@/lib/types";

interface WorkspaceContextValue {
  demo: boolean;
  walletConnected: boolean;
  canShield: boolean;
  shieldGateHint: string | null;
  settleError: string | null;
  rawInput: string;
  setRawInput: (value: string) => void;
  sanitizedPrompt: string;
  guardrails: GuardrailToggles;
  setGuardrail: (key: keyof GuardrailToggles, value: boolean) => void;
  proofStatus: ProofStatus;
  proof: ProofRecord | null;
  messages: ChatMessage[];
  processLocally: () => Promise<void>;
  sendShielded: () => Promise<void>;
  busy: boolean;
  sending: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function WorkspaceProvider({
  children,
  demo = false,
}: {
  children: ReactNode;
  demo?: boolean;
}) {
  const { tier, wallet, recordProof, recordQuery } = useApp();
  const [rawInput, setRawInput] = useState(demo ? SAMPLE_SENSITIVE_PROMPT : "");
  const [sanitizedPrompt, setSanitizedPrompt] = useState("");
  const [guardrails, setGuardrails] = useState<GuardrailToggles>(() =>
    defaultTogglesForTier(tier),
  );
  const [proofStatus, setProofStatus] = useState<ProofStatus>("idle");
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const liveWalletConnected = wallet.status === "connected";
  const funded = hasFeeReserve(wallet.status === "connected" ? wallet.balances : undefined);
  // Walkthrough mimics a funded connected seat — no wallet or Midnight tx required.
  const walletConnected = demo || liveWalletConnected;
  const canShield = demo || (liveWalletConnected && funded);
  const shieldGateHint = demo
    ? null
    : !liveWalletConnected
      ? copy.action.walletRequiredHint
      : !funded
        ? copy.action.fundRequiredHint
        : wallet.provider === "gero"
          ? copy.action.geroSettleHint
          : null;

  useEffect(() => {
    if (demo || canShield) return;
    setProof(null);
    setProofStatus("idle");
    setSanitizedPrompt("");
    setMessages([]);
    if (!liveWalletConnected) setSettleError(null);
  }, [canShield, demo, liveWalletConnected]);

  const setGuardrail = useCallback(
    (key: keyof GuardrailToggles, value: boolean) => {
      setGuardrails((current) => ({ ...current, [key]: value }));
      setProofStatus("idle");
      setProof(null);
      setSanitizedPrompt("");
      setSettleError(null);
    },
    [],
  );

  const processLocally = useCallback(async () => {
    if (!rawInput.trim() || busy || sending || !canShield) return;

    const required = requiredPackForTier(tier);
    if (!togglesMeetRequired(guardrails, required)) {
      setSettleError(copy.pack.required);
      setProofStatus("error");
      return;
    }

    setBusy(true);
    setProof(null);
    setSanitizedPrompt("");
    setMessages([]);
    setSettleError(null);

    try {
      setProofStatus("scanning");
      const result = await runShield(rawInput, guardrails);

      setProofStatus("proving");

      let submitted: {
        txId: string;
        contractAddress: string;
        network: string;
      };

      if (demo) {
        // Mimic in-wallet prove + settle timing without Midnight or a connector.
        await delay(1100);
        setProofStatus("attesting");
        await delay(450);
        const digest = await sha256Hex(`${result.cleanedHash}:walkthrough`);
        submitted = {
          txId: `walkthrough_${digest.slice(2, 18)}`,
          contractAddress: "walkthrough",
          network: "walkthrough",
        };
      } else {
        const { submitGuardrail } = await import("@/lib/midnight-submit");
        const { getConnectedWalletApi } = await import("@/lib/midnight-wallet");
        if (!getConnectedWalletApi()) {
          setSettleError(copy.action.reconnectWallet);
          setProofStatus("error");
          return;
        }

        const live = await submitGuardrail({
          originalHash: await sha256Hex(rawInput),
          cleanedHash: result.cleanedHash,
          packFlags: result.packFlags,
          network: wallet.network,
        });
        if (!live.ok) {
          console.error("[kachis] settle rejected", live);
          setSettleError(live.error?.trim() || copy.action.settleFailed);
          setProofStatus("error");
          return;
        }

        setProofStatus("attesting");
        submitted = {
          txId: live.txId,
          contractAddress: live.contractAddress,
          network: live.network,
        };
      }

      const response = await fetch("/api/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanedHash: result.cleanedHash,
          binding: result.binding,
          packFlags: result.packFlags,
          findings: result.findings,
          attestedAt: result.attestedAt,
          source: "console",
          walletAddress: demo ? "walkthrough" : wallet.address,
          txId: submitted.txId,
          contractAddress: submitted.contractAddress,
          network: submitted.network,
          status: "settled",
          note: demo ? copy.demo.settleNote : undefined,
        }),
      });

      if (!response.ok) {
        let detail = copy.action.settleFailed;
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) detail = body.error;
        } catch {
          /* keep fallback */
        }
        setSettleError(
          demo
            ? detail
            : `On-chain settle returned ${submitted.txId}, but the console log failed: ${detail}`,
        );
        setProofStatus("error");
        return;
      }

      const attested = (await response.json()) as {
        ledgerId?: number;
        status?: ProofRecord["status"];
        note?: string;
        walletAddress?: string;
        txId?: string;
        contractAddress?: string;
        network?: string;
      };

      const record: ProofRecord = {
        hash: result.cleanedHash,
        binding: result.binding,
        circuit: result.circuit,
        attestedAt: result.attestedAt,
        findings: result.findings,
        packFlags: result.packFlags,
        ledgerId: attested.ledgerId,
        status: attested.status ?? "settled",
        walletAddress: attested.walletAddress,
        note: attested.note,
        txId: attested.txId ?? submitted.txId,
        contractAddress: attested.contractAddress ?? submitted.contractAddress,
        network: attested.network ?? submitted.network,
      };

      setSanitizedPrompt(result.text);
      setProof(record);
      setProofStatus("shielded");
      recordProof(
        rawInput.length,
        result.findings.find((item) => item.kind === "secrets")?.count ?? 0,
      );
    } catch (error) {
      console.error("[kachis] processLocally failed", error);
      const raw =
        error instanceof Error
          ? [error.message, error.cause instanceof Error ? error.cause.message : null]
              .filter((part): part is string => Boolean(part && String(part).trim()))
              .join(" · ")
          : typeof error === "string"
            ? error.trim()
            : "";
      const message = /WebSocket|isomorphic-ws|Export .* doesn't exist/i.test(raw)
        ? copy.action.settleBundleFailed
        : raw || copy.action.settleFailed;
      setSettleError(message);
      setProofStatus("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    canShield,
    demo,
    guardrails,
    rawInput,
    recordProof,
    sending,
    tier,
    wallet.address,
    wallet.network,
  ]);

  const sendShielded = useCallback(async () => {
    const content = sanitizedPrompt.trim();
    if (!content || proofStatus !== "shielded" || busy || sending || !canShield) return;

    setSending(true);
    setMessages([]);
    recordQuery();

    try {
      if (demo) {
        await delay(700);
        setMessages([
          {
            id: createId(),
            role: "assistant",
            content: copy.demo.reply,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, proofHash: proof?.hash }),
      });
      const data = (await response.json()) as { content?: string; error?: string };

      setMessages([
        {
          id: createId(),
          role: "assistant",
          content: data.content ?? data.error ?? copy.response.noModel,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages([
        {
          id: createId(),
          role: "assistant",
          content: demo ? copy.demo.reply : copy.response.error,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [busy, canShield, demo, proof?.hash, proofStatus, recordQuery, sanitizedPrompt, sending]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      demo,
      walletConnected,
      canShield,
      shieldGateHint,
      settleError,
      rawInput,
      setRawInput,
      sanitizedPrompt,
      guardrails,
      setGuardrail,
      proofStatus,
      proof,
      messages,
      processLocally,
      sendShielded,
      busy,
      sending,
    }),
    [
      busy,
      canShield,
      demo,
      guardrails,
      messages,
      processLocally,
      proof,
      proofStatus,
      rawInput,
      sanitizedPrompt,
      sendShielded,
      sending,
      setGuardrail,
      settleError,
      shieldGateHint,
      walletConnected,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

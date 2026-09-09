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
import { runShield } from "@/lib/midnight";
import { hasFeeReserve } from "@/lib/midnight-wallet";
import { sha256Hex } from "@/shared/commit";
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
  composer: string;
  setComposer: (value: string) => void;
  processLocally: () => Promise<void>;
  sendChat: () => Promise<void>;
  busy: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function WorkspaceProvider({
  children,
  demo = false,
}: {
  children: ReactNode;
  demo?: boolean;
}) {
  const { tier, wallet, recordProof, recordQuery } = useApp();
  const [rawInput, setRawInput] = useState("");
  const [sanitizedPrompt, setSanitizedPrompt] = useState("");
  const [guardrails, setGuardrails] = useState<GuardrailToggles>({
    piiStripping: true,
    financialMasking: true,
    enterpriseCompliance: tier === "institutional",
  });
  const [proofStatus, setProofStatus] = useState<ProofStatus>("idle");
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const walletConnected = wallet.status === "connected";
  const funded = hasFeeReserve(wallet.status === "connected" ? wallet.balances : undefined);
  const canShield = walletConnected && funded;
  const shieldGateHint = !walletConnected
    ? copy.action.walletRequiredHint
    : !funded
      ? copy.action.fundRequiredHint
      : wallet.provider === "gero"
        ? copy.action.geroSettleHint
        : null;

  useEffect(() => {
    if (canShield) return;
    setProof(null);
    setProofStatus("idle");
    setSanitizedPrompt("");
    setComposer("");
    if (!walletConnected) setSettleError(null);
  }, [canShield, walletConnected]);

  const setGuardrail = useCallback(
    (key: keyof GuardrailToggles, value: boolean) => {
      setGuardrails((current) => ({ ...current, [key]: value }));
      setProofStatus("idle");
      setProof(null);
      setSettleError(null);
    },
    [],
  );

  const processLocally = useCallback(async () => {
    if (!rawInput.trim() || busy || !canShield) return;

    setBusy(true);
    setProof(null);
    setSanitizedPrompt("");
    setSettleError(null);

    try {
      setProofStatus("scanning");
      const result = await runShield(rawInput, guardrails);

      setProofStatus("proving");
      const { submitGuardrail } = await import("@/lib/midnight-submit");
      const submitted = await submitGuardrail({
        originalHash: await sha256Hex(rawInput),
        cleanedHash: result.cleanedHash,
        packFlags: result.packFlags,
        network: wallet.network,
      });
      if (!submitted.ok) {
        setSettleError(submitted.error || copy.action.settleFailed);
        setProofStatus("error");
        return;
      }

      setProofStatus("attesting");
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
          walletAddress: wallet.address,
          txId: submitted.txId,
          contractAddress: submitted.contractAddress,
          network: submitted.network,
          status: "settled",
        }),
      });

      if (!response.ok) {
        setSettleError(copy.action.settleFailed);
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
      setComposer(result.text);
      recordProof(
        rawInput.length,
        result.findings.find((item) => item.kind === "compliance")?.count ?? 0,
      );
    } catch (error) {
      setSettleError(
        error instanceof Error ? error.message : copy.action.settleFailed,
      );
      setProofStatus("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    canShield,
    guardrails,
    rawInput,
    recordProof,
    wallet.address,
    wallet.network,
  ]);

  const sendChat = useCallback(async () => {
    const content = composer.trim();
    if (!content || proofStatus !== "shielded" || busy || !canShield) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content,
      sanitized: true,
      proofHash: proof?.hash,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setComposer("");
    setBusy(true);
    recordQuery();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, proofHash: proof?.hash }),
      });
      const data = (await response.json()) as { content?: string; error?: string };

      if (demo && response.status === 503) {
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: copy.demo.reply,
            walkthrough: true,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.content ?? data.error ?? copy.chat.noModel,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: demo ? copy.demo.reply : "Channel error. The shielded prompt was not sent.",
          walkthrough: demo,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, canShield, composer, demo, proof, proofStatus, recordQuery]);

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
      composer,
      setComposer,
      processLocally,
      sendChat,
      busy,
    }),
    [
      busy,
      canShield,
      composer,
      demo,
      guardrails,
      messages,
      processLocally,
      proof,
      proofStatus,
      rawInput,
      sanitizedPrompt,
      sendChat,
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

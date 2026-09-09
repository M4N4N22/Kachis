"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/lib/app-store";
import { copy } from "@/lib/copy";
import { runShield } from "@/lib/midnight";
import { sha256Hex } from "@/shared/commit";
import type {
  ChatMessage,
  GuardrailToggles,
  ProofRecord,
  ProofStatus,
} from "@/lib/types";

interface WorkspaceContextValue {
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
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

  const setGuardrail = useCallback(
    (key: keyof GuardrailToggles, value: boolean) => {
      setGuardrails((current) => ({ ...current, [key]: value }));
      setProofStatus("idle");
      setProof(null);
    },
    [],
  );

  const processLocally = useCallback(async () => {
    if (!rawInput.trim() || busy) return;

    setBusy(true);
    setProof(null);
    setSanitizedPrompt("");

    try {
      setProofStatus("scanning");
      const result = await runShield(rawInput, guardrails);

      let settlement: { txId?: string; contractAddress?: string; network?: string; note?: string } =
        {};
      if (wallet.status === "connected") {
        setProofStatus("proving");
        const { submitGuardrail } = await import("@/lib/midnight-submit");
        const submitted = await submitGuardrail({
          originalHash: await sha256Hex(rawInput),
          cleanedHash: result.cleanedHash,
          packFlags: result.packFlags,
          network: wallet.network,
        });
        if (submitted.ok) {
          settlement = {
            txId: submitted.txId,
            contractAddress: submitted.contractAddress,
            network: submitted.network,
          };
        } else {
          settlement = {
            note: copy.rail.settleFallback,
            network: wallet.network,
          };
        }
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
          walletAddress:
            wallet.status === "connected" ? wallet.address : undefined,
          txId: settlement.txId,
          contractAddress: settlement.contractAddress,
          network: settlement.network,
          status: settlement.txId ? "settled" : undefined,
          note: settlement.note,
        }),
      });

      if (!response.ok) {
        throw new Error("Notary rejected the public commitment.");
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
        status: attested.status,
        walletAddress: attested.walletAddress,
        note: attested.note,
        txId: attested.txId,
        contractAddress: attested.contractAddress,
        network: attested.network,
      };

      setSanitizedPrompt(result.text);
      setProof(record);
      setProofStatus("shielded");
      setComposer(result.text);
      recordProof(
        rawInput.length,
        result.findings.find((item) => item.kind === "compliance")?.count ?? 0,
      );
    } catch {
      setProofStatus("error");
    } finally {
      setBusy(false);
    }
  }, [busy, guardrails, rawInput, recordProof, wallet.address, wallet.network, wallet.status]);

  const sendChat = useCallback(async () => {
    const content = composer.trim();
    if (!content || proofStatus !== "shielded" || busy) return;

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
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.content ?? data.error ?? "No response.",
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: "Channel error. The shielded prompt was not sent.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, composer, proof, proofStatus, recordQuery]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
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
      composer,
      guardrails,
      messages,
      processLocally,
      proof,
      proofStatus,
      rawInput,
      sanitizedPrompt,
      sendChat,
      setGuardrail,
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

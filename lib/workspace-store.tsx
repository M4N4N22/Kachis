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
import {
  generateLocalProof,
  mockAssistantReply,
  sanitizeLocally,
} from "@/lib/midnight";
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

const STEPS: ProofStatus[] = ["scanning", "guarding", "proving", "attesting"];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { tier, recordProof, recordQuery } = useApp();
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
      for (const step of STEPS) {
        setProofStatus(step);
        await new Promise((resolve) => setTimeout(resolve, 380));
      }

      const { text, findings } = sanitizeLocally(rawInput, guardrails);
      const record = await generateLocalProof(findings);
      setSanitizedPrompt(text);
      setProof(record);
      setProofStatus("shielded");
      setComposer(text);
      recordProof(
        rawInput.length,
        findings.find((item) => item.kind === "compliance")?.count ?? 0,
      );
    } catch {
      setProofStatus("error");
    } finally {
      setBusy(false);
    }
  }, [busy, guardrails, rawInput, recordProof]);

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

    await new Promise((resolve) => setTimeout(resolve, 700));

    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: mockAssistantReply(content),
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, assistantMessage]);
    setBusy(false);
  }, [busy, composer, proof?.hash, proofStatus, recordQuery]);

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

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
import {
  SAMPLE_SENSITIVE_PROMPT,
  detectNerHits,
  highlightSensitive,
  preloadNer,
  restoreFromTokenMap,
  runShield,
  tokenizeCleanedPrompt,
  type CleanRevealToken,
  type HighlightSegment,
} from "@/lib/midnight";
import { hasFeeReserve } from "@/lib/midnight-wallet";
import { humanizeSettleError } from "@/lib/settle-feedback";
import { useByoc } from "@/lib/byoc-store";
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
import type { ShieldResult } from "@/shared/types";
import { toast } from "sonner";

const SETTLE_TOAST_ID = "kachis-settle";
const SCAN_TOAST_ID = "kachis-scan";
const SEND_TOAST_ID = "kachis-send";

function notifyError(title: string, description: string, id?: string) {
  toast.error(title, { id, description, duration: 5200 });
}

interface WorkspaceContextValue {
  demo: boolean;
  walletConnected: boolean;
  canShield: boolean;
  shieldGateHint: string | null;
  settleError: string | null;
  rawInput: string;
  setRawInput: (value: string) => void;
  sanitizedPrompt: string;
  highlightSegments: HighlightSegment[];
  revealTokens: CleanRevealToken[];
  guardrails: GuardrailToggles;
  setGuardrail: (key: keyof GuardrailToggles, value: boolean) => void;
  proofStatus: ProofStatus;
  proof: ProofRecord | null;
  messages: ChatMessage[];
  runScanner: () => Promise<void>;
  completeRewrite: () => void;
  settleShield: () => Promise<void>;
  sendShielded: () => Promise<void>;
  busy: boolean;
  scanning: boolean;
  settling: boolean;
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
  const { credential, ready: byocReady } = useByoc();
  const [rawInput, setRawInputState] = useState(demo ? SAMPLE_SENSITIVE_PROMPT : "");
  const [sanitizedPrompt, setSanitizedPrompt] = useState("");
  const [highlightSegments, setHighlightSegments] = useState<HighlightSegment[]>([]);
  const [revealTokens, setRevealTokens] = useState<CleanRevealToken[]>([]);
  const [pendingShield, setPendingShield] = useState<ShieldResult | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailToggles>(() =>
    defaultTogglesForTier(tier),
  );

  const [proofStatus, setProofStatus] = useState<ProofStatus>("idle");
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scanning, setScanning] = useState(false);
  const [settling, setSettling] = useState(false);
  const [sending, setSending] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  useEffect(() => {
    // Warm on-device NER while the workspace is open (soft-fails if unavailable).
    preloadNer();
  }, []);

  useEffect(() => {
    if (demo || wallet.status !== "connected") return;
    void import("@/lib/midnight-submit")
      .then((mod) => mod.warmSettleRuntime())
      .catch(() => undefined);
  }, [demo, wallet.status]);

  useEffect(() => {
    setGuardrails(defaultTogglesForTier(tier));
    setProofStatus("idle");
    setProof(null);
    setPendingShield(null);
    setSanitizedPrompt("");
    setHighlightSegments([]);
    setRevealTokens([]);
    setSettleError(null);
  }, [tier]);

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

  const resetScanState = useCallback(() => {
    setProofStatus("idle");
    setProof(null);
    setPendingShield(null);
    setSanitizedPrompt("");
    setHighlightSegments([]);
    setRevealTokens([]);
    setSettleError(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (demo || canShield) return;
    // Keep a local review if the user already scanned; only clear settled receipts.
    if (proofStatus === "shielded" || proofStatus === "proving" || proofStatus === "attesting") {
      setProof(null);
      setProofStatus(pendingShield ? "reviewed" : "idle");
      if (!pendingShield) {
        setSanitizedPrompt("");
        setHighlightSegments([]);
        setRevealTokens([]);
      }
      setMessages([]);
    }
    if (!liveWalletConnected) setSettleError(null);
  }, [canShield, demo, liveWalletConnected, pendingShield, proofStatus]);

  const setRawInput = useCallback(
    (value: string) => {
      setRawInputState(value);
      resetScanState();
    },
    [resetScanState],
  );

  const setGuardrail = useCallback(
    (key: keyof GuardrailToggles, value: boolean) => {
      setGuardrails((current) => ({ ...current, [key]: value }));
      resetScanState();
    },
    [resetScanState],
  );

  const runScanner = useCallback(async () => {
    if (!rawInput.trim() || scanning || settling || sending) return;

    const required = requiredPackForTier(tier);
    if (!togglesMeetRequired(guardrails, required)) {
      const message = copy.pack.required;
      setSettleError(message);
      setProofStatus("error");
      notifyError(copy.action.toastPackRequired, message, SCAN_TOAST_ID);
      return;
    }

    setScanning(true);
    setProof(null);
    setPendingShield(null);
    setSanitizedPrompt("");
    setMessages([]);
    setSettleError(null);
    setProofStatus("scanning");
    toast.dismiss(SETTLE_TOAST_ID);

    try {
      const extraHits = await detectNerHits(rawInput, guardrails);
      const highlights = highlightSensitive(rawInput, guardrails, { extraHits });
      setHighlightSegments(highlights);

      // Brief beat so the amber warn state is visible before rewrite.
      await delay(420);

      const result = await runShield(rawInput, guardrails, { extraHits });
      const tokens = tokenizeCleanedPrompt(result.text);

      setPendingShield(result);
      setSanitizedPrompt(result.text);
      setRevealTokens(tokens);
      setProofStatus("rewriting");
    } catch (error) {
      console.error("[kachis] runScanner failed", error);
      const message = copy.action.error;
      setSettleError(message);
      setProofStatus("error");
      notifyError(message, "Local scan did not finish. Try again.", SCAN_TOAST_ID);
    } finally {
      setScanning(false);
    }
  }, [guardrails, rawInput, scanning, sending, settling, tier]);

  const completeRewrite = useCallback(() => {
    let shouldToast = false;
    setProofStatus((current) => {
      if (current !== "rewriting") return current;
      shouldToast = true;
      return "reviewed";
    });
    if (shouldToast) {
      toast.success(copy.action.toastScanReady, {
        id: SCAN_TOAST_ID,
        description: copy.action.toastScanReadyBody,
      });
    }
  }, []);

  const settleShield = useCallback(async () => {
    if (!pendingShield || !sanitizedPrompt.trim() || settling || sending || scanning) return;
    if (!canShield) {
      const message = shieldGateHint ?? copy.action.walletRequiredHint;
      setSettleError(message);
      notifyError(copy.action.toastSettleErr, message, SETTLE_TOAST_ID);
      return;
    }

    setSettling(true);
    setSettleError(null);
    setMessages([]);
    setProofStatus("proving");
    toast.loading(copy.action.toastSettlePending, { id: SETTLE_TOAST_ID });

    const failSettle = (message: string) => {
      const friendly = humanizeSettleError(message);
      setSettleError(friendly);
      setProofStatus("error");
      notifyError(copy.action.toastSettleErr, friendly, SETTLE_TOAST_ID);
    };

    try {
      let submitted: {
        txId: string;
        contractAddress: string;
        network: string;
      };

      if (demo) {
        await delay(1100);
        setProofStatus("attesting");
        await delay(450);
        const digest = await sha256Hex(`${pendingShield.cleanedHash}:walkthrough`);
        submitted = {
          txId: `walkthrough_${digest.slice(2, 18)}`,
          contractAddress: "walkthrough",
          network: "walkthrough",
        };
      } else {
        const { submitGuardrail } = await import("@/lib/midnight-submit");
        const { getConnectedWalletApi } = await import("@/lib/midnight-wallet");
        if (!getConnectedWalletApi()) {
          failSettle(copy.action.reconnectWallet);
          return;
        }

        const live = await submitGuardrail({
          originalHash: await sha256Hex(rawInput),
          cleanedHash: pendingShield.cleanedHash,
          packFlags: pendingShield.packFlags,
          network: wallet.network,
          tier,
        });
        if (!live.ok) {
          console.error("[kachis] settle rejected", live);
          failSettle(live.error?.trim() || copy.action.settleFailed);
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
          cleanedHash: pendingShield.cleanedHash,
          binding: pendingShield.binding,
          packFlags: pendingShield.packFlags,
          findings: pendingShield.findings,
          attestedAt: pendingShield.attestedAt,
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
        let detail: string = copy.action.settleFailed;
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) detail = body.error;
        } catch {
          /* keep fallback */
        }
        // Wallet / Preprod already accepted the tx — keep the receipt in UI.
        if (!demo && submitted.txId) {
          const record: ProofRecord = {
            hash: pendingShield.cleanedHash,
            binding: pendingShield.binding,
            circuit: pendingShield.circuit,
            attestedAt: pendingShield.attestedAt,
            findings: pendingShield.findings,
            packFlags: pendingShield.packFlags,
            status: "settled",
            walletAddress: wallet.address,
            note: copy.action.settleLogFailed,
            txId: submitted.txId,
            contractAddress: submitted.contractAddress,
            network: submitted.network,
          };
          setProof(record);
          setProofStatus("shielded");
          recordProof(
            rawInput.length,
            pendingShield.findings.find((item) => item.kind === "secrets")?.count ?? 0,
          );
          toast.success(copy.action.toastSettleOk, {
            id: SETTLE_TOAST_ID,
            description: humanizeSettleError(detail),
          });
          return;
        }
        failSettle(humanizeSettleError(detail));
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
        hash: pendingShield.cleanedHash,
        binding: pendingShield.binding,
        circuit: pendingShield.circuit,
        attestedAt: pendingShield.attestedAt,
        findings: pendingShield.findings,
        packFlags: pendingShield.packFlags,
        ledgerId: attested.ledgerId,
        status: attested.status ?? "settled",
        walletAddress: attested.walletAddress,
        note: attested.note,
        txId: attested.txId ?? submitted.txId,
        contractAddress: attested.contractAddress ?? submitted.contractAddress,
        network: attested.network ?? submitted.network,
      };

      setProof(record);
      setProofStatus("shielded");
      recordProof(
        rawInput.length,
        pendingShield.findings.find((item) => item.kind === "secrets")?.count ?? 0,
      );
      toast.success(copy.action.toastSettleOk, {
        id: SETTLE_TOAST_ID,
        description: copy.action.toastSettleOkBody,
      });
    } catch (error) {
      console.error("[kachis] settleShield failed", error);
      failSettle(humanizeSettleError(error));
    } finally {
      setSettling(false);
    }
  }, [
    canShield,
    demo,
    pendingShield,
    rawInput,
    recordProof,
    sanitizedPrompt,
    scanning,
    sending,
    settling,
    shieldGateHint,
    tier,
    wallet.address,
    wallet.network,
  ]);

  const sendShielded = useCallback(async () => {
    // Must send the exact bytes that were hashed into cleanedHash — do not trim.
    const content = pendingShield?.text ?? sanitizedPrompt;
    if (
      !content.trim() ||
      proofStatus !== "shielded" ||
      settling ||
      sending ||
      scanning ||
      !canShield
    ) {
      return;
    }

    setSending(true);
    setMessages([]);
    recordQuery();
    toast.loading(copy.sanitized.sending, { id: SEND_TOAST_ID });

    try {
      if (demo) {
        await delay(700);
        const rawReply = copy.demo.reply;
        const tokenMap = pendingShield?.tokenMap ?? {};
        setMessages([
          {
            id: createId(),
            role: "assistant",
            content: restoreFromTokenMap(rawReply, tokenMap),
            source: "demo",
            walkthrough: true,
            restored: Object.keys(tokenMap).length > 0,
            createdAt: new Date().toISOString(),
          },
        ]);
        toast.success(copy.action.toastSendOk, { id: SEND_TOAST_ID });
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          proofHash: proof?.hash ?? pendingShield?.cleanedHash,
          mode: byocReady && credential ? "byoc" : "beta",
          byoc:
            byocReady && credential
              ? {
                  provider: credential.provider,
                  apiKey: credential.apiKey,
                  label: credential.label,
                  baseUrl: credential.baseUrl,
                  model: credential.model,
                }
              : undefined,
        }),
      });
      const data = (await response.json()) as {
        content?: string;
        error?: string;
        source?: "beta" | "byoc";
        provider?: string;
        label?: string;
        model?: string;
      };

      if (!response.ok || data.error) {
        const message = data.error ?? copy.response.error;
        setMessages([
          {
            id: createId(),
            role: "assistant",
            content: message,
            createdAt: new Date().toISOString(),
          },
        ]);
        notifyError(copy.action.toastSendErr, message, SEND_TOAST_ID);
        return;
      }

      const modelText = data.content ?? copy.response.noModel;
      const tokenMap = pendingShield?.tokenMap ?? {};
      setMessages([
        {
          id: createId(),
          role: "assistant",
          content: restoreFromTokenMap(modelText, tokenMap),
          source: data.source,
          provider: data.provider,
          label: data.label,
          model: data.model,
          restored: Object.keys(tokenMap).length > 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success(copy.action.toastSendOk, { id: SEND_TOAST_ID });
    } catch {
      const fallback = demo ? copy.demo.reply : copy.response.error;
      const tokenMap = pendingShield?.tokenMap ?? {};
      setMessages([
        {
          id: createId(),
          role: "assistant",
          content: demo
            ? restoreFromTokenMap(fallback, tokenMap)
            : fallback,
          source: demo ? "demo" : undefined,
          restored: demo && Object.keys(tokenMap).length > 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (!demo) {
        notifyError(copy.action.toastSendErr, copy.response.error, SEND_TOAST_ID);
      } else {
        toast.success(copy.action.toastSendOk, { id: SEND_TOAST_ID });
      }
    } finally {
      setSending(false);
    }
  }, [
    byocReady,
    canShield,
    credential,
    demo,
    pendingShield,
    proof?.hash,
    proofStatus,
    recordQuery,
    sanitizedPrompt,
    scanning,
    sending,
    settling,
  ]);

  const busy = scanning || settling;

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
      highlightSegments,
      revealTokens,
      guardrails,
      setGuardrail,
      proofStatus,
      proof,
      messages,
      runScanner,
      completeRewrite,
      settleShield,
      sendShielded,
      busy,
      scanning,
      settling,
      sending,
    }),
    [
      busy,
      canShield,
      completeRewrite,
      demo,
      guardrails,
      highlightSegments,
      messages,
      proof,
      proofStatus,
      rawInput,
      revealTokens,
      runScanner,
      sanitizedPrompt,
      scanning,
      sendShielded,
      sending,
      setGuardrail,
      setRawInput,
      settleError,
      settleShield,
      settling,
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

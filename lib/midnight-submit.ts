"use client";

// Force ledger WASM side-effect init before CostModel.initialCostModel().
import "@midnight-ntwrk/ledger-v8";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import {
  dappConnectorProofProvider,
  dappConnectorProvingProvider,
} from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  CostModel,
  Transaction,
  type FinalizedTransaction,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  createProofProvider as wrapProvingProvider,
  type MidnightProvider,
  type MidnightProviders,
  type ProofProvider,
  type WalletProvider,
  type ZKConfigProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { Contract } from "@/compact/managed/kachis-guardrail/contract/index.js";
import {
  createGuardrailPrivateState,
  witnesses,
  type GuardrailPrivateState,
} from "@/compact/witnesses";
import { hexToBytes } from "@/shared/commit";
import {
  createGuardrailPrivateStateProvider,
  isPrivateStateDecryptError,
  resetGuardrailPrivateStorage,
} from "@/lib/midnight-private-state";
import {
  getConnectedWalletApi,
  getConnectedWalletProviderId,
  preferredNetwork,
} from "@/lib/midnight-wallet";
import { copy } from "@/lib/copy";
import { humanizeSettleError } from "@/lib/settle-feedback";

const PRIVATE_STATE_ID = "kachisGuardrail";
const STORAGE_KEY_SANDBOX = "kachis.contractAddress.sandbox";
const STORAGE_KEY_INSTITUTIONAL = "kachis.contractAddress.institutional";
/** Legacy single key — migrated into sandbox slot when read. */
const STORAGE_KEY_LEGACY = "kachis.contractAddress";
const ARTIFACTS_PATH = "/zk/kachis-guardrail";

export type GuardrailSeatTier = "freelancer" | "institutional";

export type ShieldSubmitInput = {
  originalHash: string;
  cleanedHash: string;
  packFlags: number;
  network?: string;
  /** Which Preprod instance to use / deploy. Defaults to sandbox. */
  tier?: GuardrailSeatTier;
};

export type ShieldSubmitResult =
  | { ok: true; txId: string; contractAddress: string; network: string }
  | { ok: false; error: string };

function artifactsBase() {
  if (typeof window === "undefined") return "http://127.0.0.1:3000/zk/kachis-guardrail";
  return `${window.location.origin}${ARTIFACTS_PATH}`;
}

function proofServerUrl(config: { proverServerUri?: string } | undefined) {
  return (
    process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER_URL?.replace(/\/$/, "") ||
    config?.proverServerUri?.replace(/\/$/, "") ||
    "http://127.0.0.1:6300"
  );
}

function forceRedeploy() {
  const raw = process.env.NEXT_PUBLIC_KACHIS_FORCE_REDEPLOY?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function storageKeyFor(tier: GuardrailSeatTier) {
  return tier === "institutional" ? STORAGE_KEY_INSTITUTIONAL : STORAGE_KEY_SANDBOX;
}

function envAddressFor(tier: GuardrailSeatTier): string | undefined {
  if (tier === "institutional") {
    return (
      process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS_INSTITUTIONAL?.trim() ||
      process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim() ||
      undefined
    );
  }
  // Sandbox must not inherit the institutional pin.
  return process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS_SANDBOX?.trim() || undefined;
}

function storedContractAddress(tier: GuardrailSeatTier) {
  if (forceRedeploy()) return undefined;
  const fromEnv = envAddressFor(tier);
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return undefined;
  const keyed = window.localStorage.getItem(storageKeyFor(tier));
  if (keyed) return keyed;
  if (tier === "freelancer") {
    const legacy = window.localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!legacy) return undefined;
    // Do not reuse an institutional pin as the sandbox instance.
    const institutional =
      process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS_INSTITUTIONAL?.trim() ||
      process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim();
    if (institutional && legacy === institutional) return undefined;
    return legacy;
  }
  return undefined;
}

function persistContractAddress(tier: GuardrailSeatTier, address: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyFor(tier), address);
  if (tier === "freelancer") {
    window.localStorage.setItem(STORAGE_KEY_LEGACY, address);
  }
}

/** Drop remembered Preprod addresses so the next settle can deploy fresh. */
export function clearStoredContractAddress(tier?: GuardrailSeatTier) {
  if (typeof window === "undefined") return;
  if (!tier || tier === "freelancer") {
    window.localStorage.removeItem(STORAGE_KEY_SANDBOX);
    window.localStorage.removeItem(STORAGE_KEY_LEGACY);
  }
  if (!tier || tier === "institutional") {
    window.localStorage.removeItem(STORAGE_KEY_INSTITUTIONAL);
  }
}

async function artifactsReady() {
  if (typeof window === "undefined") return false;
  const marker = await fetch(`${artifactsBase()}/.compiled`, { method: "GET" });
  if (marker.ok) return true;
  const prover = await fetch(`${artifactsBase()}/keys/shield.prover`, { method: "HEAD" });
  return prover.ok;
}

function loadCostModel() {
  try {
    return CostModel.initialCostModel();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Midnight ledger WASM failed (${detail}). Stop the server and run \`npm run dev\` (webpack). Turbopack cannot initialize ledger CostModel.`,
    );
  }
}

function describeErrorPart(value: unknown): string | null {
  if (value instanceof Error) {
    const name = value.name && value.name !== "Error" ? value.name : "";
    const message = value.message?.trim() ?? "";
    if (name && message) return `${name}: ${message}`;
    if (message) return message;
    if (name) return name;
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === "object") {
    const record = value as { name?: unknown; message?: unknown; cause?: unknown };
    const name = typeof record.name === "string" ? record.name : "";
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (name || message) return [name, message].filter(Boolean).join(": ");
  }
  return null;
}

function formatSettleError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current != null && depth < 5) {
    const part = describeErrorPart(current);
    if (part) parts.push(part);

    if (current instanceof Error) {
      current = current.cause;
    } else if (current && typeof current === "object" && "cause" in current) {
      current = (current as { cause: unknown }).cause;
    } else if (!part) {
      try {
        const json = JSON.stringify(current);
        if (json && json !== "{}") parts.push(json);
        else parts.push(Object.prototype.toString.call(current));
      } catch {
        parts.push(String(current));
      }
      break;
    } else {
      break;
    }
    depth += 1;
  }
  return parts.filter(Boolean).join(" · ") || "Settlement failed (empty wallet error).";
}

function isBalanceUnimplemented(error: unknown) {
  const message = formatSettleError(error);
  return /balanceUnsealedTransaction/i.test(message) && /not yet implemented/i.test(message);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function isProofServerUrlFailure(error: unknown, proofUrl: string) {
  const message = formatSettleError(error);
  const host = (() => {
    try {
      return new URL(proofUrl).host;
    } catch {
      return "127.0.0.1:6300";
    }
  })();
  return (
    new RegExp(host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(message) ||
    /6300|proof.?server|proverServerUri|ECONNREFUSED/i.test(message) ||
    (/Failed to fetch|NetworkError|Load failed/i.test(message) &&
      /prove|proof/i.test(message))
  );
}

function isArtifactFetchFailure(error: unknown) {
  const message = formatSettleError(error);
  return (
    /zk\/kachis-guardrail|shield\.prover|verifierKey|\.zkir|key material/i.test(message) ||
    (/Failed to fetch/i.test(message) && /zk|prover|artifact/i.test(message))
  );
}

/** Contract settle needs wallet balancing. Gero still stubs this (planned). */
function walletCanBalanceContracts(providerId: string | undefined) {
  return providerId !== "gero";
}

function walletSupportsInWalletProving(providerId: string | undefined) {
  return providerId === "1am" || providerId === "gero" || providerId === "ctrl";
}

async function balanceWithWallet(api: ConnectedAPI, tx: { serialize: () => Uint8Array }) {
  if (typeof api.balanceUnsealedTransaction !== "function") {
    throw new Error(copy.action.geroBalanceUnsupported);
  }
  try {
    const { tx: balancedHex } = await api.balanceUnsealedTransaction(toHex(tx.serialize()), {
      payFees: true,
    });
    return Transaction.deserialize(
      "signature",
      "proof",
      "binding",
      fromHex(balancedHex),
    ) as FinalizedTransaction;
  } catch (error) {
    if (isBalanceUnimplemented(error)) {
      throw new Error(copy.action.geroBalanceUnsupported);
    }
    throw error;
  }
}

async function createWalletProofProvider(
  api: ConnectedAPI,
  zkConfigProvider: ZKConfigProvider<"shield">,
): Promise<ProofProvider> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await delay(350 * attempt);
    try {
      const costModel = loadCostModel();
      return await dappConnectorProofProvider<"shield">(api, zkConfigProvider, costModel);
    } catch (error) {
      lastError = error;
      try {
        const proving = await dappConnectorProvingProvider<"shield">(api, zkConfigProvider);
        return wrapProvingProvider(proving, loadCostModel());
      } catch (inner) {
        lastError = inner;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(copy.action.walletProvingUnavailable);
}

async function proofServerReachable(url: string) {
  try {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 1500);
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    globalThis.clearTimeout(timer);
    return response.ok || response.status === 404 || response.status === 405;
  } catch {
    return false;
  }
}

async function createProofProviderForWallet(
  api: ConnectedAPI,
  zkConfigProvider: ZKConfigProvider<"shield">,
  config: { proverServerUri?: string } | undefined,
): Promise<ProofProvider> {
  const remote = proofServerUrl(config);
  const providerId = getConnectedWalletProviderId();
  const hasWalletProver = typeof api.getProvingProvider === "function";

  // Prefer in-wallet proving. Never silently fall through to localhost:6300 for
  // 1AM / Gero — that produces a false "proof server unreachable" on first settle.
  if (hasWalletProver) {
    try {
      return await createWalletProofProvider(api, zkConfigProvider);
    } catch (error) {
      if (walletSupportsInWalletProving(providerId)) {
        throw error instanceof Error
          ? error
          : new Error(copy.action.walletProvingUnavailable);
      }
      // Lace (and unknown) may still use an HTTP proof server when wallet prove fails.
      if (!(await proofServerReachable(remote))) {
        throw new Error(copy.action.proofServerUnreachable);
      }
      console.warn(
        "[kachis] wallet proving unavailable; falling back to HTTP proof server",
        error,
      );
      return httpClientProofProvider<"shield">(remote, zkConfigProvider);
    }
  }

  if (!(await proofServerReachable(remote))) {
    throw new Error(copy.action.proofServerUnreachable);
  }
  return httpClientProofProvider<"shield">(remote, zkConfigProvider);
}

/** Warm ledger WASM + CostModel so the first settle is not a cold miss. */
export async function warmSettleRuntime() {
  if (typeof window === "undefined") return;
  try {
    await import("@midnight-ntwrk/ledger-v8");
    loadCostModel();
  } catch (error) {
    console.warn("[kachis] settle runtime warm failed", error);
  }
  void artifactsReady().catch(() => undefined);
}

function compiledGuardrail() {
  return CompiledContract.make("kachis-guardrail", Contract as never).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets("compact/managed/kachis-guardrail"),
  ) as never;
}

/**
 * Compact `constructor(initialRequiredPack)` only works after recompile.
 * Stale empty-ctor managed JS expects `initialState(context)` only — passing
 * `args: [n]` becomes a second parameter and throws "expected 1, received 2".
 */
function managedSupportsRequiredPackCtor(): boolean {
  const text = Function.prototype.toString.call(Contract.prototype.initialState);
  return /length !== 2/.test(text) || /expected 2 argument/.test(text);
}

/** On-chain constructor bitmask for this seat. Sandbox = 0, institutional = 31. */
function requiredPackForDeploy(tier: GuardrailSeatTier): number {
  if (tier === "institutional") {
    const raw =
      process.env.NEXT_PUBLIC_KACHIS_REQUIRED_PACK_INSTITUTIONAL?.trim() ||
      process.env.NEXT_PUBLIC_KACHIS_REQUIRED_PACK?.trim() ||
      "31";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed & 0xff : 31;
  }
  const raw = process.env.NEXT_PUBLIC_KACHIS_REQUIRED_PACK_SANDBOX?.trim() || "0";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed & 0xff : 0;
}

function deployConstructorArgs(tier: GuardrailSeatTier): bigint[] | undefined {
  if (!managedSupportsRequiredPackCtor()) {
    console.warn(
      "[kachis] managed artifacts still have an empty constructor. Recompile Compact, then redeploy. Deploying without constructor args.",
    );
    return undefined;
  }
  return [BigInt(requiredPackForDeploy(tier))];
}

async function createProviders(api: ConnectedAPI, network: string) {
  setNetworkId(network);
  let config: Awaited<ReturnType<ConnectedAPI["getConfiguration"]>> | undefined;
  try {
    config = await api.getConfiguration();
    if (config.networkId) setNetworkId(config.networkId);
  } catch {
    /* Fall back to public Preprod endpoints. */
  }

  const indexerUri =
    config?.indexerUri ?? "https://indexer.preprod.midnight.network/api/v4/graphql";
  const indexerWsUri =
    config?.indexerWsUri ?? "wss://indexer.preprod.midnight.network/api/v4/graphql/ws";

  if (typeof api.hintUsage === "function") {
    // Fire-and-forget: do not block provider construction on permission UX.
    void api
      .hintUsage(["getProvingProvider", "balanceUnsealedTransaction", "submitTransaction"])
      .catch(() => undefined);
  }

  const zkConfigProvider = new FetchZkConfigProvider<"shield">(artifactsBase(), fetch.bind(window));
  const proofProvider = await createProofProviderForWallet(api, zkConfigProvider, config);

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();
  const unshielded = await api.getUnshieldedAddress().catch(() => undefined);
  const accountId =
    unshielded?.unshieldedAddress ||
    shieldedCoinPublicKey ||
    "kachis-session";

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx) => balanceWithWallet(api, tx),
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      await api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  const providers = {
    privateStateProvider: createGuardrailPrivateStateProvider<
      typeof PRIVATE_STATE_ID,
      GuardrailPrivateState
    >(accountId),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  } as MidnightProviders<"shield", typeof PRIVATE_STATE_ID, GuardrailPrivateState>;

  return { providers, network: config?.networkId ?? network };
}

export async function submitGuardrail(input: ShieldSubmitInput): Promise<ShieldSubmitResult> {
  const api = getConnectedWalletApi();
  if (!api) {
    return { ok: false, error: "Connect a Midnight wallet to settle." };
  }

  const providerId = getConnectedWalletProviderId();
  if (!walletCanBalanceContracts(providerId)) {
    return { ok: false, error: copy.action.geroBalanceUnsupported };
  }

  try {
    if (!(await artifactsReady())) {
      return {
        ok: false,
        error: "Guardrail compile artifacts are missing. Run compact compile in WSL, then refresh.",
      };
    }

    const tier: GuardrailSeatTier = input.tier === "institutional" ? "institutional" : "freelancer";
    const requiredOnChain = requiredPackForDeploy(tier);
    // Compact uses exact equality: packFlags == requiredPack (when required != 0).
    if (requiredOnChain !== 0 && input.packFlags !== requiredOnChain) {
      return {
        ok: false,
        error: copy.action.requiredPackNotAttested,
      };
    }

    const network = input.network?.trim() || preferredNetwork();
    const cleaned = hexToBytes(input.cleanedHash);
    const compiledContract = compiledGuardrail();
    // Drop legacy IndexedDB ciphertext from older builds (best-effort).
    await resetGuardrailPrivateStorage().catch(() => undefined);

    const { providers, network: resolvedNetwork } = await createProviders(api, network);
    const initialPrivateState = createGuardrailPrivateState(hexToBytes(input.originalHash));

    let address = storedContractAddress(tier);
    if (!address) {
      clearStoredContractAddress(tier);
      const deployOpts: Record<string, unknown> = {
        compiledContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState,
      };
      const ctorArgs = deployConstructorArgs(tier);
      if (ctorArgs) {
        deployOpts.args = ctorArgs;
      }
      console.info(
        `[kachis] deploying fresh guardrail (${tier})…`,
        ctorArgs ? `args=${ctorArgs.map(String).join(",")}` : "(no constructor args)",
      );
      const deployed = await deployContract(providers as never, deployOpts as never);
      address = deployed.deployTxData.public.contractAddress;
      persistContractAddress(tier, address);
      console.info(`[kachis] deployed ${tier} guardrail at`, address);
    } else {
      console.info(`[kachis] reusing ${tier} guardrail contract`, address);
    }

    const found = await findDeployedContract(providers as never, {
      compiledContract,
      contractAddress: address,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState,
    } as never);

    const call = await found.callTx.shield(cleaned, BigInt(input.packFlags));
    const txId = call.public.txId ?? call.public.txHash ?? "";
    if (!txId) {
      return { ok: false, error: "Wallet submitted but did not return a settlement id." };
    }
    return { ok: true, txId, contractAddress: address, network: resolvedNetwork };
  } catch (error) {
    console.error("[kachis] submitGuardrail failed", error);
    if (isBalanceUnimplemented(error)) {
      return { ok: false, error: copy.action.geroBalanceUnsupported };
    }
    const remote = proofServerUrl(undefined);
    if (isProofServerUrlFailure(error, remote)) {
      return { ok: false, error: copy.action.proofServerUnreachable };
    }
    if (isArtifactFetchFailure(error)) {
      return { ok: false, error: copy.action.settleArtifactsMissing };
    }
    if (isPrivateStateDecryptError(error)) {
      await resetGuardrailPrivateStorage().catch(() => undefined);
      return { ok: false, error: copy.action.privateStateCorrupt };
    }
    return { ok: false, error: humanizeSettleError(error) };
  }
}

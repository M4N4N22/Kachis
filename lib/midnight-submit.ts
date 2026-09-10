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

const PRIVATE_STATE_ID = "kachisGuardrail";
const STORAGE_KEY = "kachis.contractAddress";
const ARTIFACTS_PATH = "/zk/kachis-guardrail";

export type ShieldSubmitInput = {
  originalHash: string;
  cleanedHash: string;
  packFlags: number;
  network?: string;
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

function storedContractAddress() {
  const fromEnv = process.env.NEXT_PUBLIC_KACHIS_CONTRACT_ADDRESS?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
}

function persistContractAddress(address: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, address);
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

function isProofFetchFailure(error: unknown) {
  const message = formatSettleError(error);
  return (
    /Failed to fetch/i.test(message) ||
    (/prove/i.test(message) && /fetch/i.test(message)) ||
    /ECONNREFUSED/i.test(message) ||
    /NetworkError/i.test(message) ||
    /Load failed/i.test(message)
  );
}

/** Contract settle needs wallet balancing. Gero still stubs this (planned). */
function walletCanBalanceContracts(providerId: string | undefined) {
  return providerId !== "gero";
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

async function createProofProviderForWallet(
  api: ConnectedAPI,
  zkConfigProvider: ZKConfigProvider<"shield">,
  config: { proverServerUri?: string } | undefined,
): Promise<ProofProvider> {
  const remote = proofServerUrl(config);

  // Prefer wallet proving (Lace / Gero Cloud) when available.
  if (typeof api.getProvingProvider === "function") {
    try {
      const costModel = loadCostModel();
      return await dappConnectorProofProvider<"shield">(api, zkConfigProvider, costModel);
    } catch {
      try {
        const proving = await dappConnectorProvingProvider<"shield">(api, zkConfigProvider);
        return wrapProvingProvider(proving, loadCostModel());
      } catch {
        /* Fall through to HTTP proof server / Gero cloud URI. */
      }
    }
  }

  return httpClientProofProvider<"shield">(remote, zkConfigProvider);
}

function compiledGuardrail() {
  return CompiledContract.make("kachis-guardrail", Contract as never).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets("compact/managed/kachis-guardrail"),
  ) as never;
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
    await api
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

    const network = input.network?.trim() || preferredNetwork();
    const cleaned = hexToBytes(input.cleanedHash);
    const compiledContract = compiledGuardrail();
    // Drop legacy IndexedDB ciphertext from older builds (best-effort).
    await resetGuardrailPrivateStorage().catch(() => undefined);

    const { providers, network: resolvedNetwork } = await createProviders(api, network);
    const initialPrivateState = createGuardrailPrivateState(hexToBytes(input.originalHash));

    let address = storedContractAddress();
    if (!address) {
      const deployed = await deployContract(providers as never, {
        compiledContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState,
      } as never);
      address = deployed.deployTxData.public.contractAddress;
      persistContractAddress(address);
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
    if (isProofFetchFailure(error)) {
      return { ok: false, error: copy.action.proofServerUnreachable };
    }
    if (isPrivateStateDecryptError(error)) {
      await resetGuardrailPrivateStorage().catch(() => undefined);
      return { ok: false, error: copy.action.privateStateCorrupt };
    }
    return { ok: false, error: formatSettleError(error) };
  }
}

"use client";

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
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
import type {
  MidnightProvider,
  MidnightProviders,
  ProofProvider,
  WalletProvider,
  ZKConfigProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { Contract } from "@/compact/managed/kachis-guardrail/contract/index.js";
import {
  createGuardrailPrivateState,
  witnesses,
  type GuardrailPrivateState,
} from "@/compact/witnesses";
import { hexToBytes } from "@/shared/commit";
import { createGuardrailPrivateStateProvider } from "@/lib/midnight-private-state";
import { getConnectedWalletApi, preferredNetwork } from "@/lib/midnight-wallet";

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

async function createProofProvider(
  api: ConnectedAPI,
  zkConfigProvider: ZKConfigProvider<"shield">,
  config: { proverServerUri?: string } | undefined,
): Promise<ProofProvider> {
  const costModel = CostModel.initialCostModel();
  if (typeof api.getProvingProvider === "function") {
    try {
      return await dappConnectorProofProvider<"shield">(api, zkConfigProvider, costModel);
    } catch {
      /* Lace proving unavailable — fall through to the local proof server. */
    }
  }
  return httpClientProofProvider<"shield">(proofServerUrl(config), zkConfigProvider);
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
  const proofProvider = await createProofProvider(api, zkConfigProvider, config);

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();
  const unshielded = await api.getUnshieldedAddress().catch(() => undefined);
  const accountId =
    unshielded?.unshieldedAddress ||
    shieldedCoinPublicKey ||
    "kachis-session";

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx) => {
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(toHex(tx.serialize()), {});
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(balancedHex),
      ) as FinalizedTransaction;
    },
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

  try {
    if (!(await artifactsReady())) {
      return {
        ok: false,
        error: "Guardrail compile artifacts are missing. Run compact compile in WSL, then refresh.",
      };
    }

    const network = input.network?.trim() || preferredNetwork();
    const { providers, network: resolvedNetwork } = await createProviders(api, network);
    const compiledContract = compiledGuardrail();
    const initialPrivateState = createGuardrailPrivateState(hexToBytes(input.originalHash));
    const cleaned = hexToBytes(input.cleanedHash);

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

    const call = await found.callTx.shield(cleaned, input.packFlags);
    const txId = call.public.txId ?? call.public.txHash ?? "";
    if (!txId) {
      return { ok: false, error: "Wallet submitted but did not return a settlement id." };
    }
    return { ok: true, txId, contractAddress: address, network: resolvedNetwork };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settlement failed.";
    return { ok: false, error: message };
  }
}

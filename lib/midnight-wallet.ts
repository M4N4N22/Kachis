import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import "@midnight-ntwrk/dapp-connector-api";
import type { WalletBalances } from "@/lib/types";

export type MidnightNetworkId = "undeployed" | "preview" | "preprod" | "mainnet";

export type KnownWalletId = "lace" | "gero" | "1am" | "ctrl";

export type DiscoveredWallet = InitialAPI & {
  key: string;
  knownId?: KnownWalletId;
};

const KNOWN: {
  id: KnownWalletId;
  name: string;
  hint: string;
  aliases: string[];
}[] = [
  {
    id: "lace",
    name: "Lace",
    hint: "Chrome · Midnight dApp connector",
    aliases: ["mnlace", "lace", "io.lace", "io.iog.lace", "iohk.lace"],
  },
  {
    id: "gero",
    name: "Gero",
    hint: "Chrome · feature-detect Midnight connector",
    aliases: ["gero", "gerowallet", "mngero", "io.gerowallet"],
  },
  {
    id: "1am",
    name: "1AM",
    hint: "Chrome / Firefox · Midnight-native",
    aliases: ["1am", "oneam", "io.1am"],
  },
  {
    id: "ctrl",
    name: "Ctrl",
    hint: "Chrome · partial dApp connector",
    aliases: ["ctrl", "xdefi", "ctrlwallet"],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function fieldMatchesAlias(field: string | undefined, alias: string) {
  if (!field) return false;
  const value = normalize(field);
  const needle = normalize(alias);
  if (!value || !needle) return false;
  if (value === needle) return true;
  if (value.startsWith(`${needle}.`) || value.endsWith(`.${needle}`) || value.includes(`.${needle}.`)) {
    return true;
  }
  return new RegExp(`(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`).test(
    value,
  );
}

function knownIdFor(wallet: { key?: string; rdns?: string; name?: string }): KnownWalletId | undefined {
  return KNOWN.find((entry) =>
    entry.aliases.some(
      (alias) =>
        fieldMatchesAlias(wallet.key, alias) ||
        fieldMatchesAlias(wallet.rdns, alias) ||
        fieldMatchesAlias(wallet.name, alias),
    ),
  )?.id;
}

function isWalletApi(value: unknown): value is InitialAPI {
  return Boolean(value) && typeof value === "object" && typeof (value as InitialAPI).connect === "function";
}

function displayName(wallet: InitialAPI, key: string) {
  return typeof wallet.name === "string" && wallet.name.trim() ? wallet.name : key;
}

/** Scan `window.midnight` — v4 wallets inject under UUID keys, not only `mnLace`. */
export function listInjectedWallets(): DiscoveredWallet[] {
  if (typeof window === "undefined" || !window.midnight) return [];

  const wallets: DiscoveredWallet[] = [];
  for (const [key, value] of Object.entries(window.midnight)) {
    if (!isWalletApi(value)) continue;
    wallets.push({
      key,
      knownId: knownIdFor({ key, rdns: value.rdns, name: value.name }),
      name: displayName(value, key),
      rdns: typeof value.rdns === "string" ? value.rdns : "",
      icon: typeof value.icon === "string" ? value.icon : "",
      apiVersion: typeof value.apiVersion === "string" ? value.apiVersion : "0.0.0",
      connect: (networkId: string) => value.connect(networkId),
    });
  }
  return wallets;
}

export function findInjectedWallet(providerId: string): InitialAPI | undefined {
  const midnight = typeof window !== "undefined" ? window.midnight : undefined;
  if (!midnight) return undefined;

  const direct = midnight[providerId];
  if (isWalletApi(direct) && knownIdFor({ key: providerId, rdns: direct.rdns, name: direct.name }) === providerId) {
    return direct;
  }

  for (const [key, value] of Object.entries(midnight)) {
    if (!isWalletApi(value)) continue;
    if (knownIdFor({ key, rdns: value.rdns, name: value.name }) === providerId) {
      return value;
    }
  }

  return undefined;
}

export function walletAvailable(providerId?: string) {
  if (providerId) return Boolean(findInjectedWallet(providerId));
  return listInjectedWallets().length > 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const ZERO = BigInt(0);
const TEN = BigInt(10);
const NIGHT_DECIMALS = 6;
const DUST_DECIMALS = 15;

function asBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  return undefined;
}

function extractAmount(value: unknown): bigint | undefined {
  const direct = asBigInt(value);
  if (direct !== undefined) return direct;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return asBigInt(record.balance) ?? asBigInt(record.amount) ?? asBigInt(record.value);
}

function isNativeTokenType(key: string) {
  if (/night|native/i.test(key)) return true;
  const hex = key.replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "");
  return hex.length > 0 && /^0+$/i.test(hex);
}

function sumTokenRecord(record: unknown): bigint {
  if (!record || typeof record !== "object") return ZERO;
  const entries = Object.entries(record as Record<string, unknown>);
  const named = entries.find(([key]) => isNativeTokenType(key));
  if (named) {
    const amount = extractAmount(named[1]);
    if (amount !== undefined) return amount;
  }
  if (entries.length === 1) {
    return extractAmount(entries[0][1]) ?? ZERO;
  }
  return entries.reduce((total, [, value]) => total + (extractAmount(value) ?? ZERO), ZERO);
}

/** NIGHT = 10^6 stars. DUST = 10^15 specks. */
export function formatTokenAmount(value: bigint, decimals = NIGHT_DECIMALS) {
  const negative = value < ZERO;
  const amount = negative ? -value : value;
  const base = TEN ** BigInt(decimals);
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  const text = fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return negative ? `-${text}` : text;
}

async function readWalletBalances(api: ConnectedAPI): Promise<WalletBalances | undefined> {
  const [unshielded, shielded, dust] = await Promise.allSettled([
    typeof api.getUnshieldedBalances === "function"
      ? withTimeout(api.getUnshieldedBalances(), 8_000, "unshielded timeout")
      : Promise.reject(),
    typeof api.getShieldedBalances === "function"
      ? withTimeout(api.getShieldedBalances(), 8_000, "shielded timeout")
      : Promise.reject(),
    typeof api.getDustBalance === "function"
      ? withTimeout(api.getDustBalance(), 8_000, "dust timeout")
      : Promise.reject(),
  ]);

  const dustValue =
    dust.status === "fulfilled"
      ? {
          balance: extractAmount((dust.value as { balance?: unknown }).balance) ?? ZERO,
          cap: extractAmount((dust.value as { cap?: unknown }).cap) ?? ZERO,
        }
      : null;

  const hasAny =
    unshielded.status === "fulfilled" ||
    shielded.status === "fulfilled" ||
    dustValue !== null;
  if (!hasAny) return undefined;

  return {
    unshielded:
      unshielded.status === "fulfilled"
        ? formatTokenAmount(sumTokenRecord(unshielded.value))
        : "—",
    shielded:
      shielded.status === "fulfilled" ? formatTokenAmount(sumTokenRecord(shielded.value)) : "—",
    dust: dustValue ? formatTokenAmount(dustValue.balance, DUST_DECIMALS) : "—",
    dustCap: dustValue ? formatTokenAmount(dustValue.cap, DUST_DECIMALS) : "—",
  };
}

function asAddress(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of [
    "unshieldedAddress",
    "shieldedAddress",
    "dustAddress",
    "address",
  ]) {
    const next = record[key];
    if (typeof next === "string" && next.length > 0) return next;
  }
  return undefined;
}

async function readUnshieldedAddress(api: ConnectedAPI): Promise<string> {
  const readers: Array<() => Promise<unknown>> = [];
  if (typeof api.getUnshieldedAddress === "function") {
    readers.push(() => api.getUnshieldedAddress());
  }
  if (typeof api.getDustAddress === "function") {
    readers.push(() => api.getDustAddress());
  }
  if (typeof api.getShieldedAddresses === "function") {
    readers.push(() => api.getShieldedAddresses());
  }

  const settled = await Promise.allSettled(
    readers.map((read) => withTimeout(read(), 8_000, "address timeout")),
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      const address = asAddress(result.value);
      if (address) return address;
    }
  }

  throw new Error(
    "Wallet approved but did not return an address. Confirm Lace is unlocked, synced, and on Preprod.",
  );
}

const NETWORK_LABELS: Record<string, string> = {
  mainnet: "Mainnet",
  preprod: "Preprod",
  preview: "Preview",
  undeployed: "Undeployed",
  testnet: "Testnet",
  devnet: "Devnet",
};

export function parseNetworkFromAddress(address: string | undefined): string | undefined {
  if (!address) return undefined;
  const tagged = address.match(/^mn_(?:shield-addr|dust|addr)_([a-z0-9]+)1/i);
  if (tagged?.[1]) return tagged[1].toLowerCase();
  if (/^mn_(?:shield-addr|dust|addr)1/i.test(address)) return "mainnet";
  return undefined;
}

export function preferredNetwork(): MidnightNetworkId {
  return (
    (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK as MidnightNetworkId | undefined) ??
    "preprod"
  );
}

export function resolveNetworkId(
  reported: string | undefined,
  address?: string,
  requested?: string,
): string {
  const fromWallet = reported?.trim();
  if (fromWallet) return fromWallet;
  return parseNetworkFromAddress(address) ?? requested?.trim() ?? preferredNetwork();
}

export function displayNetworkLabel(networkId: string | undefined): string {
  const raw = networkId?.trim();
  if (!raw) return "Unknown";
  return NETWORK_LABELS[raw.toLowerCase()] ?? raw;
}

export function isMainnetNetwork(networkId: string | undefined): boolean {
  return (networkId ?? "").trim().toLowerCase() === "mainnet";
}

/** Mainnet: NIGHT. Preview / Preprod / undeployed / anything else: tNIGHT. */
export function nightAsset(networkId: string | undefined): "NIGHT" | "tNIGHT" {
  return isMainnetNetwork(networkId) ? "NIGHT" : "tNIGHT";
}

export function dustAsset(networkId: string | undefined): "DUST" | "tDUST" {
  return isMainnetNetwork(networkId) ? "DUST" : "tDUST";
}

/** Call `connect()` in the click handler — do not await anything first (Lace pop-up). */
export function startWalletConnect(providerId: string) {
  const initial = findInjectedWallet(providerId);
  if (!initial) {
    throw new Error(missingWalletMessage(providerId));
  }
  const network = preferredNetwork();
  return {
    initial,
    network,
    pending: initial.connect(network),
  };
}

export type WalletConnectSession = ReturnType<typeof startWalletConnect>;

let activeConnectedApi: ConnectedAPI | undefined;

export async function finishWalletConnect(session: WalletConnectSession) {
  const connected = await withTimeout(
    session.pending,
    90_000,
    "Wallet did not respond. Check the Lace pop-up — it is often behind this window.",
  );
  activeConnectedApi = connected;
  const address = await readUnshieldedAddress(connected);
  let reported: string | undefined;
  try {
    if (typeof connected.getConnectionStatus === "function") {
      const status = await withTimeout(
        connected.getConnectionStatus(),
        4_000,
        "status timeout",
      );
      if (status.status === "connected" && status.networkId) {
        reported = status.networkId;
      }
    }
  } catch {
    /* Address can still name the network. */
  }
  const network = resolveNetworkId(reported, address, session.network);
  const balances = await readWalletBalances(connected).catch(() => undefined);
  return {
    address,
    network,
    name: session.initial.name,
    rdns: session.initial.rdns,
    balances,
  };
}

export async function refreshConnectedBalances() {
  if (!activeConnectedApi) return undefined;
  return readWalletBalances(activeConnectedApi);
}

export function getConnectedWalletApi() {
  return activeConnectedApi;
}

export function clearConnectedWalletApi() {
  activeConnectedApi = undefined;
}

export function missingWalletMessage(providerId: string) {
  const injected = listInjectedWallets();
  const label = KNOWN.find((entry) => entry.id === providerId)?.name ?? providerId;
  if (injected.length === 0) {
    return `${label} was not detected on this page. Unlock the extension, enable Midnight, then refresh.`;
  }
  const names = injected.map((wallet) => wallet.name).join(", ");
  return `${label} was not among the detected connectors (${names}). Choose a detected wallet.`;
}

/** @deprecated Use listInjectedWallets / connectMidnightWallet. */
export const laceAvailable = () => walletAvailable("lace");
export const connectLace = async (network: MidnightNetworkId = "preprod") => {
  const session = startWalletConnect("lace");
  void network;
  return finishWalletConnect(session);
};

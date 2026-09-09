import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import "@midnight-ntwrk/dapp-connector-api";
import type { WalletBalances } from "@/lib/types";

export type MidnightNetworkId = "undeployed" | "preview" | "preprod" | "mainnet";

export type KnownWalletId = "lace" | "gero" | "1am" | "ctrl";

export type DiscoveredWallet = InitialAPI & {
  key: string;
  knownId?: KnownWalletId;
};

type WalletProviderId = KnownWalletId;

type ActiveWalletSession = {
  providerId: WalletProviderId;
  network: string;
  api: ConnectedAPI;
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

/** Parse wallet-reported token amounts across Lace/Gero/1AM payload shapes. */
function asBigInt(value: unknown, decimals = 0): bigint | undefined {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value) && decimals > 0) {
      return asBigInt(value.toFixed(decimals), decimals);
    }
    return BigInt(Math.trunc(value));
  }
  if (typeof value !== "string") return undefined;

  const raw = value.trim().replace(/,/g, "");
  if (!raw) return undefined;
  if (/^0x[0-9a-f]+$/i.test(raw)) {
    try {
      return BigInt(raw);
    } catch {
      return undefined;
    }
  }
  if (/^-?\d+$/.test(raw)) return BigInt(raw);
  if (decimals > 0 && /^-?\d+\.\d+$/.test(raw)) {
    const negative = raw.startsWith("-");
    const unsigned = negative ? raw.slice(1) : raw;
    const [wholePart, fractionPart = ""] = unsigned.split(".");
    const frac = `${fractionPart}${"0".repeat(decimals)}`.slice(0, decimals);
    const scaled = BigInt(wholePart) * TEN ** BigInt(decimals) + BigInt(frac || "0");
    return negative ? -scaled : scaled;
  }
  return undefined;
}

function extractAmount(value: unknown, decimals = 0, depth = 0): bigint | undefined {
  if (depth > 4) return undefined;
  const direct = asBigInt(value, decimals);
  if (direct !== undefined) return direct;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of [
    "balance",
    "amount",
    "value",
    "available",
    "current",
    "free",
    "dust",
    "dustBalance",
    "generated",
  ]) {
    if (!(key in record)) continue;
    const nested = extractAmount(record[key], decimals, depth + 1);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function extractDustPair(value: unknown): { balance: bigint; cap: bigint } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const balance =
    extractAmount(record.balance, DUST_DECIMALS) ??
    extractAmount(record.dustBalance, DUST_DECIMALS) ??
    extractAmount(record.available, DUST_DECIMALS) ??
    extractAmount(record.current, DUST_DECIMALS) ??
    extractAmount(record.dust, DUST_DECIMALS);

  const cap =
    extractAmount(record.cap, DUST_DECIMALS) ??
    extractAmount(record.dustCap, DUST_DECIMALS) ??
    extractAmount(record.max, DUST_DECIMALS) ??
    extractAmount(record.maximum, DUST_DECIMALS) ??
    extractAmount(record.limit, DUST_DECIMALS);

  if (balance === undefined && cap === undefined) return null;
  return {
    balance: balance ?? ZERO,
    cap: cap ?? ZERO,
  };
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

/** JSON-safe dump for wallet payloads (bigint → string). */
function serializeProbe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map(serializeProbe);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeProbe(entry);
    }
    return out;
  }
  return value;
}

function probeWalletBalances(payload: Record<string, unknown>) {
  const body = serializeProbe(payload);
  console.log("[wallet-probe]", body);
  if (typeof window === "undefined") return;
  void fetch("/api/debug/wallet-balances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

async function readWalletBalances(
  api: ConnectedAPI,
  meta?: { providerId?: string; network?: string },
): Promise<WalletBalances | undefined> {
  const hasGetDust = typeof api.getDustBalance === "function";
  const apiMethods = Object.keys(api as object).filter(
    (key) => typeof (api as Record<string, unknown>)[key] === "function",
  );

  const [unshielded, shielded, dust] = await Promise.allSettled([
    typeof api.getUnshieldedBalances === "function"
      ? withTimeout(api.getUnshieldedBalances(), 8_000, "unshielded timeout")
      : Promise.reject(new Error("getUnshieldedBalances missing")),
    typeof api.getShieldedBalances === "function"
      ? withTimeout(api.getShieldedBalances(), 8_000, "shielded timeout")
      : Promise.reject(new Error("getShieldedBalances missing")),
    hasGetDust
      ? withTimeout(api.getDustBalance(), 8_000, "dust timeout")
      : Promise.reject(new Error("getDustBalance missing")),
  ]);

  const altRaw: Record<string, unknown> = {};
  const altReaders = ["getDustBalances", "getFeeReserve", "dustBalance", "getDustAddress"] as const;
  for (const name of altReaders) {
    const fn = (api as Record<string, unknown>)[name];
    if (typeof fn !== "function") continue;
    try {
      altRaw[name] = await withTimeout(
        Promise.resolve((fn as () => unknown).call(api)),
        8_000,
        `${name} timeout`,
      );
    } catch (error) {
      altRaw[name] = error instanceof Error ? error.message : String(error);
    }
  }

  let dustValue =
    dust.status === "fulfilled" ? extractDustPair(dust.value) : null;

  // Some wallets expose dust under alternate method names or return empty objects.
  if (!dustValue || (dustValue.balance === ZERO && dustValue.cap === ZERO)) {
    for (const name of ["getDustBalances", "getFeeReserve", "dustBalance"] as const) {
      const raw = altRaw[name];
      if (raw === undefined) continue;
      const parsed = extractDustPair(raw);
      if (parsed && (parsed.balance > ZERO || parsed.cap > ZERO)) {
        dustValue = parsed;
        break;
      }
    }
  }

  // Last resort: scan unshielded token map for dust-like keys.
  if (
    (!dustValue || (dustValue.balance === ZERO && dustValue.cap === ZERO)) &&
    unshielded.status === "fulfilled" &&
    unshielded.value &&
    typeof unshielded.value === "object"
  ) {
    for (const [key, value] of Object.entries(unshielded.value as Record<string, unknown>)) {
      if (!/dust|fee|reserve/i.test(key)) continue;
      const amount = extractAmount(value, DUST_DECIMALS);
      if (amount !== undefined && amount > ZERO) {
        dustValue = { balance: amount, cap: dustValue?.cap ?? ZERO };
        break;
      }
    }
  }

  probeWalletBalances({
    providerId: meta?.providerId ?? "unknown",
    network: meta?.network,
    apiMethods,
    hasGetDustBalance: hasGetDust,
    unshielded:
      unshielded.status === "fulfilled"
        ? { ok: true, value: unshielded.value }
        : { ok: false, reason: String(unshielded.reason) },
    shielded:
      shielded.status === "fulfilled"
        ? { ok: true, value: shielded.value }
        : { ok: false, reason: String(shielded.reason) },
    dust:
      dust.status === "fulfilled"
        ? { ok: true, value: dust.value, typeof: typeof dust.value }
        : { ok: false, reason: String(dust.reason) },
    altRaw,
    parsedDust: dustValue
      ? {
          balance: dustValue.balance.toString(),
          cap: dustValue.cap.toString(),
          balanceDisplay: formatTokenAmount(dustValue.balance, DUST_DECIMALS),
          capDisplay: formatTokenAmount(dustValue.cap, DUST_DECIMALS),
        }
      : null,
  });

  const hasAny =
    unshielded.status === "fulfilled" ||
    shielded.status === "fulfilled" ||
    dustValue !== null;
  if (!hasAny) return undefined;

  const numericDust =
    dustValue && (dustValue.balance > ZERO || dustValue.cap > ZERO)
      ? {
          dust: formatTokenAmount(dustValue.balance, DUST_DECIMALS),
          dustCap: formatTokenAmount(dustValue.cap, DUST_DECIMALS),
          dustExists: true as const,
        }
      : null;

  // Gero's connector commonly returns balance/cap 0 while the wallet UI generates tDUST.
  // A dust address is enough to treat fee reserve as present for gating + honest UI.
  const dustAddress =
    asAddress(altRaw.getDustAddress) ??
    (typeof altRaw.getDustAddress === "object" && altRaw.getDustAddress
      ? asAddress((altRaw.getDustAddress as { dustAddress?: unknown }).dustAddress)
      : undefined);
  const geroDustPresent =
    meta?.providerId === "gero" && Boolean(dustAddress) && !numericDust;

  return {
    unshielded:
      unshielded.status === "fulfilled"
        ? formatTokenAmount(sumTokenRecord(unshielded.value))
        : "—",
    shielded:
      shielded.status === "fulfilled" ? formatTokenAmount(sumTokenRecord(shielded.value)) : "—",
    dust: numericDust
      ? numericDust.dust
      : geroDustPresent
        ? "Exists"
        : dustValue
          ? formatTokenAmount(dustValue.balance, DUST_DECIMALS)
          : "—",
    dustCap: numericDust ? numericDust.dustCap : "—",
    dustExists: Boolean(numericDust || geroDustPresent),
    dustHint: geroDustPresent
      ? "For exact balance, check your Gero wallet / dashboard."
      : undefined,
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

/**
 * Normalize long token decimals for compact UI display.
 * Example: 4.563383999999999 -> 4.563384
 */
export function formatDisplayAmount(value: string, maxFraction = 6): string {
  const raw = value.trim();
  if (!raw || raw === "—") return "—";
  const numeric = Number.parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFraction,
  });
}

/** True when fee reserve is usable: numeric dust > 0, or Gero dust-address presence. */
export function hasFeeReserve(balances: WalletBalances | undefined): boolean {
  if (!balances) return false;
  if (balances.dustExists) return true;
  const raw = balances.dust.trim();
  if (!raw || raw === "—" || raw.toLowerCase() === "exists") return false;
  const numeric = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric > 0;
}

export function formatDustLabel(balances: WalletBalances, asset: string): string {
  if (balances.dustExists && (balances.dust === "Exists" || balances.dustCap === "—")) {
    return `Exists ${asset}`;
  }
  if (balances.dustCap !== "—") {
    return `${formatDisplayAmount(balances.dust)} / ${formatDisplayAmount(balances.dustCap, 2)} ${asset}`;
  }
  return `${formatDisplayAmount(balances.dust)} ${asset}`;
}

/** Call `connect()` in the click handler — do not await anything first (Lace pop-up). */
export function startWalletConnect(providerId: string) {
  const initial = findInjectedWallet(providerId);
  if (!initial) {
    throw new Error(missingWalletMessage(providerId));
  }
  const network = preferredNetwork();
  return {
    providerId,
    initial,
    network,
    pending: initial.connect(network),
  };
}

export type WalletConnectSession = ReturnType<typeof startWalletConnect>;

let activeSession: ActiveWalletSession | undefined;

async function bestEffortDisconnect(api: ConnectedAPI | undefined) {
  if (!api) return;
  const candidateMethods = [
    "disconnect",
    "deauthorize",
    "revoke",
    "forgetDapp",
    "forgetCurrentDapp",
    "logout",
  ] as const;

  for (const name of candidateMethods) {
    const fn = (api as Record<string, unknown>)[name];
    if (typeof fn !== "function") continue;
    try {
      await Promise.resolve((fn as () => unknown).call(api));
    } catch {
      /* Best effort only: extensions differ in teardown semantics. */
    }
  }
}

export async function finishWalletConnect(session: WalletConnectSession) {
  const connected = await withTimeout(
    session.pending,
    90_000,
    "Wallet did not respond. Check the Lace pop-up — it is often behind this window.",
  );
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
  const balances = await readWalletBalances(connected, {
    providerId: session.providerId,
    network,
  }).catch(() => undefined);
  const providerId = session.providerId as WalletProviderId;
  activeSession = {
    providerId,
    network,
    api: connected,
  };
  return {
    address,
    network,
    name: session.initial.name,
    rdns: session.initial.rdns,
    balances,
  };
}

export async function refreshConnectedBalances() {
  if (!activeSession) return undefined;

  const meta = {
    providerId: activeSession.providerId,
    network: activeSession.network,
  };
  const current = await readWalletBalances(activeSession.api, meta).catch(() => undefined);
  if (current) return current;

  // Connector can become stale after extension SW restarts (common with Gero).
  const injected = findInjectedWallet(activeSession.providerId);
  if (!injected) return undefined;
  const reconnected = await withTimeout(
    injected.connect(activeSession.network),
    30_000,
    "Wallet reconnect timed out while refreshing balances.",
  ).catch(() => undefined);
  if (!reconnected) return undefined;
  activeSession = { ...activeSession, api: reconnected };
  return readWalletBalances(reconnected, meta).catch(() => undefined);
}

export function getConnectedWalletApi() {
  return activeSession?.api;
}

export function getConnectedWalletProviderId(): WalletProviderId | undefined {
  return activeSession?.providerId;
}

export function clearConnectedWalletApi() {
  const current = activeSession?.api;
  activeSession = undefined;
  void bestEffortDisconnect(current);
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

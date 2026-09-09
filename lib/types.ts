export type Tier = "freelancer" | "institutional";

export type WalletProviderId = "lace" | "gero" | "1am" | "ctrl";

export type WalletStatus = "disconnected" | "connecting" | "connected";

export type ProofStatus =
  | "idle"
  | "scanning"
  | "guarding"
  | "proving"
  | "attesting"
  | "shielded"
  | "error";

export type ChatRole = "user" | "assistant" | "system";

export interface WalletBalances {
  unshielded: string;
  shielded: string;
  dust: string;
  dustCap: string;
}

export interface WalletState {
  status: WalletStatus;
  provider?: WalletProviderId;
  address?: string;
  network?: string;
  live?: boolean;
  error?: string;
  walletName?: string;
  balances?: WalletBalances;
}

export interface GuardrailToggles {
  piiStripping: boolean;
  financialMasking: boolean;
  enterpriseCompliance: boolean;
}

export interface GuardrailFinding {
  id: string;
  kind: "pii" | "financial" | "compliance";
  label: string;
  count: number;
}

export interface ProofRecord {
  hash: string;
  binding: string;
  circuit: string;
  attestedAt: string;
  findings: GuardrailFinding[];
  packFlags: number;
  ledgerId?: number;
  status?: "committed-local" | "proof-server-reachable";
  walletAddress?: string;
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sanitized?: boolean;
  proofHash?: string;
  createdAt: string;
}

export interface Profile {
  name: string;
  initials: string;
  title: string;
  organization: string;
}

export const WALLET_PROVIDERS: {
  id: WalletProviderId;
  name: string;
  hint: string;
}[] = [
  { id: "lace", name: "Lace", hint: "Chrome — Midnight dApp connector" },
  { id: "gero", name: "Gero", hint: "Chrome — Midnight if the connector is injected" },
  { id: "1am", name: "1AM", hint: "Chrome / Firefox — Midnight-native" },
  { id: "ctrl", name: "Ctrl", hint: "Chrome — partial Midnight connector" },
];

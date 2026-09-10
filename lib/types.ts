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
  /** Gero connector often returns dust 0/0; dust address means fee reserve exists in-wallet. */
  dustExists?: boolean;
  dustHint?: string;
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
  secretsStripping: boolean;
  codeInsulation: boolean;
  clientRecords: boolean;
}

export interface GuardrailFinding {
  id: string;
  kind: "pii" | "financial" | "secrets" | "code" | "client";
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
  status?: "committed-local" | "proof-server-reachable" | "settled";
  walletAddress?: string;
  note?: string;
  txId?: string;
  contractAddress?: string;
  network?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sanitized?: boolean;
  proofHash?: string;
  walkthrough?: boolean;
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
  status: "supported" | "coming_soon";
  recommended?: boolean;
  icon: string;
}[] = [
  {
    id: "1am",
    name: "1AM",
    hint: "In-wallet proving · recommended for Shield & settle",
    status: "supported",
    recommended: true,
    icon: "/wallets/1am.svg",
  },
  {
    id: "lace",
    name: "Lace",
    hint: "Needs a local or remote proof server for settle",
    status: "coming_soon",
    icon: "/wallets/lace.svg",
  },
  {
    id: "gero",
    name: "Gero",
    hint: "Connect works · contract balancing not ready yet",
    status: "coming_soon",
    icon: "/wallets/gero.svg",
  },
  {
    id: "ctrl",
    name: "Ctrl",
    hint: "Partial Midnight connector · settle support later",
    status: "coming_soon",
    icon: "/wallets/ctrl.svg",
  },
];

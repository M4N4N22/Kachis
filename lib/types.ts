export type Tier = "freelancer" | "institutional";

export type WalletProviderId = "lace";

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

export interface WalletState {
  status: WalletStatus;
  provider?: WalletProviderId;
  address?: string;
  live?: boolean;
  error?: string;
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
  { id: "lace", name: "Lace", hint: "Midnight Lace — required for live connect" },
];

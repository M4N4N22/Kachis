export type Tier = "freelancer" | "institutional";

export type WalletProviderId = "lace" | "gero";

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
  circuit: string;
  attestedAt: string;
  findings: GuardrailFinding[];
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
  { id: "lace", name: "Lace", hint: "Midnight-ready browser wallet" },
  { id: "gero", name: "Gero Wallet", hint: "Cardano + Midnight connector" },
];

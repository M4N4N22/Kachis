import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import { validatePassword } from "@midnight-ntwrk/midnight-js-utils";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  PrivateStateExport,
  SigningKeyExport,
} from "@midnight-ntwrk/midnight-js-types";

function unsupported(method: string): never {
  throw new Error(`Session private state does not support ${method}.`);
}

const PASSWORD_KEY = "kachis.privateStatePassword";

function randomSessionPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?";
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const password = `Ks!${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
    try {
      validatePassword(password);
      return password;
    } catch {
      /* retry until the policy passes */
    }
  }
  return "Kachis.Guardrail.9x!q";
}

function sessionPassword(accountId: string) {
  if (typeof window === "undefined") return randomSessionPassword();
  const key = `${PASSWORD_KEY}.${accountId}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    try {
      validatePassword(existing);
      return existing;
    } catch {
      window.sessionStorage.removeItem(key);
    }
  }
  const password = randomSessionPassword();
  window.sessionStorage.setItem(key, password);
  return password;
}

/** In-memory fallback. Stores contract keys and the SHA-256 witness, never the paste. */
function inMemoryPrivateStateProvider<PSI extends string, PS>(): PrivateStateProvider<PSI, PS> {
  const states = new Map<string, PS>();
  const signingKeys = new Map<string, SigningKey>();
  let contractAddress: string | null = null;
  const scoped = (id: PSI) => `${contractAddress ?? "pending"}:${id}`;

  return {
    setContractAddress(address: ContractAddress) {
      contractAddress = String(address);
    },
    async set(id, state) {
      states.set(scoped(id), state);
    },
    async get(id) {
      return states.get(scoped(id)) ?? null;
    },
    async remove(id) {
      states.delete(scoped(id));
    },
    async clear() {
      states.clear();
    },
    async setSigningKey(address, signingKey) {
      signingKeys.set(String(address), signingKey);
    },
    async getSigningKey(address) {
      return signingKeys.get(String(address)) ?? null;
    },
    async removeSigningKey(address) {
      signingKeys.delete(String(address));
    },
    async clearSigningKeys() {
      signingKeys.clear();
    },
    exportPrivateStates: async () => unsupported("exportPrivateStates") as PrivateStateExport,
    importPrivateStates: async () => unsupported("importPrivateStates"),
    exportSigningKeys: async () => unsupported("exportSigningKeys") as SigningKeyExport,
    importSigningKeys: async () => unsupported("importSigningKeys"),
  };
}

/**
 * Encrypted private state scoped to the unshielded address.
 * Holds contract keys and the original SHA-256 witness — never the paste.
 * Password is derived in-session (16+ chars) and kept in sessionStorage.
 */
export function createGuardrailPrivateStateProvider<PSI extends string, PS>(
  accountId: string,
): PrivateStateProvider<PSI, PS> {
  try {
    return levelPrivateStateProvider<PSI, PS>({
      midnightDbName: "kachis",
      privateStateStoreName: "guardrail-private",
      signingKeyStoreName: "guardrail-keys",
      accountId,
      privateStoragePasswordProvider: () => sessionPassword(accountId),
    });
  } catch {
    return inMemoryPrivateStateProvider<PSI, PS>();
  }
}

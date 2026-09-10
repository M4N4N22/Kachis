import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import type { ContractAddress, SigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  PrivateStateExport,
  SigningKeyExport,
} from "@midnight-ntwrk/midnight-js-types";

function unsupported(method: string): never {
  throw new Error(`Session private state does not support ${method}.`);
}

const PASSWORD_KEY = "kachis.privateStatePassword";
const MIDNIGHT_DB_NAME = "kachis";

/**
 * In-memory private state for the browser console.
 * Holds contract keys and the SHA-256 witness — never the paste.
 *
 * Level/IndexedDB encryption was abandoned here: a lost session password left
 * ciphertext that threw OperationError / aes-gcm invalid tag, and open Level
 * handles blocked indexedDB.deleteDatabase so recovery could not complete.
 * findDeployedContract regenerates a signing key when none is stored, and we
 * always pass initialPrivateState for the shield witness.
 */
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

export function createGuardrailPrivateStateProvider<PSI extends string, PS>(
  _accountId: string,
): PrivateStateProvider<PSI, PS> {
  return inMemoryPrivateStateProvider<PSI, PS>();
}

/** Best-effort wipe of legacy encrypted LevelDB left from earlier builds. */
export async function resetGuardrailPrivateStorage() {
  if (typeof window === "undefined") return;

  for (const store of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(store)) {
      if (key.startsWith(PASSWORD_KEY)) store.removeItem(key);
    }
  }

  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(MIDNIGHT_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

export function isPrivateStateDecryptError(error: unknown): boolean {
  const name =
    error instanceof Error
      ? error.name
      : error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";
  if (name === "OperationError") return true;

  const message = (() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return "";
  })().toLowerCase();

  return (
    message.includes("aes-gcm") ||
    message.includes("invalid tag") ||
    message.includes("salt mismatch") ||
    message.includes("invalid encrypted data") ||
    message.includes("bad decrypt") ||
    message.includes("unable to authenticate")
  );
}

function toHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Compact `Bytes<32>` public fields are 32-byte hex. */
export function isCommitmentHex(value: string) {
  return /^0x[0-9a-f]{64}$/i.test(value);
}

export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);

  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return toHex(new Uint8Array(digest));
  }

  const { createHash } = await import("node:crypto");
  return `0x${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

/** Public binding: hash(originalHash || cleanedHash). Original plaintext never included. */
export async function bindingHex(originalHash: string, cleanedHash: string) {
  return sha256Hex(`${originalHash}:${cleanedHash}`);
}

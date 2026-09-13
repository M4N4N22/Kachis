/** Chrome Web Store (or Edge) listing URL when the companion is published. */
export function extensionStoreUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_KACHIS_EXTENSION_STORE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extensionStoreConfigured(): boolean {
  return Boolean(extensionStoreUrl());
}

/**
 * Source folder on GitHub (build locally — `extension/dist` is not published in-repo).
 * Override with NEXT_PUBLIC_KACHIS_EXTENSION_SOURCE_URL.
 */
export function extensionSourceUrl(): string {
  const raw = process.env.NEXT_PUBLIC_KACHIS_EXTENSION_SOURCE_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.toString();
      }
    } catch {
      /* fall through */
    }
  }
  return "https://github.com/M4N4N22/Kachis/tree/main/extension";
}

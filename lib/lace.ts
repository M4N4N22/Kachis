export type MidnightNetworkId = "undeployed" | "preview" | "preprod" | "mainnet";

export type LaceConnected = {
  address: string;
  network: string;
};

declare global {
  interface Window {
    midnight?: {
      mnLace?: {
        connect: (networkId: string) => Promise<{
          getUnshieldedAddress?: () => Promise<string>;
          getShieldedAddresses?: () => Promise<{
            unshieldedAddress?: string;
            shieldedAddress?: string;
          }>;
          getDustAddress?: () => Promise<string>;
        }>;
      };
    };
  }
}

export function laceAvailable() {
  return typeof window !== "undefined" && Boolean(window.midnight?.mnLace);
}

export async function connectLace(
  network: MidnightNetworkId = "preprod",
): Promise<LaceConnected> {
  const api = window.midnight?.mnLace;
  if (!api) {
    throw new Error("Lace Midnight is not installed. Install Lace and activate a Midnight account.");
  }

  const connected = await api.connect(network);

  if (typeof connected.getUnshieldedAddress === "function") {
    const address = await connected.getUnshieldedAddress();
    return { address, network };
  }

  const shielded = await connected.getShieldedAddresses?.();
  const address =
    shielded?.unshieldedAddress ?? shielded?.shieldedAddress;
  if (!address) {
    throw new Error("Lace connected but returned no address.");
  }

  return { address, network };
}

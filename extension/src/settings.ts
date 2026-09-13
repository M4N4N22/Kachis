/** Shared companion settings (chrome.storage.sync). */

export type PackToggles = {
  piiStripping: boolean;
  financialMasking: boolean;
  secretsStripping: boolean;
  codeInsulation: boolean;
  clientRecords: boolean;
};

export type CompanionSettings = {
  consoleUrl: string;
  seatKey: string;
  enabled: boolean;
  toggles: PackToggles;
};

export const DEFAULT_TOGGLES: PackToggles = {
  piiStripping: true,
  financialMasking: true,
  secretsStripping: true,
  codeInsulation: true,
  clientRecords: true,
};

export const DEFAULT_SETTINGS: CompanionSettings = {
  consoleUrl: "http://localhost:3000",
  seatKey: "",
  enabled: true,
  toggles: { ...DEFAULT_TOGGLES },
};

export const PACK_ROWS: {
  key: keyof PackToggles;
  label: string;
  helper: string;
}[] = [
  {
    key: "piiStripping",
    label: "Identifiers",
    helper: "Names, emails, phones, and similar identifiers",
  },
  {
    key: "financialMasking",
    label: "Financials",
    helper: "Amounts, cards, and money formats",
  },
  {
    key: "secretsStripping",
    label: "Secrets",
    helper: "Keys, tokens, and credentials",
  },
  {
    key: "codeInsulation",
    label: "Source",
    helper: "Code and repository-shaped spans",
  },
  {
    key: "clientRecords",
    label: "Client",
    helper: "Org and client-record patterns",
  },
];

export async function loadSettings(): Promise<CompanionSettings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const toggles = {
    ...DEFAULT_TOGGLES,
    ...(stored.toggles && typeof stored.toggles === "object"
      ? (stored.toggles as Partial<PackToggles>)
      : {}),
  };
  return {
    consoleUrl: String(stored.consoleUrl || DEFAULT_SETTINGS.consoleUrl).replace(
      /\/$/,
      "",
    ),
    seatKey: String(stored.seatKey || ""),
    enabled: stored.enabled !== false,
    toggles: {
      piiStripping: toggles.piiStripping !== false,
      financialMasking: toggles.financialMasking !== false,
      secretsStripping: toggles.secretsStripping !== false,
      codeInsulation: toggles.codeInsulation !== false,
      clientRecords: toggles.clientRecords !== false,
    },
  };
}

export async function saveSettings(
  patch: Partial<CompanionSettings>,
): Promise<CompanionSettings> {
  const current = await loadSettings();
  const next: CompanionSettings = {
    consoleUrl: (patch.consoleUrl ?? current.consoleUrl).replace(/\/$/, ""),
    seatKey: patch.seatKey ?? current.seatKey,
    enabled: patch.enabled ?? current.enabled,
    toggles: { ...current.toggles, ...(patch.toggles ?? {}) },
  };
  await chrome.storage.sync.set(next);
  return next;
}

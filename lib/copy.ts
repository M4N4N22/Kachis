/** Canonical UI strings. Mirror `copy.md` — do not invent a second voice. */

export const copy = {
  brand: {
    name: "Kachis",
    product: "Data Shield",
  },
  input: {
    eyebrow: "Local Guardrail",
    title: "Local Data Shield",
    helper:
      "Processing runs entirely within your local sandbox environment. Internal data remains local.",
    placeholder: "Paste internal data, source code, or records here...",
    loadSample: "Load sample",
  },
  filters: {
    pii: {
      label: "Strip Sensitive Identifiers",
      tooltip:
        "Automatically masks personal and system-specific markers locally before processing.",
    },
    financial: {
      label: "Mask Financial Formats",
      tooltip:
        "Redacts transaction footprints, routing information, and explicit corporate balances.",
    },
    compliance: {
      label: "Enterprise Compliance Audit",
      tooltip:
        "Validates local actions against your organization's security root without revealing raw text.",
    },
  },
  action: {
    idle: "Shield & Proceed",
    processing: "Running Local Verification...",
    success: "Data Shielded Successfully",
    error: "Verification Failed — Check Local Network Services",
    scanning: "Running Local Verification...",
    guarding: "Running Local Verification...",
    proving: "Running Local Verification...",
    attesting: "Running Local Verification...",
  },
  status: {
    shielded: "Data Shielded Locally",
    pipeline: "Zero-Leak Pipeline Active",
    unverified: "Disconnected — System Unverified",
  },
  chat: {
    eyebrow: "Secure Channel",
    title: "Zero-Leak Pipeline",
    userLabel: "Shielded input",
    assistantLabel: "Kachis",
    placeholderLocked: "Shield data locally to open this channel",
    placeholderOpen: "Send the shielded prompt…",
    send: "Send",
    emptyLocked: "Raw records never enter this channel.",
    emptyLockedHint:
      "Shield the payload locally. Only the insulated remainder can be sent.",
    emptyOpen: "Channel verified. Pipeline is live.",
    emptyOpenHint: "Send the shielded prompt, or edit it before it leaves this machine.",
    useShielded: "Use shielded prompt",
  },
  rail: {
    eyebrow: "How this works",
    title: "Local verification path",
    last: "Last verification",
    idle: "No local verification yet",
    ledger: "Public commitment id",
    notaryLocal: "Recorded locally — Compact submit is the next wiring step.",
    notaryServer: "Proof server reachable — circuit submit not wired yet.",
    steps: [
      {
        id: "how-paste",
        title: "Paste internally",
        body: "Source, records, and briefs stay in your sandbox. Nothing is uploaded yet.",
      },
      {
        id: "how-guardrails",
        title: "Apply filters",
        body: "Identifiers, financial formats, and policy secrets are stripped locally.",
      },
      {
        id: "how-proof",
        title: "Verify on this machine",
        body: "Local verification confirms the guardrail ran — without revealing the file.",
      },
      {
        id: "how-chat",
        title: "Open the secure channel",
        body: "Only the insulated remainder can leave. Raw values stay here.",
      },
      {
        id: "how-identity",
        title: "Authenticate the seat",
        body: "Corporate credentials prove role and policy without exposing the token.",
      },
    ],
  },
  tiers: {
    sandbox: {
      id: "freelancer" as const,
      pill: "Sandbox",
      badge: "Sandbox Workspace",
      description: "Individual sandbox for secure data parsing.",
      limit:
        "Approaching freelance local limit. Upgrade to an Institutional Network for company-wide custom rules, advanced regex filtering, and security compliance matrices.",
    },
    institutional: {
      id: "institutional" as const,
      pill: "Institutional",
      badge: "Institutional Network",
      description:
        "Enterprise-wide guardrail featuring custom organizational identity roots and granular workspace governance.",
    },
  },
  wallet: {
    connect: "Connect Corporate Wallet",
    verifying: "Verifying Credentials...",
    verifiedSuffix: "Organization Verified",
    identity:
      "Identity authenticated via sovereign credentials. Your private roles and cryptographic clearance tokens remain on-device.",
    disconnect: "Disconnect",
    cancel: "Cancel",
    choose: "Connect a Midnight wallet. The unshielded address is used for dApp connect.",
    unshielded: "Unshielded",
    shielded: "Shielded",
    dust: "Fee reserve",
    refresh: "Refresh balances",
    balancesUnavailable: "Balances unavailable",
  },
  analytics: {
    leaks: "Leaks Prevented Locally",
    credentials: "Active Corporate Credentials Verified",
    settlements: "Private Settlements Cryptographically Sealed",
    volume: "Public commitments",
    cycles: "Recent shielded jobs",
  },
  identity: {
    eyebrow: "Corporate credentials",
    disclose: "Verify selected claims",
    context:
      "Identity authenticated via sovereign credentials. Your private roles and cryptographic clearance tokens remain on-device.",
  },
} as const;

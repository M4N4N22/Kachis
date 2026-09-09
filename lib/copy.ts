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
    walletRequired: "Connect Corporate Wallet to Shield",
    walletRequiredHint:
      "A verified seat is required before local verification can run.",
    fundRequired: "Fund fee reserve to Shield",
    fundRequiredHint:
      "Settlement needs a positive fee reserve. Faucet tNIGHT, wait for tDUST, then refresh balances. On Gero, exact tDUST may only appear in the wallet dashboard.",
    geroSettleHint:
      "Gero can connect and prove, but cannot balance contract settlements yet. Use Lace to Shield & settle.",
    geroBalanceUnsupported:
      "Gero cannot balance contract settlements yet (balanceUnsealedTransaction is planned). Connect Lace with a funded fee reserve to settle.",
    proofServerUnreachable:
      "Proof server unreachable (Failed to fetch). Start a local proof server on :6300, point Lace Midnight proving to Local, then retry Shield.",
    settleFailed: "Settlement did not complete. Nothing was recorded.",
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
    placeholderWallet: "Connect a corporate wallet to open this channel",
    placeholderOpen: "Send the shielded prompt…",
    send: "Send",
    emptyLocked: "Raw records never enter this channel.",
    emptyLockedHint:
      "Shield the payload locally. Only the insulated remainder can be sent.",
    emptyWallet: "Seat unverified.",
    emptyWalletHint:
      "Connect a corporate wallet with a funded fee reserve, then shield locally.",
    emptyFund: "Fee reserve required.",
    emptyFundHint:
      "Faucet tNIGHT, wait for tDUST, refresh balances, then shield locally.",
    emptyOpen: "Channel verified. Pipeline is live.",
    emptyOpenHint: "Send the shielded prompt, or edit it before it leaves this machine.",
    useShielded: "Use shielded prompt",
    noModel: "No model configured. Set OPENAI_API_KEY to send the shielded prompt.",
    walkthroughLabel: "Walkthrough",
  },
  demo: {
    nav: "Walkthrough",
    landing: "Walkthrough",
    banner:
      "Canned payroll paste for a recorded walkthrough. Workspace is live paste only.",
    loadSample: "Load sample",
    reply:
      "Walkthrough reply — not a model.\n\nThis channel received the shielded remainder only. Identifiers never left the sandbox.\n\nOpen Workspace and configure a model to send a live shielded prompt.",
  },
  seat: {
    unbound: "Unbound seat",
    notConnected: "Not connected",
    verified: "Verified seat",
  },
  guardrails: {
    liveEyebrow: "Live filters",
    liveTitle: "Applied at shield time",
    liveHint:
      "These run in Workspace when you shield. Tenant packs that persist across seats are later.",
    seatEyebrow: "Bound seat",
    seatTitle: "Workspace governance",
    seatEmpty: "No seat bound. Connect a wallet.",
    seatLive: "Wallet connected. Role packs are later.",
  },
  rail: {
    eyebrow: "How this works",
    title: "Local verification path",
    last: "Last verification",
    idle: "No local verification yet",
    ledger: "Public commitment id",
    notaryLocal: "Recorded locally. Connect a funded wallet to settle.",
    notaryServer: "Verification service reachable. Settlement still needs a funded wallet.",
    notarySettled: "Settled. The pack ran; the original stays on this machine.",
    settleFallback:
      "Settlement did not complete. The local commitment is still recorded.",
    tx: "Settlement id",
    network: "Network",
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
    dustExists: "Exists",
    dustCheckWallet: "For exact balance, check your Gero wallet / dashboard.",
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

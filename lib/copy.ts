/** Canonical UI strings. Mirror `copy.md` — do not invent a second voice. */

export const copy = {
  brand: {
    name: "Kachis",
    product: "Data Shield",
  },
  input: {
    title: "Original prompt",
    helper: "Paste here. Secrets stay on this machine until you shield.",
    placeholder: "Type or paste payroll, source, contracts, or internal notes…",
    paste: "Paste",
    pasteFailed: "Clipboard paste blocked — use Ctrl+V.",
    sample: "Load payroll sample",
    sampleCode: "Load code & client sample",
    security: "Security filters",
  },
  filters: {
    pii: {
      label: "Strip identifiers",
      tooltip: "Masks emails, phones, SSNs, and similar markers locally.",
    },
    financial: {
      label: "Mask financials",
      tooltip: "Redacts amounts, routing, and account formats.",
    },
    secrets: {
      label: "Hold secrets",
      tooltip: "Blocks API keys, JWTs, and private key material locally.",
    },
    code: {
      label: "Insulate source",
      tooltip: "Redacts env assignments, code secrets, and internal paths.",
    },
    client: {
      label: "Strip client records",
      tooltip: "Masks labeled customer, account, and opportunity lines.",
    },
  },
  pack: {
    required:
      "Institutional seats must run every pack before shield. Enable all filters.",
    labels: {
      pii: "Identifiers",
      financial: "Financials",
      secrets: "Secrets",
      code: "Source",
      client: "Client",
    },
  },
  action: {
    idle: "Shield",
    processing: "Running local verification…",
    success: "Shielded",
    error: "Verification failed",
    scanning: "Running local verification…",
    guarding: "Running local verification…",
    proving: "Running local verification…",
    attesting: "Running local verification…",
    walletRequired: "Connect wallet to shield",
    walletRequiredHint: "Connect your wallet first, then shield the prompt.",
    fundRequired: "Fund fee reserve to shield",
    fundRequiredHint:
      "Settlement needs a positive fee reserve. Faucet tNIGHT, wait for tDUST, then refresh balances. On Gero, exact tDUST may only appear in the wallet dashboard.",
    geroSettleHint:
      "Gero can connect and prove, but cannot balance contract settlements yet. Use 1AM to Shield & settle.",
    geroBalanceUnsupported:
      "Gero cannot balance contract settlements yet. Connect 1AM with a funded fee reserve to settle.",
    proofServerUnreachable:
      "Proof server unreachable. Use 1AM (in-wallet proving), or start a local proof server on :6300 for Lace.",
    settleFailed: "Settlement did not complete. Nothing was recorded.",
    reconnectWallet: "Wallet session expired. Disconnect and connect 1AM again, then retry.",
    settleBundleFailed:
      "Settle bundle failed to load. Stop the server and run npm run dev (webpack), then hard-refresh and reconnect 1AM.",
    privateStateCorrupt:
      "Stale local keys blocked settle. Close other localhost tabs, hard-refresh, reconnect 1AM, and Shield again.",
  },
  status: {
    shielded: "Shielded",
    pipeline: "Zero-leak path active",
    unverified: "Wallet not connected",
  },
  sanitized: {
    title: "Shielded prompt",
    helper: "Review the insulated text, then confirm to send it to the model.",
    empty: "Waiting for shield",
    emptyHint: "Shield the original on the left. The insulated prompt appears here.",
    confirmSend: "Confirm & Send",
    sending: "Sending…",
    sent: "Sent",
  },
  response: {
    title: "Response",
    helper: "The model reply based on the shielded prompt.",
    empty: "No response yet",
    emptyHint: "Confirm & Send the shielded prompt to generate a reply.",
    emptyBeforeShield: "Shield and confirm the prompt first. The model reply appears here.",
    waiting: "Waiting for the model…",
    assistantLabel: "Kachis",
    walkthroughLabel: "Walkthrough",
    noModel: "No model configured. Set OPENAI_API_KEY to send the shielded prompt.",
    error: "Request failed. The shielded prompt was not delivered.",
  },
  chat: {
    // Legacy keys kept for any remaining imports; prefer sanitized / response.
    title: "Response",
    subtitle: "The model only ever sees the shielded prompt.",
    userLabel: "You",
    assistantLabel: "Kachis",
    placeholderLocked: "Shield your prompt first",
    placeholderWallet: "Connect your wallet to continue",
    placeholderOpen: "",
    send: "Confirm & Send",
    emptyLocked: "Waiting for shield",
    emptyLockedHint: "Shield the original prompt, then confirm & send.",
    emptyWallet: "Connect your wallet.",
    emptyWalletHint: "Connect on the top right, then shield the prompt.",
    emptyFund: "Fee reserve required.",
    emptyFundHint:
      "Faucet tNIGHT, wait for tDUST, refresh balances, then shield locally.",
    emptyOpen: "Ready to send",
    emptyOpenHint: "Confirm & Send the shielded prompt to the model.",
    useShielded: "Use shielded prompt",
    noModel: "No model configured. Set OPENAI_API_KEY to send the shielded prompt.",
    walkthroughLabel: "Walkthrough",
    suggestionShielded: "Confirm & Send",
    suggestionEdit: "Review insulated text",
  },
  demo: {
    nav: "Walkthrough",
    landing: "Walkthrough",
    banner:
      "You are in demo. No wallet or settlement required. Sample paste, local shield, simulated prove, canned reply.",
    loadSample: "Load sample",
    settleNote: "Walkthrough settle. No wallet or Midnight transaction ran.",
    reply:
      "Leak risk: High if this packet left the perimeter unshielded. Identifiers, bank rails, cash figures, and an export key were present in the original paste.\n\nCFO briefing (redacted)\n\n- Packet: Q3 compensation review for the board call\n- Subject: [EMPLOYEE] · [EMAIL] · [PHONE]\n- Tax ID: [SSN]\n- Banking: account [ACCOUNT], routing [ACCOUNT]\n- Comp: bonus [AMOUNT]; salary band [AMOUNT]–[AMOUNT]\n- Secrets: payroll export key removed ([SECRET])\n\nRecommendation: circulate only this insulated summary. Keep the original packet on-device; do not paste raw values into vendor models or shared docs.",
  },
  seat: {
    unbound: "Unbound seat",
    notConnected: "Not connected",
    verified: "Verified seat",
  },
  guardrails: {
    liveTitle: "Applied at shield time",
    liveHint:
      "These run in Workspace when you shield. Tenant packs that persist across seats are later.",
    seatTitle: "Workspace governance",
    seatEmpty: "No seat bound. Connect a wallet.",
    seatLive: "Wallet connected. Role packs are later.",
  },
  rail: {
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
        body: "Identifiers, financials, secrets, source markers, and client records are stripped locally.",
      },
      {
        id: "how-proof",
        title: "Verify on this machine",
        body: "Local verification confirms the guardrail ran — without revealing the file.",
      },
      {
        id: "how-chat",
        title: "Confirm & send",
        body: "Only the insulated prompt reaches the model. Raw values stay here.",
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
  agent: {
    title: "Autonomous Agent Insulation",
    description:
      "Insulate machine-to-machine workflows. Protect background developer scripts, automated data analysts, and service bots from leaking proprietary records to public endpoints.",
    label: "Automate",
    badge: "SDK Gateway Active",
  },
  wallet: {
    connect: "Connect Wallet",
    verifying: "Connecting...",
    verifiedSuffix: "Organization Verified",
    identity:
      "Identity authenticated via sovereign credentials. Your private roles and cryptographic clearance tokens remain on-device.",
    disconnect: "Disconnect",
    cancel: "Cancel",
    choose: "Connect a wallet. The unshielded address is used for dApp connect.",
    modalTitle: "Connect a Wallet",
    modalEducateTitle: "What is a Wallet?",
    modalEducateAssetsTitle: "A home for your digital assets",
    modalEducateAssetsBody: "Wallets are used to send, receive, store, and display digital assets.",
    modalEducateLoginTitle: "A new way to log in",
    modalEducateLoginBody:
      "Instead of creating new accounts and passwords on every website, just connect your wallet.",
    modalGetWallet: "Get a Wallet",
    modalLearnMore: "Learn More",
    modalRecommended: "Recommended",
    modalComingSoon: "Coming soon",
    modalSupported: "Supported",
    modalDetected: "Detected",
    modalUnavailable: "Install to connect",
    modalEmpty:
      "Install 1AM and unlock it on this page. Other wallets are listed for later settle support.",
    modalApproveHint: "Approve in the wallet pop-up. It may open behind this window.",
    modalComingSoonHint: "Settle support is not ready for this wallet yet.",
    unshielded: "Unshielded",
    shielded: "Shielded",
    dust: "Fee reserve",
    dustExists: "Exists",
    dustCheckWallet: "For exact balance, check your Gero wallet / dashboard.",
    refresh: "Refresh balances",
    balancesUnavailable: "Balances unavailable",
    viewIdentity: "Open Identity",
  },
  analytics: {
    leaks: "Leaks Prevented Locally",
    credentials: "Active Corporate Credentials Verified",
    settlements: "Private Settlements Cryptographically Sealed",
    cycles: "Recent shielded jobs",
    quarterTitle: "This quarter",
    quarterEmpty: "No shields in this quarter yet.",
    quarterSettlements: "Settlements",
    quarterFindings: "Findings held",
    quarterOnChain: "On-chain",
    packs: "Packs",
  },
  identity: {
    disclose: "Verify selected claims",
    context:
      "Identity authenticated via sovereign credentials. Your private roles and cryptographic clearance tokens remain on-device.",
  },
} as const;

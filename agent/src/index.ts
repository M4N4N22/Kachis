#!/usr/bin/env node
/**
 * Kachis Agent — professional MCP server.
 *
 * Tools:
 *   kachis_shield  — scan raw paste on-device; return shielded prompt + commitments
 *   kachis_restore — restore insulation tokens in a model reply (local only)
 *   kachis_status  — health + console policy / seat check
 *
 * Settle mode: commitment-only (public hash to console). Compact settle stays on the console wallet path.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  defaultTogglesForTier,
  meetsRequiredPack,
  packFlagsFromToggles,
  restoreFromTokenMap,
  runShield,
  type GuardrailToggles,
  type TokenMap,
} from "../../shared/index.ts";

const VERSION = "0.1.0";
const CONSOLE_URL = (process.env.KACHIS_CONSOLE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const SEAT_KEY = process.env.KACHIS_SEAT_KEY?.trim() ?? "";
const TIER =
  process.env.KACHIS_TIER === "freelancer" ? "freelancer" : "institutional";

/** Local-only maps keyed by cleanedHash — never returned from kachis_shield. */
const sessionMaps = new Map<string, TokenMap>();
const SESSION_MAP_LIMIT = 64;

function rememberTokenMap(cleanedHash: string, tokenMap: TokenMap) {
  sessionMaps.set(cleanedHash, tokenMap);
  while (sessionMaps.size > SESSION_MAP_LIMIT) {
    const oldest = sessionMaps.keys().next().value;
    if (!oldest) break;
    sessionMaps.delete(oldest);
  }
}

function seatHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (SEAT_KEY) {
    headers["X-Kachis-Seat-Key"] = SEAT_KEY;
    headers.Authorization = `Bearer ${SEAT_KEY}`;
  }
  return headers;
}

type PolicyResponse = {
  ok?: boolean;
  requiredPack?: number;
  defaultToggles?: GuardrailToggles;
  settleMode?: string;
  seat?: { id?: string | null; label?: string | null; keysRequired?: boolean };
};

async function fetchPolicy(): Promise<PolicyResponse | null> {
  try {
    const response = await fetch(`${CONSOLE_URL}/api/agent/policy`, {
      headers: seatHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as PolicyResponse;
  } catch {
    return null;
  }
}

async function postCommitment(payload: {
  cleanedHash: string;
  binding: string;
  packFlags: number;
  findings: unknown;
  attestedAt: string;
}): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${CONSOLE_URL}/api/shield`, {
      method: "POST",
      headers: seatHeaders(),
      body: JSON.stringify({
        ...payload,
        source: "agent",
        note: "MCP commitment-only. Compact settle is console wallet path.",
      }),
    });
    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        error: err?.error ?? `Console returned ${response.status}`,
        status: response.status,
      };
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jsonResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

const server = new McpServer({
  name: "kachis-agent",
  version: VERSION,
});

server.registerResource(
  "kachis-status",
  "kachis://status",
  {
    title: "Kachis agent status",
    description: "Local agent version, console URL, settle mode, seat binding.",
    mimeType: "application/json",
  },
  async () => {
    const policy = await fetchPolicy();
    return {
      contents: [
        {
          uri: "kachis://status",
          text: JSON.stringify(
            {
              product: "kachis-agent",
              version: VERSION,
              consoleUrl: CONSOLE_URL,
              settleMode: policy?.settleMode ?? "commitment-only",
              seatKeyConfigured: Boolean(SEAT_KEY),
              policy,
              sessionMaps: sessionMaps.size,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerResource(
  "kachis-circuit",
  "kachis://circuit",
  {
    title: "Kachis guardrail contract",
    description: "Public vs private fields for the shield evidence path.",
    mimeType: "text/plain",
  },
  async () => ({
    contents: [
      {
        uri: "kachis://circuit",
        text: [
          "Circuit: kachis_guardrail_v0",
          "Private witness: SHA-256 of the original paste (never returned by this tool).",
          "Public: cleanedHash, binding, packFlags (PII / financial / secrets / code / client).",
          "Host MUST call kachis_shield before any model sees the paste.",
          "Host MUST send only shielded_prompt to the language model — never the original text.",
          "After the model replies, call kachis_restore with cleaned_commitment + model text.",
          "Settle: commitment-only from MCP. Compact on-chain settle is the console wallet path.",
        ].join("\n"),
      },
    ],
  }),
);

server.registerTool(
  "kachis_status",
  {
    title: "Kachis status",
    description:
      "Verify console connectivity, seat key, and required pack policy before shielding.",
    inputSchema: {},
  },
  async () => {
    let health: Record<string, unknown> | null = null;
    try {
      const response = await fetch(`${CONSOLE_URL}/api/agent/health`, {
        headers: seatHeaders(),
      });
      health = (await response.json()) as Record<string, unknown>;
    } catch {
      health = { ok: false, error: `Console not reachable at ${CONSOLE_URL}` };
    }
    const policy = await fetchPolicy();
    return jsonResult({
      agent: { name: "kachis-agent", version: VERSION },
      consoleUrl: CONSOLE_URL,
      settleMode: "commitment-only",
      seatKeyConfigured: Boolean(SEAT_KEY),
      health,
      policy,
    });
  },
);

server.registerTool(
  "kachis_shield",
  {
    title: "Kachis shield",
    description:
      "REQUIRED before any model call: scan the raw paste on this machine. Returns ONLY shielded_prompt plus public commitments. The host must send shielded_prompt to the model and must never forward the original text. After the model answers, call kachis_restore. Posts a public commitment to the console (commitment-only; no Compact settle from MCP).",
    inputSchema: {
      text: z.string().describe("Raw user paste. Stays on this machine."),
      stripIdentifiers: z.boolean().optional().default(true),
      maskFinancial: z.boolean().optional().default(true),
      holdSecrets: z.boolean().optional().default(true),
      insulateCode: z.boolean().optional().default(true),
      stripClientRecords: z.boolean().optional().default(true),
    },
  },
  async ({
    text,
    stripIdentifiers,
    maskFinancial,
    holdSecrets,
    insulateCode,
    stripClientRecords,
  }) => {
    const policy = await fetchPolicy();
    const defaults =
      policy?.defaultToggles ?? defaultTogglesForTier(TIER);
    const toggles: GuardrailToggles = {
      piiStripping: stripIdentifiers ?? defaults.piiStripping,
      financialMasking: maskFinancial ?? defaults.financialMasking,
      secretsStripping: holdSecrets ?? defaults.secretsStripping,
      codeInsulation: insulateCode ?? defaults.codeInsulation,
      clientRecords: stripClientRecords ?? defaults.clientRecords,
    };

    const requiredPack = policy?.requiredPack ?? 0;
    if (requiredPack > 0 && !meetsRequiredPack(packFlagsFromToggles(toggles), requiredPack)) {
      return jsonResult(
        {
          error:
            "Pack toggles do not meet console required policy. Enable every mandatory filter.",
          requiredPack,
          toggles,
        },
        true,
      );
    }

    const result = await runShield(text, toggles);
    rememberTokenMap(result.cleanedHash, result.tokenMap);

    const ledger = await postCommitment({
      cleanedHash: result.cleanedHash,
      binding: result.binding,
      packFlags: result.packFlags,
      findings: result.findings,
      attestedAt: result.attestedAt,
    });

    const ledgerError =
      ledger && typeof ledger.error === "string" ? ledger.error : null;

    return jsonResult({
      shielded_prompt: result.text,
      cleaned_commitment: result.cleanedHash,
      binding: result.binding,
      pack_flags: result.packFlags,
      findings: result.findings,
      circuit: result.circuit,
      attested_at: result.attestedAt,
      settle_mode: "commitment-only",
      ledger_id: ledger?.ledgerId ?? null,
      notary_status: ledgerError
        ? "console-error"
        : (ledger?.status ?? "local-only"),
      notary_note: ledgerError
        ? ledgerError
        : typeof ledger?.note === "string"
          ? ledger.note
          : `Console not reachable at ${CONSOLE_URL}. Shield still ran locally.`,
      seat: policy?.seat ?? null,
      instruction:
        "Send ONLY shielded_prompt to the language model. Do not include the user's original text. After the model replies, call kachis_restore with cleaned_commitment and the model text.",
    });
  },
);

server.registerTool(
  "kachis_restore",
  {
    title: "Kachis restore",
    description:
      "LOCAL ONLY: restore enumerated insulation tokens in a model reply using the map from the prior kachis_shield on this machine. Never send the restored text to a public model. Secrets/keys stay masked.",
    inputSchema: {
      cleanedCommitment: z
        .string()
        .describe("cleaned_commitment from the matching kachis_shield call"),
      modelText: z
        .string()
        .describe("Assistant text that may contain [PERSON_1], [ORG_2], etc."),
      includeSecrets: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, also restore SECRET/JWT/key tokens (dangerous)."),
    },
  },
  async ({ cleanedCommitment, modelText, includeSecrets }) => {
    const tokenMap = sessionMaps.get(cleanedCommitment);
    if (!tokenMap) {
      return jsonResult(
        {
          error:
            "No local token map for that cleaned_commitment. Call kachis_shield again on this machine first.",
          restored_text: modelText,
        },
        true,
      );
    }

    const restored = restoreFromTokenMap(modelText, tokenMap, {
      includeSecrets: includeSecrets === true,
    });

    return jsonResult({
      restored_text: restored,
      note: "Restored on-device only. Do not forward restored_text to a public model.",
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

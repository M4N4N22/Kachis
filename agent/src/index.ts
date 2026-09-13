#!/usr/bin/env node
/**
 * Kachis Agent — professional MCP server.
 *
 * Tools:
 *   kachis_run / kachis_shield — scan raw paste on-device; return shielded_prompt
 *   kachis_restore            — restore insulation tokens in a host-model reply
 *   kachis_status             — health + console policy / seat check
 *
 * The host model (Cursor / Claude Desktop) answers from shielded_prompt.
 * Console Gemini beta is for the web Workspace only — MCP never calls /api/chat.
 *
 * Public commitments post to the console. Private originalHash stays on this machine
 * and is exposed only via the localhost witness bridge for wallet Compact settle.
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
  sha256Hex,
  type GuardrailToggles,
  type TokenMap,
} from "../../shared/index.ts";
import {
  countWitnessFiles,
  persistWitness,
} from "./witness-disk.ts";
import {
  startWitnessServer,
  type WitnessRecord,
  type WitnessStore,
} from "./witness-server.ts";

const VERSION = "0.1.0";
const CONSOLE_URL = (process.env.KACHIS_CONSOLE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const SEAT_KEY = process.env.KACHIS_SEAT_KEY?.trim() ?? "";
const TIER =
  process.env.KACHIS_TIER === "freelancer" ? "freelancer" : "institutional";
const WITNESS_PORT = Number(process.env.KACHIS_WITNESS_PORT || 3847);

/** Local-only settle witnesses + restore maps — never returned from kachis_shield. */
const sessionStore: WitnessStore = new Map();
const tokenMaps = new Map<string, TokenMap>();
const SESSION_LIMIT = 64;

function rememberSession(record: WitnessRecord & { tokenMap: TokenMap }) {
  const { tokenMap, ...witness } = record;
  sessionStore.set(witness.cleanedHash, witness);
  tokenMaps.set(witness.cleanedHash, tokenMap);
  // Disk so whichever process owns :3847 can serve settle (duplicate MCP spawns).
  persistWitness(witness);
  while (sessionStore.size > SESSION_LIMIT) {
    const oldest = sessionStore.keys().next().value;
    if (!oldest) break;
    sessionStore.delete(oldest);
    tokenMaps.delete(oldest);
  }
}

function pendingWitnessCount() {
  return Math.max(sessionStore.size, countWitnessFiles());
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
        note: "MCP commitment. Compact settle via console wallet + local witness bridge.",
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

const toggleSchema = {
  stripIdentifiers: z.boolean().optional().default(true),
  maskFinancial: z.boolean().optional().default(true),
  holdSecrets: z.boolean().optional().default(true),
  insulateCode: z.boolean().optional().default(true),
  stripClientRecords: z.boolean().optional().default(true),
};

type ShieldOk = {
  ok: true;
  shielded_prompt: string;
  cleaned_commitment: string;
  binding: string;
  pack_flags: number;
  findings: unknown;
  circuit: string;
  attested_at: string;
  ledger_id: unknown;
  notary_status: string;
  notary_note: string;
  seat: PolicyResponse["seat"] | null;
};

type ShieldErr = { ok: false; error: string; requiredPack?: number; toggles?: GuardrailToggles };

async function shieldLocal(input: {
  text: string;
  stripIdentifiers?: boolean;
  maskFinancial?: boolean;
  holdSecrets?: boolean;
  insulateCode?: boolean;
  stripClientRecords?: boolean;
}): Promise<ShieldOk | ShieldErr> {
  const policy = await fetchPolicy();
  const defaults = policy?.defaultToggles ?? defaultTogglesForTier(TIER);
  const toggles: GuardrailToggles = {
    piiStripping: input.stripIdentifiers ?? defaults.piiStripping,
    financialMasking: input.maskFinancial ?? defaults.financialMasking,
    secretsStripping: input.holdSecrets ?? defaults.secretsStripping,
    codeInsulation: input.insulateCode ?? defaults.codeInsulation,
    clientRecords: input.stripClientRecords ?? defaults.clientRecords,
  };

  const requiredPack = policy?.requiredPack ?? 0;
  if (requiredPack > 0 && !meetsRequiredPack(packFlagsFromToggles(toggles), requiredPack)) {
    return {
      ok: false,
      error:
        "Pack toggles do not meet console required policy. Enable every mandatory filter.",
      requiredPack,
      toggles,
    };
  }

  const originalHash = await sha256Hex(input.text);
  const result = await runShield(input.text, toggles);
  rememberSession({
    originalHash,
    cleanedHash: result.cleanedHash,
    binding: result.binding,
    packFlags: result.packFlags,
    findings: result.findings,
    attestedAt: result.attestedAt,
    tokenMap: result.tokenMap,
  });

  const ledger = await postCommitment({
    cleanedHash: result.cleanedHash,
    binding: result.binding,
    packFlags: result.packFlags,
    findings: result.findings,
    attestedAt: result.attestedAt,
  });

  const ledgerError =
    ledger && typeof ledger.error === "string" ? ledger.error : null;

  return {
    ok: true,
    shielded_prompt: result.text,
    cleaned_commitment: result.cleanedHash,
    binding: result.binding,
    pack_flags: result.packFlags,
    findings: result.findings,
    circuit: result.circuit,
    attested_at: result.attestedAt,
    ledger_id: ledger?.ledgerId ?? null,
    notary_status: ledgerError
      ? "console-error"
      : String(ledger?.status ?? "local-only"),
    notary_note: ledgerError
      ? ledgerError
      : typeof ledger?.note === "string"
        ? ledger.note
        : `Console not reachable at ${CONSOLE_URL}. Shield still ran locally.`,
    seat: policy?.seat ?? null,
  };
}

const HOST_LOOP =
  "HOST LOOP (use the host model — Cursor/Claude — never the Kachis console beta): (1) Draft your answer using ONLY shielded_prompt. (2) Call kachis_restore with cleaned_commitment + that draft. (3) Show restored_text to the user. Do not quote the original paste. Do not call /api/chat.";

function shieldToolResult(shielded: ShieldOk) {
  return jsonResult({
    ...shielded,
    settle_mode: "commitment + wallet settle via local witness",
    witness_bridge: `http://127.0.0.1:${WITNESS_PORT}`,
    model_path: "host",
    host_instruction: HOST_LOOP,
  });
}

startWitnessServer(sessionStore, { port: WITNESS_PORT });

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
              witnessBridge: `http://127.0.0.1:${WITNESS_PORT}`,
              settleMode: "commitment + wallet settle via local witness",
              modelPath: "host (Cursor/Claude) — not console beta",
              seatKeyConfigured: Boolean(SEAT_KEY),
              policy,
              pendingWitnesses: pendingWitnessCount(),
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
          "MCP does NOT call the Kachis console model. Console Gemini beta is for the web Workspace only.",
          "Host loop: kachis_shield → host model answers from shielded_prompt only → kachis_restore → show restored_text.",
          `Wallet settle: console Pending settle fetches originalHash from http://127.0.0.1:${WITNESS_PORT}/witness/<cleanedHash> (localhost only), then proves in the wallet.`,
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
      "Verify console connectivity, seat key, witness bridge, and required pack policy before shielding.",
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
      witnessBridge: `http://127.0.0.1:${WITNESS_PORT}`,
      pendingWitnesses: pendingWitnessCount(),
      settleMode: "commitment + wallet settle via local witness",
      modelPath: "host",
      seatKeyConfigured: Boolean(SEAT_KEY),
      health,
      policy,
    });
  },
);

server.registerTool(
  "kachis_run",
  {
    title: "Kachis run",
    description:
      "PREFERRED for user pastes: shield on-device, then the HOST model (Cursor/Claude) must answer from shielded_prompt only and call kachis_restore. Does not use Kachis-funded Gemini.",
    inputSchema: {
      text: z
        .string()
        .describe("Raw user paste. Stays on this machine; never forwarded to a vendor model by this tool."),
      ...toggleSchema,
    },
  },
  async (args) => {
    const shielded = await shieldLocal(args);
    if (!shielded.ok) return jsonResult(shielded, true);
    return shieldToolResult(shielded);
  },
);

server.registerTool(
  "kachis_shield",
  {
    title: "Kachis shield",
    description:
      "REQUIRED before answering a sensitive paste: scan on-device and return shielded_prompt. Then the HOST model answers from shielded_prompt only and calls kachis_restore. Does not use Kachis-funded Gemini (web Workspace only).",
    inputSchema: {
      text: z.string().describe("Raw user paste. Stays on this machine."),
      ...toggleSchema,
    },
  },
  async (args) => {
    const shielded = await shieldLocal(args);
    if (!shielded.ok) return jsonResult(shielded, true);
    return shieldToolResult(shielded);
  },
);

server.registerTool(
  "kachis_restore",
  {
    title: "Kachis restore",
    description:
      "LOCAL ONLY: restore enumerated insulation tokens in a host-model reply using the map from the prior kachis_shield on this machine. Never send the restored text to a public model. Secrets/keys stay masked.",
    inputSchema: {
      cleanedCommitment: z
        .string()
        .describe("cleaned_commitment from the matching kachis_shield call"),
      modelText: z
        .string()
        .describe("Host-model draft that may contain [PERSON_1], [ORG_2], etc."),
      includeSecrets: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, also restore SECRET/JWT/key tokens (dangerous)."),
    },
  },
  async ({ cleanedCommitment, modelText, includeSecrets }) => {
    const tokenMap = tokenMaps.get(cleanedCommitment);
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
      note: "Restored on-device only. Show restored_text to the user. Do not forward it to a public model.",
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

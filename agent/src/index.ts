import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  defaultTogglesForTier,
  restoreFromTokenMap,
  runShield,
  type TokenMap,
} from "../../shared/index.ts";

const CONSOLE_URL = (process.env.KACHIS_CONSOLE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** Local-only maps keyed by cleanedHash — never returned from kachis_shield. */
const sessionMaps = new Map<string, TokenMap>();
const SESSION_MAP_LIMIT = 32;

function rememberTokenMap(cleanedHash: string, tokenMap: TokenMap) {
  sessionMaps.set(cleanedHash, tokenMap);
  while (sessionMaps.size > SESSION_MAP_LIMIT) {
    const oldest = sessionMaps.keys().next().value;
    if (!oldest) break;
    sessionMaps.delete(oldest);
  }
}

const server = new McpServer({
  name: "kachis-agent",
  version: "0.1.0",
});

server.registerResource(
  "kachis-circuit",
  "kachis://circuit",
  {
    title: "Kachis guardrail circuit",
    description: "Public vs private fields for compact/kachis-guardrail.compact",
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
          "After the model replies, call kachis_restore with cleaned_commitment + model text to restore tokens locally.",
        ].join("\n"),
      },
    ],
  }),
);

server.registerTool(
  "kachis_shield",
  {
    title: "Kachis shield",
    description:
      "REQUIRED before any model call: scan the raw paste on this machine. Returns ONLY shielded_prompt plus public commitments. The host must send shielded_prompt to the model and must never forward the original text, secrets, or client records. After the model answers, call kachis_restore.",
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
    const defaults = defaultTogglesForTier("institutional");
    const result = await runShield(text, {
      piiStripping: stripIdentifiers ?? defaults.piiStripping,
      financialMasking: maskFinancial ?? defaults.financialMasking,
      secretsStripping: holdSecrets ?? defaults.secretsStripping,
      codeInsulation: insulateCode ?? defaults.codeInsulation,
      clientRecords: stripClientRecords ?? defaults.clientRecords,
    });

    rememberTokenMap(result.cleanedHash, result.tokenMap);

    let ledger: Record<string, unknown> | null = null;
    try {
      const response = await fetch(`${CONSOLE_URL}/api/shield`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanedHash: result.cleanedHash,
          binding: result.binding,
          packFlags: result.packFlags,
          findings: result.findings,
          attestedAt: result.attestedAt,
          source: "agent",
        }),
      });
      if (response.ok) {
        ledger = (await response.json()) as Record<string, unknown>;
      }
    } catch {
      ledger = null;
    }

    const payload = {
      shielded_prompt: result.text,
      cleaned_commitment: result.cleanedHash,
      binding: result.binding,
      pack_flags: result.packFlags,
      findings: result.findings,
      circuit: result.circuit,
      attested_at: result.attestedAt,
      ledger_id: ledger?.ledgerId ?? null,
      notary_status: ledger?.status ?? "local-only",
      notary_note:
        typeof ledger?.note === "string"
          ? ledger.note
          : `Console not reachable at ${CONSOLE_URL}. Shield still ran locally.`,
      instruction:
        "Send ONLY shielded_prompt to the language model. Do not include the user's original text. After the model replies, call kachis_restore with cleaned_commitment and the model text.",
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    };
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
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error:
                  "No local token map for that cleaned_commitment. Call kachis_shield again on this machine first.",
                restored_text: modelText,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    const restored = restoreFromTokenMap(modelText, tokenMap, {
      includeSecrets: includeSecrets === true,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              restored_text: restored,
              note: "Restored on-device only. Do not forward restored_text to a public model.",
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

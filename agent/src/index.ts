import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runShield } from "../../shared/index.ts";

const CONSOLE_URL = (process.env.KACHIS_CONSOLE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

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
          "Public: cleanedHash, binding, packFlags.",
          "Host must send only shielded_prompt to the language model.",
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
      "Scan a prompt on this machine. Returns ONLY the shielded text plus public commitments. Never send the original paste to a model.",
    inputSchema: {
      text: z.string().describe("Raw user paste. Stays on this machine."),
      stripIdentifiers: z.boolean().optional().default(true),
      maskFinancial: z.boolean().optional().default(true),
      enterpriseAudit: z.boolean().optional().default(true),
    },
  },
  async ({ text, stripIdentifiers, maskFinancial, enterpriseAudit }) => {
    const result = await runShield(text, {
      piiStripping: stripIdentifiers ?? true,
      financialMasking: maskFinancial ?? true,
      enterpriseCompliance: enterpriseAudit ?? true,
    });

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
        "Send shielded_prompt to the language model. Do not include the user's original text in any outbound request.",
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

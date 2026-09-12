/**
 * One-shot MCP stdio client for smoke-testing kachis-agent in this chat.
 * Usage: node scripts/mcp-smoke.mjs
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "agent", "dist", "cli.js");

const child = spawn(process.execPath, [cli], {
  cwd: root,
  env: {
    ...process.env,
    KACHIS_CONSOLE_URL: process.env.KACHIS_CONSOLE_URL || "http://localhost:3000",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

const pending = new Map();
let nextId = 1;

const rl = createInterface({ input: child.stdout });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    console.error("[non-json]", line);
    return;
  }
  if (msg.id != null && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

child.stderr.on("data", (buf) => {
  const text = buf.toString();
  if (text.trim()) console.error("[agent stderr]", text.trim());
});

function request(method, params) {
  const id = nextId++;
  const payload = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for ${method}`));
    }, 60000);
    pending.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.error) reject(Object.assign(new Error(msg.error.message), { data: msg.error }));
      else resolve(msg.result);
    });
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  });
}

function notify(method, params) {
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
}

const SAMPLE =
  "Payroll for Ada Lovelace (SSN 078-05-1120): wire $1,250,000 to IBAN DE89370400440532013000. API key sk_live_northwindBilling9f2e.";

try {
  const init = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "kachis-smoke", version: "0.1.0" },
  });
  console.log("\n=== initialize ===");
  console.log(JSON.stringify(init.serverInfo ?? init, null, 2));

  notify("notifications/initialized", {});

  const tools = await request("tools/list", {});
  console.log("\n=== tools/list ===");
  console.log((tools.tools ?? []).map((t) => t.name).join(", "));

  const status = await request("tools/call", {
    name: "kachis_status",
    arguments: {},
  });
  console.log("\n=== kachis_status ===");
  console.log(status.content?.[0]?.text ?? JSON.stringify(status, null, 2));

  const shield = await request("tools/call", {
    name: "kachis_shield",
    arguments: { text: SAMPLE },
  });
  const shieldText = shield.content?.[0]?.text ?? "";
  console.log("\n=== kachis_shield ===");
  console.log(shieldText);

  const shieldPayload = JSON.parse(shieldText);
  const restore = await request("tools/call", {
    name: "kachis_restore",
    arguments: {
      cleanedCommitment: shieldPayload.cleaned_commitment,
      modelText: `Confirm payroll for ${Object.keys(shieldPayload).includes("findings") ? "[PERSON_1]" : "[PERSON_1]"} at [ORG_1]. Amount [AMOUNT_1].`,
    },
  });
  console.log("\n=== kachis_restore ===");
  console.log(restore.content?.[0]?.text ?? JSON.stringify(restore, null, 2));

  console.log("\n=== smoke OK ===");
  process.exitCode = 0;
} catch (error) {
  console.error("\n=== smoke FAILED ===");
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill();
  setTimeout(() => process.exit(process.exitCode ?? 0), 200);
}

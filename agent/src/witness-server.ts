import http from "node:http";
import { countWitnessFiles, readWitness } from "./witness-disk.ts";

export type WitnessRecord = {
  originalHash: string;
  cleanedHash: string;
  binding: string;
  packFlags: number;
  findings: unknown;
  attestedAt: string;
};

export type WitnessStore = Map<string, WitnessRecord>;

const DEFAULT_PORT = 3847;

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function resolveWitness(
  store: WitnessStore,
  cleanedHash: string,
): WitnessRecord | null {
  return store.get(cleanedHash) ?? readWitness(cleanedHash);
}

let listeningPort: number | null = null;
/** Retained so the HTTP handle stays referenced and status can report bind state. */
let activeServer: http.Server | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function isWitnessBridgeListening(): boolean {
  return listeningPort !== null;
}

/**
 * Localhost-only witness bridge so the console can Compact-settle MCP jobs.
 * Private originalHash never leaves this machine / never posts to /api/shield.
 * Memory + local disk so duplicate agent processes still share settle witnesses.
 * If :3847 is busy (extra MCP spawn), retry until this process owns the port.
 */
export function startWitnessServer(
  store: WitnessStore,
  opts?: { port?: number },
): http.Server {
  const port = opts?.port ?? Number(process.env.KACHIS_WITNESS_PORT || DEFAULT_PORT);

  if (activeServer) {
    return activeServer;
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      const disk = countWitnessFiles();
      json(res, 200, {
        ok: true,
        product: "kachis-agent-witness",
        pending: Math.max(store.size, disk),
        memory: store.size,
        disk,
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/witness/")) {
      const cleanedHash = decodeURIComponent(url.pathname.slice("/witness/".length));
      const record = resolveWitness(store, cleanedHash);
      if (!record) {
        json(res, 404, {
          error:
            "No local witness for that commitment. Call kachis_shield again on this machine first.",
        });
        return;
      }
      // Never include tokenMap — settle only needs the private original hash.
      json(res, 200, {
        originalHash: record.originalHash,
        cleanedHash: record.cleanedHash,
        binding: record.binding,
        packFlags: record.packFlags,
        findings: record.findings,
        attestedAt: record.attestedAt,
      });
      return;
    }

    json(res, 404, { error: "Not found." });
  });

  activeServer = server;

  const scheduleRetry = () => {
    if (retryTimer || listeningPort !== null) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      tryListen();
    }, 3000);
  };

  const tryListen = () => {
    if (listeningPort !== null) return;
    try {
      server.listen(port, "127.0.0.1");
    } catch (error) {
      console.error("[kachis-agent] witness bridge listen threw", error);
      scheduleRetry();
    }
  };

  server.on("listening", () => {
    listeningPort = port;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    console.error(
      `[kachis-agent] witness bridge on http://127.0.0.1:${port} (localhost only)`,
    );
  });

  server.on("error", (error) => {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    listeningPort = null;
    if (code === "EADDRINUSE") {
      console.error(
        `[kachis-agent] witness port ${port} already in use — settle witnesses write to disk; console can settle from disk; retrying bind in 3s`,
      );
      scheduleRetry();
      return;
    }
    console.error("[kachis-agent] witness bridge failed to bind", error);
    scheduleRetry();
  });

  tryListen();
  return server;
}

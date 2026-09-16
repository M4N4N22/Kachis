import { NextResponse } from "next/server";
import {
  countDiskWitnesses,
  witnessDiskDir,
} from "@/lib/agent-witness-disk";
import { witnessBridgeUrl } from "@/lib/agent-witness";

export const dynamic = "force-dynamic";

/**
 * Settle readiness: prefer the agent HTTP bridge, fall back to the shared
 * local witness directory MCP already writes (originalHash stays on-machine).
 */
export async function GET() {
  const bridge = witnessBridgeUrl();
  try {
    const response = await fetch(`${bridge}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        ok?: boolean;
        pending?: number;
        product?: string;
      };
      if (body.ok) {
        return NextResponse.json({
          ok: true,
          source: "bridge",
          pending: body.pending ?? 0,
          bridge,
        });
      }
    }
  } catch {
    /* fall through to disk */
  }

  const pending = countDiskWitnesses();
  if (pending > 0) {
    return NextResponse.json({
      ok: true,
      source: "disk",
      pending,
      bridge,
      diskDir: witnessDiskDir(),
      note: "HTTP witness bridge offline; serving settle witnesses from local agent disk cache.",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      source: "none",
      pending: 0,
      bridge,
      error:
        "Agent witness bridge offline and no local settle witnesses on disk. Keep Kachis Agent MCP running, then re-run kachis_shield.",
    },
    { status: 503 },
  );
}

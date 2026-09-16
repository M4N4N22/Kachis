import { NextResponse } from "next/server";
import { readDiskWitness } from "@/lib/agent-witness-disk";
import { witnessBridgeUrl } from "@/lib/agent-witness";
import { bindingHex } from "@/shared/commit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ cleanedHash: string }> };

/**
 * Fetch a settle witness for an MCP commitment. Tries localhost :3847 first,
 * then the shared disk cache written by kachis_shield on this machine.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { cleanedHash: raw } = await context.params;
  const cleanedHash = decodeURIComponent(raw ?? "").trim();
  if (!cleanedHash || !/^0x[a-fA-F0-9]{64}$/.test(cleanedHash)) {
    return NextResponse.json({ error: "Invalid cleanedHash." }, { status: 400 });
  }

  const bridge = witnessBridgeUrl();
  try {
    const response = await fetch(
      `${bridge}/witness/${encodeURIComponent(cleanedHash)}`,
      { cache: "no-store", signal: AbortSignal.timeout(2000) },
    );
    if (response.ok) {
      const witness = await response.json();
      return NextResponse.json({ ...witness, source: "bridge" });
    }
  } catch {
    /* fall through to disk */
  }

  const witness = readDiskWitness(cleanedHash);
  if (!witness) {
    return NextResponse.json(
      {
        error:
          "No local witness for this commitment. Re-run kachis_shield while the agent is connected.",
      },
      { status: 404 },
    );
  }

  const expected = await bindingHex(witness.originalHash, witness.cleanedHash);
  if (expected.toLowerCase() !== witness.binding.toLowerCase()) {
    return NextResponse.json(
      { error: "Witness binding mismatch — refusing settle." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...witness, source: "disk" });
}

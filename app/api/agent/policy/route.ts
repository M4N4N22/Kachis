import { NextResponse } from "next/server";
import {
  authenticateSeat,
  seatKeysConfigured,
} from "@/lib/seat-auth";
import {
  defaultTogglesForTier,
  REQUIRED_PACK_INSTITUTIONAL,
  REQUIRED_PACK_SANDBOX,
  requiredPackFromEnv,
} from "@/shared/policy";

export const dynamic = "force-dynamic";

/**
 * Public policy for MCP / extension: required packs + default toggles.
 * Seat key optional unless KACHIS_SEAT_KEYS is configured.
 */
export async function GET(request: Request) {
  const auth = authenticateSeat(request, "agent");
  if (!auth.ok && seatKeysConfigured()) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const requiredPack = requiredPackFromEnv();
  const tier =
    requiredPack >= REQUIRED_PACK_INSTITUTIONAL ? "institutional" : "freelancer";

  return NextResponse.json({
    ok: true,
    product: "kachis",
    version: "0.1.0",
    settleMode: "commitment-only",
    settleNote:
      "MCP and extension post public commitments only. Compact settle remains on the console wallet path.",
    requiredPack,
    requiredPackInstitutional: REQUIRED_PACK_INSTITUTIONAL,
    requiredPackSandbox: REQUIRED_PACK_SANDBOX,
    defaultToggles: defaultTogglesForTier(tier),
    seat: auth.ok
      ? { id: auth.seatId, label: auth.label, keysRequired: seatKeysConfigured() }
      : { id: null, label: null, keysRequired: seatKeysConfigured() },
    consoleUrl: new URL(request.url).origin,
  });
}

import { NextResponse } from "next/server";
import { authenticateSeat, seatKeysConfigured } from "@/lib/seat-auth";

export const dynamic = "force-dynamic";

/** Connectivity check for MCP / extension install verify. */
export async function GET(request: Request) {
  const auth = authenticateSeat(request, "agent");
  return NextResponse.json({
    ok: true,
    product: "kachis",
    service: "console",
    seatKeysRequired: seatKeysConfigured(),
    seat: auth.ok
      ? { authenticated: true, id: auth.seatId, label: auth.label }
      : { authenticated: false, error: auth.error },
  });
}

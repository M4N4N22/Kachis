import { NextResponse } from "next/server";
import { getBetaQuota } from "@/lib/beta-quota";

export const dynamic = "force-dynamic";

/**
 * Public model status for the console.
 * Does not advertise app env keys as the user's credentials.
 */
export async function GET() {
  const beta = await getBetaQuota();
  return NextResponse.json({
    beta: {
      provider: "gemini" as const,
      available: beta.available,
      used: beta.used,
      limit: beta.limit,
      remaining: beta.remaining,
      day: beta.day,
    },
    byoc: {
      supported: ["openai", "anthropic", "gemini", "custom"] as const,
      storage: "session-memory" as const,
      note: "Keys stay in the browser for this session and are used ephemerally for inference only.",
    },
  });
}

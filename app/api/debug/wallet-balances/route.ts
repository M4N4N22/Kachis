import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Temporary wallet-connector probe — prints to the Next.js terminal. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  console.log("\n========== WALLET BALANCE PROBE ==========");
  console.log(new Date().toISOString());
  console.dir(body, { depth: 12, colors: true });
  console.log("==========================================\n");

  return NextResponse.json({ ok: true });
}

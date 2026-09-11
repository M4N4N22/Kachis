import { NextResponse } from "next/server";
import {
  createOrganization,
  getSeatContext,
  leaveOrganization,
  onboardInstitutional,
  onboardSandbox,
} from "@/lib/organization-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  try {
    const context = await getSeatContext(address);
    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load account." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: {
    action?: string;
    name?: string;
    address?: string;
  };
  try {
    body = (await request.json()) as {
      action?: string;
      name?: string;
      address?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "Wallet address required." }, { status: 400 });
  }

  try {
    if (body.action === "leave") {
      const context = await leaveOrganization(address);
      return NextResponse.json(context);
    }

    if (body.action === "onboard_sandbox") {
      const context = await onboardSandbox(address);
      return NextResponse.json(context);
    }

    if (body.action === "onboard_institutional") {
      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json({ error: "Organization name required." }, { status: 400 });
      }
      const context = await onboardInstitutional({ name, adminAddress: address });
      return NextResponse.json(context);
    }

    if (body.action === "create" || body.name) {
      const name = body.name?.trim();
      if (!name) {
        return NextResponse.json({ error: "Organization name required." }, { status: 400 });
      }
      await createOrganization({ name, adminAddress: address });
      const context = await getSeatContext(address);
      return NextResponse.json(context);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Organization request failed." },
      { status: 400 },
    );
  }
}

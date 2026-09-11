import { NextResponse } from "next/server";
import { findAttestationByHash } from "@/lib/attestation-log";
import { sha256Hex } from "@/shared/commit";
import {
  enforceRequiredPackEnabled,
  meetsRequiredPack,
  requiredPackFromEnv,
} from "@/shared/policy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; proofHash?: string };

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Shielded prompt required." }, { status: 400 });
  }

  if (!body.proofHash) {
    return NextResponse.json(
      { error: "Channel locked. Shield first — a cleaned commitment is required." },
      { status: 403 },
    );
  }

  const attestation = await findAttestationByHash(body.proofHash);
  if (!attestation) {
    return NextResponse.json(
      { error: "Unknown commitment. Run local shield before this channel." },
      { status: 403 },
    );
  }

  const promptHash = await sha256Hex(body.prompt);
  if (promptHash.toLowerCase() !== attestation.cleanedHash.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "Prompt does not match the recorded commitment. Send only the shielded text from this job.",
      },
      { status: 403 },
    );
  }

  if (enforceRequiredPackEnabled()) {
    const required = requiredPackFromEnv();
    if (required > 0 && !meetsRequiredPack(attestation.packFlags, required)) {
      return NextResponse.json(
        {
          error:
            "Required policy not attested on this commitment. Re-shield with the mandatory filters.",
        },
        { status: 403 },
      );
    }
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "No model configured. Set OPENAI_API_KEY to send the shielded prompt." },
      { status: 503 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You only see a Kachis-shielded prompt. Never ask for the original secrets. Work with placeholders.",
        },
        { role: "user", content: body.prompt },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Model request failed." }, { status: 502 });
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return NextResponse.json({
    source: "openai",
    ledgerId: attestation.ledgerId,
    content: data.choices?.[0]?.message?.content ?? "Empty model response.",
  });
}

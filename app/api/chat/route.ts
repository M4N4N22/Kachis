import { NextResponse } from "next/server";
import { findAttestationByHash } from "@/lib/attestation-log";

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

  const attestation = findAttestationByHash(body.proofHash);
  if (!attestation) {
    return NextResponse.json(
      { error: "Unknown commitment. Run local shield before this channel." },
      { status: 403 },
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const placeholder = body.prompt.includes("[")
      ? "This channel received the shielded prompt only. Identifiers never left the local sandbox."
      : "Local verification cleared this prompt. No additional redactions were required.";

    return NextResponse.json({
      source: "local-stub",
      ledgerId: attestation.ledgerId,
      content: `${placeholder}

I can draft the CFO briefing from insulated fields only: compensation discussion, leak-risk framing, and a circulation-safe summary. Sensitive values remain placeholders.

Set OPENAI_API_KEY to send this shielded prompt to a real model.`,
    });
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

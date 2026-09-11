import { NextResponse } from "next/server";
import { findAttestationByHash } from "@/lib/attestation-log";
import {
  consumeBetaQuota,
  getBetaQuota,
  refundBetaQuota,
} from "@/lib/beta-quota";
import { runModelInference } from "@/lib/model-inference";
import type { ModelProviderId } from "@/lib/types";
import { sha256Hex } from "@/shared/commit";
import {
  enforceRequiredPackEnabled,
  meetsRequiredPack,
  requiredPackFromEnv,
} from "@/shared/policy";

export const dynamic = "force-dynamic";

type ChatBody = {
  prompt?: string;
  proofHash?: string;
  mode?: "beta" | "byoc";
  byoc?: {
    provider?: ModelProviderId;
    apiKey?: string;
    label?: string;
    baseUrl?: string;
    model?: string;
  };
};

const PROVIDERS: ModelProviderId[] = ["openai", "anthropic", "gemini", "custom"];

function isProvider(value: unknown): value is ModelProviderId {
  return typeof value === "string" && PROVIDERS.includes(value as ModelProviderId);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatBody;

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

  const wantsByoc =
    body.mode === "byoc" ||
    Boolean(body.byoc?.apiKey?.trim() && isProvider(body.byoc?.provider));

  if (wantsByoc) {
    const provider = body.byoc?.provider;
    const apiKey = body.byoc?.apiKey?.trim() ?? "";
    if (!isProvider(provider) || !apiKey) {
      return NextResponse.json(
        { error: "BYOC requires a provider and API key for this session." },
        { status: 400 },
      );
    }
    if (provider === "custom" && !body.byoc?.label?.trim()) {
      return NextResponse.json(
        { error: "Name your custom provider before sending." },
        { status: 400 },
      );
    }

    const result = await runModelInference({
      provider,
      apiKey,
      prompt: body.prompt,
      source: "byoc",
      label: body.byoc?.label,
      baseUrl: body.byoc?.baseUrl,
      model: body.byoc?.model,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      source: "byoc",
      provider: result.provider,
      label: result.label,
      model: result.model,
      ledgerId: attestation.ledgerId,
      content: result.content,
    });
  }

  const before = await getBetaQuota();
  if (!before.available) {
    return NextResponse.json(
      {
        error:
          "Beta hosted model is offline. Add a BYOC key in AI Providers for this session.",
        quota: before,
      },
      { status: 503 },
    );
  }
  if (before.remaining <= 0) {
    return NextResponse.json(
      {
        error:
          "Beta daily quota reached. Add a BYOC key in AI Providers to continue.",
        quota: before,
      },
      { status: 429 },
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return NextResponse.json(
      {
        error:
          "Beta hosted model is offline. Add a BYOC key in AI Providers for this session.",
      },
      { status: 503 },
    );
  }

  const consumed = await consumeBetaQuota();
  if (!consumed) {
    const quota = await getBetaQuota();
    return NextResponse.json(
      {
        error:
          "Beta daily quota reached. Add a BYOC key in AI Providers to continue.",
        quota,
      },
      { status: 429 },
    );
  }

  const result = await runModelInference({
    provider: "gemini",
    apiKey: geminiKey,
    prompt: body.prompt,
    source: "beta",
  });

  if (!result.ok) {
    const quota = await refundBetaQuota();
    return NextResponse.json(
      { error: result.error, quota },
      { status: result.status },
    );
  }

  return NextResponse.json({
    source: "beta",
    provider: "gemini",
    model: result.model,
    ledgerId: attestation.ledgerId,
    quota: consumed,
    content: result.content,
  });
}

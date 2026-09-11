import type { ModelProviderId } from "@/lib/types";

export type InferenceResult =
  | {
      ok: true;
      content: string;
      provider: ModelProviderId;
      label?: string;
      source: "beta" | "byoc";
    }
  | { ok: false; error: string; status: number };

const SYSTEM =
  "You only see a Kachis-shielded prompt. Never ask for the original secrets. Work with placeholders.";

function scrubKey(message: string) {
  return message
    .replace(/key=[A-Za-z0-9_-]+/gi, "key=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[redacted]");
}

async function callOpenAICompatible(input: {
  apiKey: string;
  prompt: string;
  model: string;
  baseUrl?: string;
}) {
  const base = (input.baseUrl?.replace(/\/$/, "") || "https://api.openai.com/v1").replace(
    /\/chat\/completions$/i,
    "",
  );
  const endpoint = `${base}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: input.prompt },
      ],
    }),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: "Model request failed. Check the key, endpoint, and model id.",
      status: 502,
    };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return {
    ok: true as const,
    content: data.choices?.[0]?.message?.content?.trim() || "Empty model response.",
  };
}

async function callAnthropic(apiKey: string, prompt: string, model: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: "Anthropic request failed. Check the key and try again.",
      status: 502,
    };
  }

  const data = (await response.json()) as {
    content?: { type?: string; text?: string }[];
  };
  const text = data.content?.find((part) => part.type === "text")?.text?.trim();
  return {
    ok: true as const,
    content: text || "Empty model response.",
  };
}

async function callGemini(apiKey: string, prompt: string, model: string) {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: "Gemini request failed. Check the key and try again.",
      status: 502,
    };
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  return {
    ok: true as const,
    content: text || "Empty model response.",
  };
}

export async function runModelInference(input: {
  provider: ModelProviderId;
  apiKey: string;
  prompt: string;
  source: "beta" | "byoc";
  model?: string;
  label?: string;
  baseUrl?: string;
}): Promise<InferenceResult> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    return { ok: false, error: "API key required.", status: 400 };
  }

  try {
    if (input.provider === "anthropic") {
      const result = await callAnthropic(
        apiKey,
        input.prompt,
        input.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
      );
      if (!result.ok) return { ...result };
      return {
        ok: true,
        content: result.content,
        provider: "anthropic",
        source: input.source,
      };
    }

    if (input.provider === "gemini") {
      const result = await callGemini(
        apiKey,
        input.prompt,
        input.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      );
      if (!result.ok) return { ...result };
      return {
        ok: true,
        content: result.content,
        provider: "gemini",
        source: input.source,
      };
    }

    const result = await callOpenAICompatible({
      apiKey,
      prompt: input.prompt,
      model:
        input.model ??
        (input.provider === "custom"
          ? "gpt-4o-mini"
          : process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      baseUrl: input.provider === "custom" ? input.baseUrl : undefined,
    });
    if (!result.ok) return { ...result };
    return {
      ok: true,
      content: result.content,
      provider: input.provider,
      label: input.label,
      source: input.source,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Model request failed.";
    console.error("[kachis] model inference failed", scrubKey(raw));
    return { ok: false, error: "Model request failed.", status: 502 };
  }
}

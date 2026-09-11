import type { ModelProviderId } from "@/lib/types";

export type InferenceResult =
  | {
      ok: true;
      content: string;
      provider: ModelProviderId;
      label?: string;
      model?: string;
      source: "beta" | "byoc";
    }
  | { ok: false; error: string; status: number };

const SYSTEM =
  "You only see a Kachis-shielded prompt. Never ask for the original secrets. Work with placeholders. Reply in clean Markdown: use headings and **bold** sparingly; do not use decorative *** separators or raw asterisk ornaments.";

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
  const modelId = model.trim() || "gemini-3.8-flash";
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
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
    let detail = "";
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail = errBody.error?.message?.trim() || "";
    } catch {
      /* ignore parse errors */
    }
    const scrubbed = scrubKey(detail || response.statusText);
    console.error("[kachis] gemini request failed", response.status, modelId, scrubbed);

    let hint = "Gemini request failed. Check the key, model id, and try again.";
    if (/no longer available to new users/i.test(detail)) {
      hint =
        `Model "${modelId}" is not available for new Google AI keys. Set GEMINI_MODEL to gemini-3.8-flash or gemini-3.6-flash, then restart the dev server.`;
    } else if (response.status === 404) {
      hint = `Unknown or unavailable model "${modelId}". Set GEMINI_MODEL to a valid id (e.g. gemini-3.8-flash) and restart.`;
    } else if (response.status === 400 || response.status === 403) {
      hint =
        "Gemini rejected the key or request. Check GEMINI_API_KEY in .env and restart the dev server.";
    } else if (response.status === 503) {
      hint = "Gemini is busy right now. Retry in a moment, or switch GEMINI_MODEL.";
    }

    return {
      ok: false as const,
      error: hint,
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
      const model =
        input.model ?? process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
      const result = await callAnthropic(apiKey, input.prompt, model);
      if (!result.ok) return { ...result };
      return {
        ok: true,
        content: result.content,
        provider: "anthropic",
        model,
        source: input.source,
      };
    }

    if (input.provider === "gemini") {
      const model = (
        input.model ||
        process.env.GEMINI_MODEL ||
        "gemini-3.8-flash"
      ).trim();
      const result = await callGemini(apiKey, input.prompt, model);
      if (!result.ok) return { ...result };
      return {
        ok: true,
        content: result.content,
        provider: "gemini",
        model,
        source: input.source,
      };
    }

    const model =
      input.model ??
      (input.provider === "custom"
        ? "gpt-4o-mini"
        : process.env.OPENAI_MODEL ?? "gpt-4o-mini");
    const result = await callOpenAICompatible({
      apiKey,
      prompt: input.prompt,
      model,
      baseUrl: input.provider === "custom" ? input.baseUrl : undefined,
    });
    if (!result.ok) return { ...result };
    return {
      ok: true,
      content: result.content,
      provider: input.provider,
      label: input.label,
      model,
      source: input.source,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Model request failed.";
    console.error("[kachis] model inference failed", scrubKey(raw));
    return { ok: false, error: "Model request failed.", status: 502 };
  }
}

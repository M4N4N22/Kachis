/**
 * ChatGPT companion: hard-gate submit → shield → verify rewrite → send.
 * Restore assistant replies locally when they still contain insulation tokens.
 */
import {
  restoreFromTokenMap,
  type TokenMap,
} from "../../shared/shield-browser.ts";

type ShieldOk = {
  ok: true;
  shielded_prompt: string;
  cleaned_commitment: string;
  notary_status: string;
  findings_count: number;
  token_map: TokenMap;
  ner_fallback?: boolean;
};

type ShieldErr = { ok: false; error: string };

const state = {
  armed: false,
  /** Allow exactly one synthetic send after a verified shielded rewrite. */
  passthrough: false,
  busy: false,
  lastCommitment: "" as string,
  lastTokenMap: {} as TokenMap,
};

const TOKEN_HINT =
  /\[(PERSON|ORG|LOC|EMAIL|PHONE|SSN|AMOUNT|ACCOUNT|SECRET|JWT|PRIVATE_KEY|ENV|CODE_SECRET|PATH|CLIENT)_\d+\]/;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function findComposer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("#prompt-textarea") ||
    document.querySelector<HTMLElement>('[data-testid="prompt-textarea"]') ||
    document.querySelector<HTMLElement>('div.ProseMirror[contenteditable="true"]') ||
    document.querySelector<HTMLElement>('[contenteditable="true"][data-id]') ||
    document.querySelector<HTMLElement>('form textarea') ||
    document.querySelector<HTMLElement>('div[contenteditable="true"]')
  );
}

function readComposer(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  return (el.innerText || el.textContent || "").trim();
}

/**
 * Write into ChatGPT's React / ProseMirror composer so internal state updates.
 * Plain textContent assignment is ignored by ProseMirror — that was the leak path.
 */
function writeComposer(el: HTMLElement, text: string) {
  el.focus();

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const desc = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    );
    desc?.set?.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const ok = document.execCommand("insertText", false, text);
  if (!ok) {
    el.textContent = "";
    el.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertFromPaste",
        data: text,
      }),
    );
    el.textContent = text;
    el.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertFromPaste",
        data: text,
      }),
    );
  }
}

async function ensureComposerHolds(
  el: HTMLElement,
  expected: string,
): Promise<boolean> {
  const want = normalizeText(expected);
  for (let attempt = 0; attempt < 24; attempt++) {
    writeComposer(el, expected);
    await delay(40 + attempt * 10);
    const got = normalizeText(readComposer(el));
    if (got === want) return true;
    // ProseMirror sometimes keeps a trailing newline / paragraph chrome.
    if (got.replace(/\s/g, "") === want.replace(/\s/g, "")) return true;
    if (want.length > 24 && got.includes(want.slice(0, Math.min(64, want.length)))) {
      return true;
    }
  }
  return false;
}

function findSendButton(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[data-testid="send-button"]') ||
    document.querySelector<HTMLElement>('button[data-testid="fruitjuice-send-button"]') ||
    document.querySelector<HTMLElement>('button[aria-label="Send prompt"]') ||
    document.querySelector<HTMLElement>('button[aria-label*="Send"]') ||
    document.querySelector<HTMLElement>('form button[type="submit"]')
  );
}

function showBanner(message: string, tone: "ok" | "warn" = "ok") {
  const id = "kachis-banner";
  document.getElementById(id)?.remove();
  const el = document.createElement("div");
  el.id = id;
  el.textContent = message;
  el.style.cssText = [
    "position:fixed",
    "z-index:2147483647",
    "left:50%",
    "bottom:24px",
    "transform:translateX(-50%)",
    "max-width:min(520px,92vw)",
    "padding:10px 14px",
    "border-radius:10px",
    "font:500 13px/1.4 ui-sans-serif,system-ui,sans-serif",
    "color:#0a0a0a",
    `background:${tone === "ok" ? "#e8f5e9" : "#fff3e0"}`,
    "box-shadow:0 8px 24px rgba(0,0,0,.18)",
  ].join(";");
  document.documentElement.appendChild(el);
  window.setTimeout(() => el.remove(), 5200);
}

function composerLooksSensitive(text: string) {
  return (
    /\$[\d,]+/.test(text) ||
    /\b\d{3}-\d{2}-\d{4}\b/.test(text) ||
    /@/.test(text) ||
    /\b(?:ssn|iban|routing|api[_-]?key|sk_live|Employee:)/i.test(text)
  );
}

async function shieldAndRewrite(composer: HTMLElement): Promise<boolean> {
  const raw = readComposer(composer);
  if (!raw.trim()) return true;

  // Already insulated (e.g. user edited tokens) — still verify before send.
  if (TOKEN_HINT.test(raw) && !composerLooksSensitive(raw.replace(TOKEN_HINT, ""))) {
    return true;
  }

  showBanner("Kachis scanning on-device (rules + NER)…");

  const response = (await chrome.runtime.sendMessage({
    type: "kachis_shield",
    text: raw,
  })) as ShieldOk | ShieldErr;

  if (!response?.ok) {
    showBanner(response?.error || "Kachis blocked send — shield failed.", "warn");
    return false;
  }

  state.lastCommitment = response.cleaned_commitment;
  state.lastTokenMap = response.token_map || {};

  const shielded = response.shielded_prompt;
  const changed = normalizeText(shielded) !== normalizeText(raw);

  if (!changed) {
    if (composerLooksSensitive(raw)) {
      showBanner(
        "Kachis blocked send — sensitive patterns remain after scan. Adjust packs or edit the paste.",
        "warn",
      );
      return false;
    }
    if (response.ner_fallback) {
      showBanner(
        "On-device NER did not load — rule packs found nothing. Free-text names/orgs need NER (reload the extension after rebuild).",
        "warn",
      );
      return true;
    }
    showBanner("Kachis scanned — no sensitive spans found.");
    return true;
  }

  const proceed = window.confirm(
    [
      "Kachis found sensitive data in this paste.",
      "",
      "Only the insulated remainder will be sent to ChatGPT.",
      "The original stays in this browser.",
      "",
      `Spans held: ${response.findings_count}`,
      `Commitment: ${response.cleaned_commitment.slice(0, 18)}…`,
      `Notary: ${response.notary_status}`,
      "",
      "Continue with the shielded prompt?",
    ].join("\n"),
  );

  if (!proceed) {
    showBanner("Submit blocked — original was not sent.", "warn");
    return false;
  }

  const ok = await ensureComposerHolds(composer, shielded);
  if (!ok) {
    showBanner(
      "Kachis blocked send — could not lock the shielded text into ChatGPT’s composer. Try again.",
      "warn",
    );
    return false;
  }

  // Final hard gate: never send if composer still holds the original paste.
  const now = normalizeText(readComposer(composer));
  if (now === normalizeText(raw)) {
    showBanner(
      "Kachis blocked send — composer still holds the original paste.",
      "warn",
    );
    return false;
  }
  if (composerLooksSensitive(now) && !TOKEN_HINT.test(now)) {
    showBanner(
      "Kachis blocked send — composer still looks sensitive after rewrite.",
      "warn",
    );
    return false;
  }

  showBanner(
    response.ner_fallback
      ? "Loading on-device NER failed — used rule packs. Shielded and verified."
      : "Shielded with on-device NER. Verified — sending insulated prompt only.",
  );
  return true;
}

async function sendPassthrough() {
  const send = findSendButton();
  if (!send) {
    showBanner("Kachis shielded the composer — press Send once more.", "warn");
    return;
  }
  state.passthrough = true;
  await delay(30);
  (send as HTMLButtonElement).click();
  await delay(200);
  state.passthrough = false;
}

async function gateSubmit(event: Event) {
  if (state.passthrough || state.busy) {
    if (state.busy) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    }
    return;
  }

  const composer = findComposer();
  if (!composer) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  state.busy = true;
  try {
    const ok = await shieldAndRewrite(composer);
    if (!ok) return;
    await sendPassthrough();
  } finally {
    state.busy = false;
  }
}

function isSendClick(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;
  return Boolean(
    el.closest('[data-testid="send-button"]') ||
      el.closest('button[data-testid="fruitjuice-send-button"]') ||
      el.closest('button[aria-label="Send prompt"]') ||
      el.closest('button[aria-label*="Send"]') ||
      el.closest('form button[type="submit"]'),
  );
}

function assistantRoots(): HTMLElement[] {
  const roots = new Set<HTMLElement>();
  for (const sel of [
    '[data-message-author-role="assistant"]',
    'article[data-turn="assistant"]',
    'div[data-message-author-role="assistant"]',
  ]) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => roots.add(el));
  }
  return [...roots];
}

/** Innermost prose host only — never the turn chrome (avatar / flex row). */
function contentHost(root: HTMLElement): HTMLElement | null {
  const host =
    root.querySelector<HTMLElement>(".markdown") ||
    root.querySelector<HTMLElement>('[class*="markdown"]') ||
    root.querySelector<HTMLElement>(".prose") ||
    root.querySelector<HTMLElement>("[data-message-content]");
  if (!host || host === root) return null;
  return host;
}

const TOKEN_FIND =
  /\[\s*(PERSON|ORG|LOC|EMAIL|PHONE|SSN|AMOUNT|ACCOUNT|SECRET|JWT|PRIVATE_KEY|ENV|CODE_SECRET|PATH|CLIENT)\s*_\s*(\d+)\s*\]/gi;

const HOLD_ON_RESTORE = new Set([
  "SECRET",
  "JWT",
  "PRIVATE_KEY",
  "ENV",
  "CODE_SECRET",
  "PATH",
]);

function collectTextNodes(host: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) nodes.push(node as Text);
  }
  return nodes;
}

type TextSegment = { node: Text; start: number; end: number };

function concatTextSegments(nodes: Text[]): {
  text: string;
  segments: TextSegment[];
} {
  let text = "";
  const segments: TextSegment[] = [];
  for (const node of nodes) {
    const value = node.nodeValue ?? "";
    if (!value) continue;
    const start = text.length;
    text += value;
    segments.push({ node, start, end: start + value.length });
  }
  return { text, segments };
}

/** Replace [start, end) across one or more text nodes; keep element tree intact. */
function replaceCharRange(
  segments: TextSegment[],
  start: number,
  end: number,
  value: string,
) {
  const touched = segments.filter((s) => s.end > start && s.start < end);
  if (touched.length === 0) return;

  const first = touched[0]!;
  const last = touched[touched.length - 1]!;
  const before = (first.node.nodeValue ?? "").slice(0, start - first.start);
  const after = (last.node.nodeValue ?? "").slice(end - last.start);

  first.node.nodeValue = before + value + (first === last ? after : "");
  for (let i = 1; i < touched.length; i++) {
    const seg = touched[i]!;
    seg.node.nodeValue = i === touched.length - 1 ? after : "";
  }
}

/**
 * Restore insulation tokens inside the existing markdown tree.
 * Do not wipe/rebuild the host — that breaks ChatGPT’s flex turn layout.
 */
function restoreAssistantDom(root: HTMLElement, tokenMap: TokenMap): boolean {
  if (root.getAttribute("data-kachis-restored") === "1") return false;
  const host = contentHost(root);
  if (!host || host.getAttribute("data-kachis-restored") === "1") return false;

  const nodes = collectTextNodes(host);
  const { text, segments } = concatTextSegments(nodes);
  if (!TOKEN_HINT.test(text)) return false;

  const replacements: { start: number; end: number; value: string }[] = [];
  const re = new RegExp(TOKEN_FIND.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const family = String(match[1] || "").toUpperCase();
    const n = String(match[2] || "");
    const canonical = `[${family}_${n}]`;
    if (HOLD_ON_RESTORE.has(family)) continue;
    const original = tokenMap[canonical];
    if (typeof original !== "string" || !original) continue;
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      value: original,
    });
  }

  if (replacements.length === 0) {
    // Fallback only when tokens exist in innerText but not as text-node runs
    // (rare). Still avoid wiping the turn root.
    const full = text;
    const restored = restoreFromTokenMap(
      normalizeTokenSpelling(full),
      tokenMap,
      { includeSecrets: false },
    );
    if (restored === normalizeTokenSpelling(full)) return false;
    // Last resort: rewrite leaf paragraphs only, keep host element.
    const blocks = host.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6");
    if (blocks.length === 0) return false;
    let any = false;
    blocks.forEach((el) => {
      const before = el.textContent || "";
      if (!TOKEN_HINT.test(before)) return;
      const after = restoreFromTokenMap(
        normalizeTokenSpelling(before),
        tokenMap,
        { includeSecrets: false },
      );
      if (after !== normalizeTokenSpelling(before)) {
        el.textContent = after;
        any = true;
      }
    });
    if (!any) return false;
    host.setAttribute("data-kachis-restored", "1");
    root.setAttribute("data-kachis-restored", "1");
    return true;
  }

  replacements
    .sort((a, b) => b.start - a.start)
    .forEach((rep) => replaceCharRange(segments, rep.start, rep.end, rep.value));

  host.setAttribute("data-kachis-restored", "1");
  root.setAttribute("data-kachis-restored", "1");
  return true;
}

function watchReplies() {
  type Track = { text: string; stableSince: number; restored: boolean };
  const tracks = new WeakMap<HTMLElement, Track>();

  const scan = () => {
    if (!state.lastCommitment || Object.keys(state.lastTokenMap).length === 0) {
      return;
    }
    const now = Date.now();
    for (const root of assistantRoots()) {
      if (root.getAttribute("data-kachis-restored") === "1") continue;
      const text = root.innerText || "";
      if (!TOKEN_HINT.test(text)) continue;

      const prev = tracks.get(root);
      if (!prev || prev.text !== text) {
        tracks.set(root, { text, stableSince: now, restored: false });
        continue;
      }
      // Wait for streaming to settle (~0.9s unchanged).
      if (now - prev.stableSince < 900 || prev.restored) continue;

      const changed = restoreAssistantDom(root, state.lastTokenMap);
      prev.restored = true;
      if (changed) {
        showBanner("Restored locally — ChatGPT only saw insulated tokens.");
      }
    }
  };

  const obs = new MutationObserver(() => scan());
  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  window.setInterval(scan, 600);
}

function arm() {
  if (state.armed) return;
  state.armed = true;

  document.addEventListener(
    "keydown",
    (event) => {
      if (state.passthrough) return;
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      const composer = findComposer();
      if (!composer) return;
      const t = event.target as Node | null;
      if (!t || (!composer.contains(t) && t !== composer)) return;
      void gateSubmit(event);
    },
    true,
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (state.passthrough) return;
      if (!isSendClick(event.target)) return;
      void gateSubmit(event);
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (state.passthrough) return;
      if (!isSendClick(event.target)) return;
      void gateSubmit(event);
    },
    true,
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (state.passthrough) return;
      const form = event.target as HTMLElement | null;
      if (!form || form.tagName !== "FORM") return;
      if (!findComposer()) return;
      void gateSubmit(event);
    },
    true,
  );

  watchReplies();
  showBanner("Kachis companion active — submits are gated.");
}

arm();

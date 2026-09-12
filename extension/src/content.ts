/**
 * ChatGPT companion: pause Enter / send, shield composer text, inject insulated prompt.
 */
type ShieldOk = {
  ok: true;
  shielded_prompt: string;
  cleaned_commitment: string;
  notary_status: string;
};

type ShieldErr = { ok: false; error: string };

const state = {
  armed: false,
  passthrough: false,
};

function findComposer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("#prompt-textarea") ||
    document.querySelector<HTMLElement>('[contenteditable="true"][data-id]') ||
    document.querySelector<HTMLElement>('div[contenteditable="true"]')
  );
}

function readComposer(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  return (el.innerText || el.textContent || "").trim();
}

function writeComposer(el: HTMLElement, text: string) {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.focus();
  el.textContent = text;
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
}

function findSendButton(): HTMLButtonElement | null {
  return (
    document.querySelector<HTMLButtonElement>('[data-testid="send-button"]') ||
    document.querySelector<HTMLButtonElement>('button[aria-label*="Send"]') ||
    document.querySelector<HTMLButtonElement>('button[data-testid="fruitjuice-send-button"]')
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
  window.setTimeout(() => el.remove(), 4200);
}

async function shieldAndRewrite(composer: HTMLElement): Promise<boolean> {
  const raw = readComposer(composer);
  if (!raw.trim()) return true;

  const response = (await chrome.runtime.sendMessage({
    type: "kachis_shield",
    text: raw,
  })) as ShieldOk | ShieldErr;

  if (!response?.ok) {
    showBanner(response?.error || "Kachis could not shield this paste.", "warn");
    return false;
  }

  if (response.shielded_prompt === raw) {
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
      `Commitment: ${response.cleaned_commitment.slice(0, 18)}…`,
      `Notary: ${response.notary_status}`,
      "",
      "Continue with the shielded prompt?",
    ].join("\n"),
  );

  if (!proceed) {
    showBanner("Submit cancelled — original left in the composer.", "warn");
    return false;
  }

  writeComposer(composer, response.shielded_prompt);
  showBanner("Shielded. Safe to send.");
  return true;
}

function clickSendPassthrough() {
  const send = findSendButton();
  if (!send) return;
  state.passthrough = true;
  send.click();
  window.setTimeout(() => {
    state.passthrough = false;
  }, 0);
}

function arm() {
  if (state.armed) return;
  state.armed = true;

  document.addEventListener(
    "keydown",
    (event) => {
      if (state.passthrough) return;
      if (event.key !== "Enter" || event.shiftKey) return;
      const composer = findComposer();
      if (!composer || !composer.contains(event.target as Node)) return;
      event.preventDefault();
      event.stopPropagation();
      void shieldAndRewrite(composer).then((ok) => {
        if (!ok) return;
        clickSendPassthrough();
      });
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (state.passthrough) return;
      const target = event.target as HTMLElement | null;
      const send =
        target?.closest?.('[data-testid="send-button"]') ||
        target?.closest?.('button[aria-label*="Send"]');
      if (!send) return;
      const composer = findComposer();
      if (!composer) return;
      event.preventDefault();
      event.stopPropagation();
      void shieldAndRewrite(composer).then((ok) => {
        if (!ok) return;
        clickSendPassthrough();
      });
    },
    true,
  );

  showBanner("Kachis companion active on ChatGPT.");
}

arm();

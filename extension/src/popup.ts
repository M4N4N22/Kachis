import {
  PACK_ROWS,
  loadSettings,
  saveSettings,
  type PackToggles,
} from "./settings.ts";

const packsEl = document.getElementById("packs") as HTMLDivElement;
const enabledEl = document.getElementById("enabled") as HTMLInputElement;
const consoleUrlEl = document.getElementById("consoleUrl") as HTMLInputElement;
const seatKeyEl = document.getElementById("seatKey") as HTMLInputElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const verifyBtn = document.getElementById("verify") as HTMLButtonElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

function setStatus(text: string) {
  statusEl.textContent = text;
}

function renderPacks(toggles: PackToggles) {
  packsEl.innerHTML = "";
  for (const row of PACK_ROWS) {
    const wrap = document.createElement("div");
    wrap.className = "pack";
    const text = document.createElement("div");
    const label = document.createElement("label");
    label.htmlFor = row.key;
    label.textContent = row.label;
    const helper = document.createElement("div");
    helper.className = "helper";
    helper.textContent = row.helper;
    text.append(label, helper);

    const sw = document.createElement("label");
    sw.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = row.key;
    input.checked = toggles[row.key];
    input.addEventListener("change", () => {
      void saveSettings({
        toggles: { [row.key]: input.checked } as Partial<PackToggles>,
      }).then(() => setStatus(`${row.label} ${input.checked ? "on" : "off"}`));
    });
    const track = document.createElement("span");
    sw.append(input, track);
    wrap.append(text, sw);
    packsEl.append(wrap);
  }
}

async function hydrate() {
  const settings = await loadSettings();
  enabledEl.checked = settings.enabled;
  consoleUrlEl.value = settings.consoleUrl;
  seatKeyEl.value = settings.seatKey;
  renderPacks(settings.toggles);
  setStatus(
    settings.enabled
      ? "Companion armed on ChatGPT"
      : "Companion paused — enable to shield submits",
  );
}

enabledEl.addEventListener("change", () => {
  void saveSettings({ enabled: enabledEl.checked }).then((next) => {
    setStatus(
      next.enabled
        ? "Companion armed on ChatGPT"
        : "Companion paused — enable to shield submits",
    );
  });
});

saveBtn.addEventListener("click", () => {
  void saveSettings({
    consoleUrl: consoleUrlEl.value.trim(),
    seatKey: seatKeyEl.value.trim(),
    enabled: enabledEl.checked,
  }).then(() => setStatus("Saved."));
});

verifyBtn.addEventListener("click", () => {
  const consoleUrl = consoleUrlEl.value.trim().replace(/\/$/, "");
  const seatKey = seatKeyEl.value.trim();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (seatKey) {
    headers["X-Kachis-Seat-Key"] = seatKey;
    headers.Authorization = `Bearer ${seatKey}`;
  }
  setStatus("Checking…");
  void fetch(`${consoleUrl}/api/agent/health`, { headers })
    .then(async (response) => {
      const body = (await response.json()) as {
        seat?: { authenticated?: boolean; label?: string };
      };
      setStatus(
        response.ok
          ? `Console reachable${
              body.seat?.authenticated ? ` · ${body.seat.label}` : ""
            }`
          : `Failed (${response.status})`,
      );
    })
    .catch(() => setStatus("Console not reachable."));
});

openOptions.addEventListener("click", (event) => {
  event.preventDefault();
  void chrome.runtime.openOptionsPage();
});

void hydrate();

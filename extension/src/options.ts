import {
  PACK_ROWS,
  loadSettings,
  saveSettings,
  type PackToggles,
} from "./settings.ts";

const form = document.getElementById("form") as HTMLFormElement;
const status = document.getElementById("status") as HTMLDivElement;
const verifyBtn = document.getElementById("verify") as HTMLButtonElement;
const packsEl = document.getElementById("packs") as HTMLDivElement;
const enabledEl = document.getElementById("enabled") as HTMLInputElement;

function setStatus(text: string) {
  status.textContent = text;
}

function renderPacks(toggles: PackToggles) {
  packsEl.innerHTML = "";
  for (const row of PACK_ROWS) {
    const wrap = document.createElement("div");
    wrap.className = "row";
    const copy = document.createElement("div");
    copy.className = "copy";
    const label = document.createElement("label");
    label.htmlFor = row.key;
    label.textContent = row.label;
    const helper = document.createElement("div");
    helper.className = "helper";
    helper.textContent = row.helper;
    copy.append(label, helper);

    const sw = document.createElement("label");
    sw.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = row.key;
    input.checked = toggles[row.key];
    const track = document.createElement("span");
    sw.append(input, track);
    wrap.append(copy, sw);
    packsEl.append(wrap);
  }
}

function readToggles(): PackToggles {
  const toggles = {} as PackToggles;
  for (const row of PACK_ROWS) {
    const el = document.getElementById(row.key) as HTMLInputElement | null;
    toggles[row.key] = el?.checked !== false;
  }
  return toggles;
}

async function load() {
  const settings = await loadSettings();
  enabledEl.checked = settings.enabled;
  (form.elements.namedItem("consoleUrl") as HTMLInputElement).value =
    settings.consoleUrl;
  (form.elements.namedItem("seatKey") as HTMLInputElement).value = settings.seatKey;
  renderPacks(settings.toggles);
}

enabledEl.addEventListener("change", () => {
  void saveSettings({ enabled: enabledEl.checked }).then(() =>
    setStatus(enabledEl.checked ? "Companion armed." : "Companion paused."),
  );
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const consoleUrl = (form.elements.namedItem("consoleUrl") as HTMLInputElement).value
    .trim()
    .replace(/\/$/, "");
  const seatKey = (form.elements.namedItem("seatKey") as HTMLInputElement).value.trim();
  void saveSettings({
    consoleUrl,
    seatKey,
    enabled: enabledEl.checked,
    toggles: readToggles(),
  }).then(() => setStatus("Saved."));
});

packsEl.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | null;
  if (!target || target.type !== "checkbox") return;
  void saveSettings({ toggles: readToggles() }).then(() =>
    setStatus("Packs updated."),
  );
});

verifyBtn.addEventListener("click", () => {
  const consoleUrl = (form.elements.namedItem("consoleUrl") as HTMLInputElement).value
    .trim()
    .replace(/\/$/, "");
  const seatKey = (form.elements.namedItem("seatKey") as HTMLInputElement).value.trim();
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
          ? `Console reachable · seat ${
              body.seat?.authenticated ? body.seat.label : "optional"
            }`
          : `Failed (${response.status})`,
      );
    })
    .catch(() => {
      setStatus("Console not reachable.");
    });
});

void load();

const form = document.getElementById("form") as HTMLFormElement;
const status = document.getElementById("status") as HTMLDivElement;
const verifyBtn = document.getElementById("verify") as HTMLButtonElement;

async function load() {
  const stored = await chrome.storage.sync.get({
    consoleUrl: "http://localhost:3000",
    seatKey: "",
    enabled: true,
  });
  (form.elements.namedItem("consoleUrl") as HTMLInputElement).value = stored.consoleUrl;
  (form.elements.namedItem("seatKey") as HTMLInputElement).value = stored.seatKey;
  (form.elements.namedItem("enabled") as HTMLInputElement).checked = stored.enabled !== false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const consoleUrl = (form.elements.namedItem("consoleUrl") as HTMLInputElement).value
    .trim()
    .replace(/\/$/, "");
  const seatKey = (form.elements.namedItem("seatKey") as HTMLInputElement).value.trim();
  const enabled = (form.elements.namedItem("enabled") as HTMLInputElement).checked;
  void chrome.storage.sync.set({ consoleUrl, seatKey, enabled }).then(() => {
    status.textContent = "Saved.";
  });
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
  status.textContent = "Checking…";
  void fetch(`${consoleUrl}/api/agent/health`, { headers })
    .then(async (response) => {
      const body = await response.json();
      status.textContent = response.ok
        ? `Console reachable · seat ${body.seat?.authenticated ? body.seat.label : "optional"}`
        : `Failed (${response.status})`;
    })
    .catch(() => {
      status.textContent = "Console not reachable.";
    });
});

void load();

import { createHash, timingSafeEqual } from "node:crypto";

export type SeatAuth = {
  ok: true;
  seatId: string;
  label: string;
} | {
  ok: false;
  error: string;
  status: 401 | 403;
};

/**
 * Seat keys from env: comma-separated `key` or `key:label` pairs.
 * When KACHIS_SEAT_KEYS is unset/empty, agent/extension sources are allowed without a key (local dev).
 */
export function seatKeysConfigured(): boolean {
  return Boolean(process.env.KACHIS_SEAT_KEYS?.trim());
}

function parseSeatMap(): Map<string, string> {
  const raw = process.env.KACHIS_SEAT_KEYS?.trim() ?? "";
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const part of raw.split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    const colon = entry.indexOf(":");
    if (colon === -1) {
      map.set(entry, "machine");
    } else {
      const key = entry.slice(0, colon).trim();
      const label = entry.slice(colon + 1).trim() || "machine";
      if (key) map.set(key, label);
    }
  }
  return map;
}

function hashSeatKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex").slice(0, 12);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function extractSeatKey(request: Request): string | null {
  const headerKey = request.headers.get("x-kachis-seat-key")?.trim();
  if (headerKey) return headerKey;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

/**
 * Validate seat key for edge sources (agent / extension).
 * Console/wallet paths do not require a seat key.
 */
export function authenticateSeat(
  request: Request,
  source: "agent" | "extension" | "console" | "chain",
): SeatAuth {
  if (source !== "agent" && source !== "extension") {
    return { ok: true, seatId: "console", label: "console" };
  }

  const map = parseSeatMap();
  if (map.size === 0) {
    return { ok: true, seatId: "dev", label: "local-dev" };
  }

  const presented = extractSeatKey(request);
  if (!presented) {
    return {
      ok: false,
      status: 401,
      error: "Machine seat key required. Set X-Kachis-Seat-Key or Authorization: Bearer.",
    };
  }

  for (const [key, label] of map) {
    if (safeEqual(key, presented)) {
      return {
        ok: true,
        seatId: `seat_${hashSeatKey(key)}`,
        label,
      };
    }
  }

  return { ok: false, status: 403, error: "Invalid machine seat key." };
}

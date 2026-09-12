import { promises as fs } from "node:fs";
import path from "node:path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");

export type BetaQuotaSnapshot = {
  day: string;
  used: number;
  limit: number;
  remaining: number;
  available: boolean;
};

type QuotaFile = {
  day: string;
  used: number;
};

/** Process-local fallback when disk writes fail (Vercel /tmp races, cold starts). */
let memoryQuota: QuotaFile | null = null;

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function limitFromEnv() {
  const raw = Number(process.env.KACHIS_BETA_CHAT_LIMIT ?? "10");
  if (!Number.isFinite(raw) || raw < 0) return 10;
  return Math.floor(raw);
}

function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function quotaFilePath() {
  // Vercel serverless FS is read-only except /tmp.
  if (process.env.VERCEL) {
    return path.join("/tmp", "kachis-beta-chat-quota.json");
  }
  return path.join(LOCAL_DATA_DIR, "beta-chat-quota.json");
}

async function ensureLocalDir() {
  if (process.env.VERCEL) return;
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
}

async function readQuotaFile(): Promise<QuotaFile> {
  const day = utcDay();
  if (memoryQuota?.day === day) {
    return { day, used: memoryQuota.used };
  }
  try {
    const raw = await fs.readFile(quotaFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<QuotaFile>;
    if (parsed.day === day && typeof parsed.used === "number") {
      const state = { day, used: Math.max(0, Math.floor(parsed.used)) };
      memoryQuota = state;
      return state;
    }
  } catch {
    /* fresh day / missing file */
  }
  const fresh = { day, used: 0 };
  memoryQuota = fresh;
  return fresh;
}

async function writeQuotaFile(state: QuotaFile) {
  memoryQuota = state;
  try {
    await ensureLocalDir();
    await fs.writeFile(quotaFilePath(), JSON.stringify(state, null, 2), "utf8");
  } catch (error) {
    // Do not fail Confirm & Send — quota still tracks in-memory for this instance.
    console.error("[kachis] beta quota persist failed", error);
  }
}

function toSnapshot(state: QuotaFile, limit: number, available: boolean): BetaQuotaSnapshot {
  return {
    day: state.day,
    used: state.used,
    limit,
    remaining: Math.max(0, limit - state.used),
    available,
  };
}

export async function getBetaQuota(): Promise<BetaQuotaSnapshot> {
  const limit = limitFromEnv();
  const available = geminiConfigured() && limit > 0;
  const state = await readQuotaFile();
  return toSnapshot(state, limit, available);
}

/** Consume one beta slot. Returns null when offline or exhausted. */
export async function consumeBetaQuota(): Promise<BetaQuotaSnapshot | null> {
  const limit = limitFromEnv();
  if (!geminiConfigured() || limit <= 0) return null;

  const state = await readQuotaFile();
  if (state.used >= limit) return null;

  const next = { day: state.day, used: state.used + 1 };
  await writeQuotaFile(next);
  return toSnapshot(next, limit, true);
}

/** Refund one slot after a failed hosted inference (same UTC day only). */
export async function refundBetaQuota(): Promise<BetaQuotaSnapshot> {
  const limit = limitFromEnv();
  const available = geminiConfigured() && limit > 0;
  const state = await readQuotaFile();
  const next = { day: state.day, used: Math.max(0, state.used - 1) };
  await writeQuotaFile(next);
  return toSnapshot(next, limit, available);
}

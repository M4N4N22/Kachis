import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const QUOTA_FILE = path.join(DATA_DIR, "beta-chat-quota.json");

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

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readQuotaFile(): Promise<QuotaFile> {
  const day = utcDay();
  try {
    const raw = await fs.readFile(QUOTA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<QuotaFile>;
    if (parsed.day === day && typeof parsed.used === "number") {
      return { day, used: Math.max(0, Math.floor(parsed.used)) };
    }
  } catch {
    /* fresh day / missing file */
  }
  return { day, used: 0 };
}

async function writeQuotaFile(state: QuotaFile) {
  await ensureDir();
  await fs.writeFile(QUOTA_FILE, JSON.stringify(state, null, 2), "utf8");
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

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROOT = path.join(process.cwd(), "compact", "managed", "kachis-guardrail");

function resolveSafe(segments: string[]) {
  const target = path.resolve(ROOT, ...segments);
  if (!target.startsWith(path.resolve(ROOT))) return null;
  return target;
}

async function artifactExists(segments: string[]) {
  const primary = resolveSafe(segments);
  if (!primary) return false;
  try {
    await fs.access(primary);
    return true;
  } catch {
    const last = segments[segments.length - 1];
    if (last?.endsWith(".bzkir")) {
      const alt = resolveSafe([...segments.slice(0, -1), last.replace(/\.bzkir$/, ".zkir")]);
      if (alt) {
        try {
          await fs.access(alt);
          return true;
        } catch {
          return false;
        }
      }
    }
    if (last?.endsWith(".zkir")) {
      const alt = resolveSafe([...segments.slice(0, -1), last.replace(/\.zkir$/, ".bzkir")]);
      if (alt) {
        try {
          await fs.access(alt);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
}

async function readArtifact(segments: string[]) {
  const primary = resolveSafe(segments);
  if (!primary) return null;
  try {
    return await fs.readFile(primary);
  } catch {
    const last = segments[segments.length - 1];
    if (last?.endsWith(".bzkir")) {
      const alt = resolveSafe([...segments.slice(0, -1), last.replace(/\.bzkir$/, ".zkir")]);
      if (alt) {
        try {
          return await fs.readFile(alt);
        } catch {
          return null;
        }
      }
    }
    if (last?.endsWith(".zkir")) {
      const alt = resolveSafe([...segments.slice(0, -1), last.replace(/\.zkir$/, ".bzkir")]);
      if (alt) {
        try {
          return await fs.readFile(alt);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const exists = await artifactExists(segments ?? []);
  return new NextResponse(null, { status: exists ? 200 : 404 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const bytes = await readArtifact(segments ?? []);
  if (!bytes) {
    return NextResponse.json({ error: "ZK artifact missing. Run compact compile." }, { status: 404 });
  }
  const name = segments[segments.length - 1] ?? "artifact";
  const type = name.endsWith(".js")
    ? "text/javascript"
    : name.endsWith(".json")
      ? "application/json"
      : "application/octet-stream";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=60",
    },
  });
}

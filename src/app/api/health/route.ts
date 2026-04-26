import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkModelEndpoint(baseUrl: string): Promise<{ ok: boolean; detail: string }> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/health`;
  const timeoutMs = 2000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, detail: `model health returned ${res.status}` };
    }
    return { ok: true, detail: "reachable" };
  } catch {
    clearTimeout(timeout);
    return { ok: false, detail: "unreachable" };
  }
}

export async function GET() {
  const localModelBase = process.env.NEXT_PUBLIC_LOCAL_LLM_URL?.trim() || "http://localhost:8001";
  const modelHealth = await checkModelEndpoint(localModelBase);
  const authDisabled =
    process.env.NEXT_PUBLIC_DISABLE_AUTH === "1" ||
    process.env.NEXT_PUBLIC_DISABLE_AUTH?.toLowerCase() === "true";

  const payload = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    checks: {
      app: { ok: true, detail: "running" },
      groqApiKeyConfigured: Boolean(process.env.GROQ_API_KEY?.trim()),
      clerkConfigured:
        !authDisabled &&
        Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
        Boolean(process.env.CLERK_SECRET_KEY?.trim()),
      githubConfigured:
        Boolean(process.env.GITHUB_OWNER?.trim()) && Boolean(process.env.GITHUB_TOKEN?.trim()),
      localModel: modelHealth,
    },
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

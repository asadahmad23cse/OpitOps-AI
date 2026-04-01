import { NextResponse } from "next/server";
import type { ModelStatusPayload } from "@/lib/local-llm";

export const runtime = "nodejs";

const DEFAULT_HEALTH = "http://127.0.0.1:8001/health";

function localBase(): string {
  const u = process.env.NEXT_PUBLIC_LOCAL_LLM_URL?.trim() || "http://localhost:8001";
  return u.replace(/\/$/, "");
}

export async function GET() {
  const url = `${localBase()}/health`;
  const timeoutMs = 2500;

  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      signal: ac.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);

    if (!res.ok) {
      const body: ModelStatusPayload = {
        status: "offline",
        model: "Qwen/Qwen2.5-0.5B-Instruct",
        detail: `Health endpoint returned ${res.status}`,
      };
      return NextResponse.json(body);
    }

    const data = (await res.json()) as {
      status?: string;
      model?: string;
      adapter_loaded?: boolean;
      error?: string | null;
    };

    const srv = data.status ?? "unknown";
    const isReady = srv === "ready";

    const body: ModelStatusPayload = {
      status: isReady ? "online" : "offline",
      model: typeof data.model === "string" && data.model ? data.model : "Qwen/Qwen2.5-0.5B-Instruct",
      adapter_loaded: Boolean(data.adapter_loaded),
      server_status: srv,
      detail:
        srv === "loading"
          ? "Model is still loading on the inference server."
          : srv === "error"
            ? data.error ?? "Inference server reported an error state."
            : undefined,
    };
    return NextResponse.json(body);
  } catch {
    const body: ModelStatusPayload = {
      status: "offline",
      model: "Qwen/Qwen2.5-0.5B-Instruct",
      detail: `Unreachable (${DEFAULT_HEALTH}). Is the server running?`,
    };
    return NextResponse.json(body);
  }
}

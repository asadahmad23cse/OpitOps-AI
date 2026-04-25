import { NextResponse } from "next/server";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { buildLiveSystemContext } from "@/lib/context-builder";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT =
  "You are an AI assistant for OptiOps AI, a DevOps/SRE dashboard. You help users understand infrastructure health, alerts, deployments, costs (in Indian Rupees / INR), and logs. Be concise and technical.";

const TOOL_POLICY_PROMPT = [
  "TOOL POLICY:",
  "1) All operational tools are confirmation-first.",
  "2) Before requesting a tool call approval, first explain what you plan to do and why.",
  "3) After a tool executes, clearly summarize the outcome with exact values from tool output.",
].join("\n");

const MODEL = "llama-3.3-70b-versatile";

const scaleServiceInputSchema = z.object({
  serviceName: z.string().min(1, "serviceName is required").max(128),
  replicas: z.number().int().min(1).max(500),
});

const flushCacheInputSchema = z.object({
  cacheType: z.enum(["redis", "memcached"]),
});

const rollbackDeploymentInputSchema = z.object({
  deploymentId: z.string().min(1, "deploymentId is required").max(128),
  reason: z.string().min(3, "reason is required").max(400),
});

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function simulatedItemsCleared(cacheType: "redis" | "memcached"): number {
  const base = cacheType === "redis" ? 2400 : 1300;
  const jitter = hashSeed(`${cacheType}-${new Date().toISOString().slice(0, 16)}`) % 300;
  return base + jitter;
}

function simulatedPreviousVersion(deploymentId: string): string {
  const seed = hashSeed(deploymentId);
  const major = (seed % 3) + 1;
  const minor = (Math.floor(seed / 10) % 20) + 1;
  const patch = (Math.floor(seed / 100) % 30) + 1;
  return `v${major}.${minor}.${patch}`;
}

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: "api-ai-chat",
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many requests. Please retry shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSec),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === "your_groq_key_here") {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          "Groq API key is not configured. Add GROQ_API_KEY to your .env.local file (get a key from console.groq.com), then restart the dev server.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[] } | null = null;
  try {
    body = (await req.json()) as { messages?: UIMessage[] };
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "invalid_messages", message: "Provide a non-empty messages array." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const cookieHeader = req.headers.get("cookie");
  const liveContext = await buildLiveSystemContext(origin, cookieHeader);
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${TOOL_POLICY_PROMPT}\n\n${liveContext}`;

  const groq = createGroq({ apiKey });

  try {
    const result = streamText({
      model: groq(MODEL),
      messages: await convertToModelMessages(messages),
      system: systemPrompt,
      stopWhen: stepCountIs(6),
      tools: {
        scaleService: tool({
          description:
            "Scale a named service to a target replica count. Always explain plan and request approval before execution.",
          inputSchema: scaleServiceInputSchema,
          needsApproval: true,
          execute: async ({ serviceName, replicas }) => {
            return {
              success: true,
              serviceName,
              newReplicaCount: replicas,
            };
          },
        }),
        flushCache: tool({
          description:
            "Flush a cache layer (redis or memcached). Always explain impact and request approval before execution.",
          inputSchema: flushCacheInputSchema,
          needsApproval: true,
          execute: async ({ cacheType }) => {
            return {
              success: true,
              cacheType,
              itemsCleared: simulatedItemsCleared(cacheType),
            };
          },
        }),
        rollbackDeployment: tool({
          description:
            "Rollback a deployment to a previous version with a reason. Always explain rollback intent and request approval before execution.",
          inputSchema: rollbackDeploymentInputSchema,
          needsApproval: true,
          execute: async ({ deploymentId, reason }) => {
            return {
              success: true,
              deploymentId,
              reason,
              previousVersion: simulatedPreviousVersion(deploymentId),
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq request failed.";
    return NextResponse.json({ error: "groq_error", message: msg }, { status: 502 });
  }
}

import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are an AI assistant for OptiOps AI, a DevOps/SRE dashboard. You help users understand their infrastructure health, alerts, deployments, costs, and logs. Be concise and technical.";

const MODEL = "llama-3.3-70b-versatile";

type ChatRole = "user" | "assistant";

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be JSON." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "invalid_messages", message: "Provide a non-empty messages array." },
      { status: 400 },
    );
  }

  const normalized: GroqMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    const content = (m as { content?: string }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    normalized.push({ role: role as ChatRole, content });
  }

  if (normalized.length === 0) {
    return NextResponse.json(
      { error: "invalid_messages", message: "No valid user/assistant messages with content." },
      { status: 400 },
    );
  }

  if (normalized[0].role !== "user") {
    return NextResponse.json(
      {
        error: "invalid_messages",
        message: "Conversation must start with a user message.",
      },
      { status: 400 },
    );
  }

  const groqMessages: GroqMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...normalized];

  const groq = new Groq({ apiKey });

  try {
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: groqMessages,
      stream: true,
      max_tokens: 8192,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          try {
            controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
            controller.close();
          } catch {
            controller.error(e);
          }
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq request failed.";
    return NextResponse.json({ error: "groq_error", message: msg }, { status: 502 });
  }
}

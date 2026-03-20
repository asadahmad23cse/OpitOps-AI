"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Bot, User, Sparkles, AlertCircle, Rocket, DollarSign, Activity, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  { icon: AlertCircle, text: "Why did health score drop?", color: "text-red-400 bg-red-500/10" },
  { icon: AlertCircle, text: "Show critical alerts", color: "text-orange-400 bg-orange-500/10" },
  { icon: DollarSign, text: "How can I reduce EC2 cost?", color: "text-emerald-400 bg-emerald-500/10" },
  { icon: Rocket, text: "Which deployment failed today?", color: "text-cyan-400 bg-cyan-500/10" },
  { icon: Activity, text: "Show infrastructure status", color: "text-blue-400 bg-blue-500/10" },
  { icon: Sparkles, text: "What optimizations are recommended?", color: "text-purple-400 bg-purple-500/10" },
];

/** Strip leading assistant bubbles so the API always receives user-first history. */
function buildApiMessages(msgs: Message[]): { role: "user" | "assistant"; content: string }[] {
  const withContent = msgs.filter((m) => m.content.trim().length > 0);
  let start = 0;
  while (start < withContent.length && withContent[start].role === "assistant") start++;
  return withContent.slice(start).map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));
}

function EnhancedAIAssistantInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content:
        "Hello! I'm your AI DevOps assistant (Groq / Llama). Ask about infrastructure health, alerts, deployments, costs, logs, or optimizations.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedPromptRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text ?? input).trim();
      if (!messageText || isSending) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };
      const assistantId = `a-${Date.now() + 1}`;
      const assistantPlaceholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const historyForApi = buildApiMessages([...messages, userMsg]);

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setIsSending(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi }),
        });

        if (!res.ok) {
          let errText = "Sorry, something went wrong. Please try again.";
          try {
            const data = (await res.json()) as { message?: string; error?: string };
            if (data?.message) errText = data.message;
          } catch {
            /* ignore */
          }
          setMessages((p) =>
            p.map((m) => (m.id === assistantId ? { ...m, content: errText } : m)),
          );
          return;
        }

        if (!res.body) {
          setMessages((p) =>
            p.map((m) =>
              m.id === assistantId ? { ...m, content: "No response body from server." } : m,
            ),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          setMessages((p) =>
            p.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        }

        const tail = decoder.decode();
        if (tail) {
          setMessages((p) =>
            p.map((m) => (m.id === assistantId ? { ...m, content: m.content + tail } : m)),
          );
        }
      } catch {
        setMessages((p) =>
          p.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Network error. Check your connection and try again." }
              : m,
          ),
        );
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, messages],
  );

  // Prefill from ?prompt= (e.g. Infrastructure map → AI Analyze)
  useEffect(() => {
    if (consumedPromptRef.current) return;
    const prompt = searchParams.get("prompt");
    if (!prompt?.trim()) return;
    consumedPromptRef.current = true;
    const decoded = decodeURIComponent(prompt.replace(/\+/g, " "));
    void handleSend(decoded);
  }, [searchParams, handleSend]);

  return (
    <div className="grid grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
      <div className="col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-black" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-xl p-4 ${
                  msg.role === "user"
                    ? "bg-cyan-500/20 border border-cyan-500/30"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed flex items-start gap-2">
                  {msg.role === "assistant" && isSending && !msg.content && (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                  )}
                  <span>
                    {msg.content ||
                      (msg.role === "assistant" && isSending ? " " : "")}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your infrastructure..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              suppressHydrationWarning
            />
            <button
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-xl text-black font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Suggested Prompts</h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt.text}
                onClick={() => handleSend(prompt.text)}
                disabled={isSending}
                className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg text-left hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
                suppressHydrationWarning
              >
                <div className={`p-1.5 rounded-lg ${prompt.color}`}>
                  <prompt.icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-300">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Capabilities</h3>
          <ul className="space-y-1.5 text-xs text-gray-400">
            <li>• Powered by Groq — llama-3.3-70b-versatile (streaming)</li>
            <li>• Infrastructure &amp; SRE guidance</li>
            <li>• Alerts, deployments, cost, logs</li>
            <li>• Concise technical answers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function EnhancedAIAssistant() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-16rem)] flex items-center justify-center text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <EnhancedAIAssistantInner />
    </Suspense>
  );
}

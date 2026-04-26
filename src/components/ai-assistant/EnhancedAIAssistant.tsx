"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Rocket,
  IndianRupee,
  Activity,
  Loader2,
  Cloud,
  Cpu,
  History,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { ToolConfirmationCard, type ToolCardState } from "@/components/ToolConfirmationCard";
import { cn } from "@/lib/utils";
import {
  CHAT_PROVIDER_CHANGED_EVENT,
  CHAT_PROVIDER_STORAGE_KEY,
  getLocalLlmBaseUrl,
  LOCAL_LLM_START_HELP,
  type ChatProviderMode,
} from "@/lib/local-llm";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface StoredChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatHistoryItem {
  id: string;
  provider: ChatProviderMode;
  title: string;
  updatedAt: string;
  messages: StoredChatMessage[];
}

type MessagePart = UIMessage["parts"][number];

type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

interface ToolPart {
  type: string;
  toolCallId: string;
  state: ToolPartState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: {
    id: string;
    approved?: boolean;
    reason?: string;
  };
  toolName?: string;
}

const GROQ_WELCOME_MESSAGE: UIMessage = {
  id: "assistant-groq-welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hello! I'm your AI DevOps assistant. Choose Cloud Llama 3.3 70B or the local fine-tuned model, then ask about infrastructure, alerts, deployments, costs, or logs.",
    },
  ],
};

const LOCAL_WELCOME_MESSAGE: LocalMessage = {
  id: "assistant-local-welcome",
  role: "assistant",
  content:
    "Hello! I'm your AI DevOps assistant. Choose Cloud Llama 3.3 70B or the local fine-tuned model, then ask about infrastructure, alerts, deployments, costs, or logs.",
};

const suggestedPrompts = [
  { icon: AlertCircle, text: "Why did health score drop?", color: "text-red-400 bg-red-500/10" },
  { icon: AlertCircle, text: "Show critical alerts", color: "text-orange-400 bg-orange-500/10" },
  { icon: IndianRupee, text: "How can I reduce EC2 cost?", color: "text-emerald-400 bg-emerald-500/10" },
  { icon: Rocket, text: "Which deployment failed today?", color: "text-cyan-400 bg-cyan-500/10" },
  { icon: Activity, text: "Show infrastructure status", color: "text-blue-400 bg-blue-500/10" },
  { icon: Sparkles, text: "What optimizations are recommended?", color: "text-purple-400 bg-purple-500/10" },
];

const CHAT_HISTORY_STORAGE_KEY = "optiops-ai-chat-history";
const CHAT_HISTORY_LIMIT = 20;

/** Strip leading assistant bubbles so the API always receives user-first history. */
function buildApiMessages(msgs: LocalMessage[]): { role: "user" | "assistant"; content: string }[] {
  const withContent = msgs.filter((m) => m.content.trim().length > 0);
  let start = 0;
  while (start < withContent.length && withContent[start].role === "assistant") start++;
  return withContent.slice(start).map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));
}

function isTextPart(part: MessagePart): part is Extract<MessagePart, { type: "text" }> {
  return part.type === "text";
}

function getMessageText(msg: UIMessage): string {
  return msg.parts.filter(isTextPart).map((part) => part.text).join("").trim();
}

function createHistoryTitle(messages: StoredChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  const source = firstUser?.content || messages.find((m) => m.content.trim())?.content || "New chat";
  return source.length > 52 ? `${source.slice(0, 49)}...` : source;
}

function readChatHistory(): ChatHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertHistoryItem(items: ChatHistoryItem[], item: ChatHistoryItem): ChatHistoryItem[] {
  const next = [item, ...items.filter((entry) => entry.id !== item.id)];
  return next.slice(0, CHAT_HISTORY_LIMIT);
}

function formatHistoryTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toGroqHistoryMessages(messages: UIMessage[]): StoredChatMessage[] {
  return messages
    .filter((msg) => msg.id !== GROQ_WELCOME_MESSAGE.id)
    .map<StoredChatMessage>((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: getMessageText(msg),
    }))
    .filter((msg) => msg.content.trim().length > 0);
}

function toLocalHistoryMessages(messages: LocalMessage[]): StoredChatMessage[] {
  return messages
    .filter((msg) => msg.id !== LOCAL_WELCOME_MESSAGE.id)
    .map<StoredChatMessage>((msg) => ({
      role: msg.role,
      content: msg.content.trim(),
      timestamp: msg.timestamp?.toISOString(),
    }))
    .filter((msg) => msg.content.length > 0);
}

function asToolPart(part: MessagePart): ToolPart | null {
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    return part as unknown as ToolPart;
  }
  return null;
}

function getToolActionName(toolPart: ToolPart): string {
  if (toolPart.type === "dynamic-tool" && toolPart.toolName) {
    return toolPart.toolName;
  }
  return toolPart.type.replace(/^tool-/, "");
}

function getToolCardState(toolPart: ToolPart): ToolCardState {
  switch (toolPart.state) {
    case "approval-requested":
      return "pending";
    case "approval-responded":
      return toolPart.approval?.approved === false ? "denied" : "executing";
    case "output-available":
      return "completed";
    case "output-error":
      return "error";
    case "output-denied":
      return "denied";
    case "input-streaming":
    case "input-available":
    default:
      return "executing";
  }
}

type LocalServerState = "checking" | "online" | "offline";

function EnhancedAIAssistantInner() {
  const searchParams = useSearchParams();
  const [provider, setProvider] = useState<ChatProviderMode>("groq");
  const [localServerState, setLocalServerState] = useState<LocalServerState>("checking");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([LOCAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [localIsSending, setLocalIsSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consumedPromptRef = useRef(false);
  const sessionIdRef = useRef(`session-${Date.now()}`);

  const {
    messages: groqMessages,
    sendMessage: sendGroqMessage,
    addToolApprovalResponse,
    status: groqStatus,
    error: groqError,
    clearError: clearGroqError,
  } = useChat({
    messages: [GROQ_WELCOME_MESSAGE],
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const isGroqSending = groqStatus === "submitted" || groqStatus === "streaming";
  const isSending = provider === "groq" ? isGroqSending : localIsSending;
  const selectedHistory = selectedHistoryId
    ? chatHistory.find((entry) => entry.id === selectedHistoryId)
    : null;

  useEffect(() => {
    const stored = window.localStorage.getItem(CHAT_PROVIDER_STORAGE_KEY);
    if (stored === "local" || stored === "groq") setProvider(stored);
    const storedHistory = readChatHistory();
    setChatHistory(storedHistory);
    setSelectedHistoryId(storedHistory[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (groqStatus === "streaming" || groqStatus === "submitted") return;
    const historyMessages = toGroqHistoryMessages(groqMessages);
    if (!historyMessages.some((msg) => msg.role === "user")) return;

    const item: ChatHistoryItem = {
      id: `groq-${sessionIdRef.current}`,
      provider: "groq",
      title: createHistoryTitle(historyMessages),
      updatedAt: new Date().toISOString(),
      messages: historyMessages,
    };

    setChatHistory((prev) => {
      const next = upsertHistoryItem(prev, item);
      window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [groqMessages, groqStatus]);

  useEffect(() => {
    if (localIsSending) return;
    const historyMessages = toLocalHistoryMessages(localMessages);
    if (!historyMessages.some((msg) => msg.role === "user")) return;

    const item: ChatHistoryItem = {
      id: `local-${sessionIdRef.current}`,
      provider: "local",
      title: createHistoryTitle(historyMessages),
      updatedAt: new Date().toISOString(),
      messages: historyMessages,
    };

    setChatHistory((prev) => {
      const next = upsertHistoryItem(prev, item);
      window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [localMessages, localIsSending]);

  useEffect(() => {
    const sync = () => {
      const v = window.localStorage.getItem(CHAT_PROVIDER_STORAGE_KEY);
      if (v === "local" || v === "groq") setProvider(v);
    };
    window.addEventListener(CHAT_PROVIDER_CHANGED_EVENT, sync);
    return () => window.removeEventListener(CHAT_PROVIDER_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/model-status", { cache: "no-store" });
        const j = (await res.json()) as { status?: string };
        if (!cancelled) setLocalServerState(j.status === "online" ? "online" : "offline");
      } catch {
        if (!cancelled) setLocalServerState("offline");
      }
    };
    void tick();
    const id = setInterval(tick, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [provider, groqMessages, localMessages]);

  const setProviderAndStore = useCallback((mode: ChatProviderMode) => {
    setProvider(mode);
    window.localStorage.setItem(CHAT_PROVIDER_STORAGE_KEY, mode);
    window.dispatchEvent(new Event(CHAT_PROVIDER_CHANGED_EVENT));
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text ?? input).trim();
      const busy = provider === "groq" ? isGroqSending : localIsSending;
      if (!messageText || busy) return;

      if (provider === "groq") {
        clearGroqError();
        setInput("");
        await sendGroqMessage({ text: messageText });
        return;
      }

      const userMsg: LocalMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };
      const assistantId = `a-${Date.now() + 1}`;
      const assistantPlaceholder: LocalMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const historyForApi = buildApiMessages([...localMessages, userMsg]);

      setLocalMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setLocalIsSending(true);

      try {
        const base = getLocalLlmBaseUrl();
        const last = historyForApi[historyForApi.length - 1];
        if (!last || last.role !== "user") {
          setLocalMessages((p) =>
            p.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Conversation must end with a user message for the local model." }
                : m,
            ),
          );
          return;
        }
        const hist = historyForApi.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const res = await fetch(`${base}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: last.content, history: hist }),
        });

        if (!res.ok) {
          let msg = LOCAL_LLM_START_HELP;
          try {
            const raw = (await res.json()) as { detail?: unknown };
            const d = raw.detail;
            if (typeof d === "string") {
              msg = d.includes("loading") ? `${d} Wait briefly after server start, then retry.` : d;
            } else if (Array.isArray(d) && d.length > 0) {
              const first = d[0] as { msg?: string };
              if (typeof first.msg === "string") msg = first.msg;
            }
          } catch {
            msg = LOCAL_LLM_START_HELP;
          }
          setLocalMessages((p) => p.map((m) => (m.id === assistantId ? { ...m, content: msg } : m)));
          setLocalServerState("offline");
          return;
        }

        const data = (await res.json()) as { response?: string };
        const out = typeof data.response === "string" ? data.response : "Empty response from local model.";
        setLocalMessages((p) => p.map((m) => (m.id === assistantId ? { ...m, content: out } : m)));
        setLocalServerState("online");
      } catch {
        setLocalMessages((p) =>
          p.map((m) =>
            m.id === assistantId
              ? { ...m, content: LOCAL_LLM_START_HELP }
              : m,
          ),
        );
        setLocalServerState("offline");
      } finally {
        setLocalIsSending(false);
      }
    },
    [input, provider, isGroqSending, localIsSending, sendGroqMessage, clearGroqError, localMessages],
  );

  useEffect(() => {
    if (consumedPromptRef.current) return;
    const prompt = searchParams.get("prompt");
    if (!prompt?.trim()) return;
    consumedPromptRef.current = true;
    const decoded = decodeURIComponent(prompt.replace(/\+/g, " "));
    void handleSend(decoded);
  }, [searchParams, handleSend]);

  const localUrl = getLocalLlmBaseUrl();

  return (
    <div className="grid grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
      <div className="col-span-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-black/25 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">Model</p>
            <div className="inline-flex rounded-xl border border-white/10 p-0.5 bg-white/5">
              <button
                type="button"
                onClick={() => setProviderAndStore("groq")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  provider === "groq"
                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-400 hover:text-white",
                )}
                suppressHydrationWarning
              >
                <Cloud className="w-3.5 h-3.5" />
                Llama 3.3 70B
              </button>
              <button
                type="button"
                onClick={() => setProviderAndStore("local")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  provider === "local"
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-400 hover:text-white",
                )}
                suppressHydrationWarning
              >
                <Cpu className="w-3.5 h-3.5" />
                Fine-tuned
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              <span className="text-gray-500">Active:</span>{" "}
              <span className="text-white">
                {provider === "groq" ? "Cloud - Llama 3.3 70B (stream)" : "Local - Qwen2.5-0.5B + QLoRA"}
              </span>
            </p>
            {provider === "local" ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-gray-500">Local server:</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    localServerState === "online" && "text-emerald-400",
                    localServerState === "offline" && "text-red-400",
                    localServerState === "checking" && "text-amber-400",
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      localServerState === "online" && "bg-emerald-400",
                      localServerState === "offline" && "bg-red-400",
                      localServerState === "checking" && "bg-amber-400 animate-pulse",
                    )}
                  />
                  {localServerState === "online"
                    ? "Connected"
                    : localServerState === "checking"
                      ? "Checking..."
                      : "Disconnected"}
                </span>
                <span className="text-gray-600 font-mono text-[10px]">{localUrl}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {provider === "groq" ? (
            <>
              {groqMessages.map((msg, messageIndex) => {
                const textContent = msg.parts.filter(isTextPart).map((part) => part.text).join("");
                const toolParts = msg.parts.map(asToolPart).filter((part): part is ToolPart => part !== null);
                const isLatestAssistant = msg.role === "assistant" && messageIndex === groqMessages.length - 1;
                const showAssistantSpinner =
                  isLatestAssistant &&
                  isGroqSending &&
                  textContent.trim().length === 0 &&
                  toolParts.length === 0;

                return (
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
                      {textContent.trim().length > 0 || showAssistantSpinner ? (
                        <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed flex items-start gap-2">
                          {showAssistantSpinner && (
                            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                          )}
                          <span>{textContent || " "}</span>
                        </div>
                      ) : null}

                      {toolParts.length > 0 ? (
                        <div className={cn("space-y-2", textContent.trim().length > 0 ? "mt-3" : "")}>
                          {toolParts.map((toolPart, toolPartIndex) => {
                            const action = getToolActionName(toolPart);
                            const state = getToolCardState(toolPart);
                            const approvalId = toolPart.approval?.id;
                            const canApprove = state === "pending" && !!approvalId;
                            return (
                              <ToolConfirmationCard
                                key={`${msg.id}-${toolPart.toolCallId}-${toolPartIndex}`}
                                action={action}
                                parameters={toolPart.input}
                                state={state}
                                result={toolPart.output}
                                errorText={toolPart.errorText ?? toolPart.approval?.reason}
                                onApprove={
                                  canApprove
                                    ? () => {
                                        void addToolApprovalResponse({ id: approvalId, approved: true });
                                      }
                                    : undefined
                                }
                                onDeny={
                                  canApprove
                                    ? () => {
                                        void addToolApprovalResponse({
                                          id: approvalId,
                                          approved: false,
                                          reason: "Denied by user from UI",
                                        });
                                      }
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {localMessages.map((msg) => (
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
                      {msg.role === "assistant" && localIsSending && !msg.content && (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                      )}
                      <span>
                        {msg.content ||
                          (msg.role === "assistant" && localIsSending ? " " : "")}
                      </span>
                    </div>
                    {msg.timestamp ? (
                      <p className="text-xs text-gray-600 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
                    ) : null}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {provider === "groq" && groqError ? (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {groqError.message}
            </div>
          ) : null}
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
                  void handleSend();
                }
              }}
              placeholder="Ask about your infrastructure..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              suppressHydrationWarning
            />
            <button
              onClick={() => {
                void handleSend();
              }}
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
          <button
            type="button"
            onClick={() => setHistoryOpen((value) => !value)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <History className="w-4 h-4 text-cyan-400" />
              Chat History
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400">
              {chatHistory.length}
            </span>
          </button>

          {historyOpen ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">Recent conversations</p>
                {chatHistory.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
                      setChatHistory([]);
                      setSelectedHistoryId(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                ) : null}
              </div>

              {chatHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                  Ask a question to create your first saved chat.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {chatHistory.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedHistoryId(entry.id)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-all",
                        selectedHistory?.id === entry.id
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <p className="text-xs font-medium text-gray-200 truncate">{entry.title}</p>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                        <span>{entry.provider === "groq" ? "Cloud" : "Fine-tuned"}</span>
                        <span>{formatHistoryTime(entry.updatedAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedHistory ? (
                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-300 truncate">{selectedHistory.title}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryId(null)}
                      className="text-gray-500 hover:text-gray-300"
                      aria-label="Close history preview"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedHistory.messages.map((message, index) => (
                      <div
                        key={`${selectedHistory.id}-${index}`}
                        className={cn(
                          "rounded-md px-2.5 py-2 text-xs leading-relaxed",
                          message.role === "user"
                            ? "bg-cyan-500/10 text-cyan-100 border border-cyan-500/20"
                            : "bg-white/5 text-gray-300 border border-white/10",
                        )}
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">
                          {message.role === "user" ? "You" : "Assistant"}
                        </p>
                        <p className="line-clamp-5 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Suggested Prompts</h3>
          <div className="space-y-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt.text}
                onClick={() => {
                  void handleSend(prompt.text);
                }}
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
            <li>- Cloud Llama 3.3 70B: live dashboard context (streaming + tool approvals)</li>
            <li>- Local: Qwen2.5-0.5B + optional QLoRA at port 8001</li>
            <li>- Infrastructure and SRE guidance with INR cost hints</li>
            <li>- Start server: <code className="text-cyan-500/90">cd ml/server &amp;&amp; uvicorn inference_server:app --port 8001</code></li>
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

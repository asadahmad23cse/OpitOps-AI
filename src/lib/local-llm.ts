/** Browser + server: base URL for the local FastAPI inference server. */
export function getLocalLlmBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_LOCAL_LLM_URL
      ? process.env.NEXT_PUBLIC_LOCAL_LLM_URL.trim()
      : "";
  return (fromEnv || "http://localhost:8001").replace(/\/$/, "");
}

export const CHAT_PROVIDER_STORAGE_KEY = "optiops-chat-provider";

export type ChatProviderMode = "groq" | "local";

export function readStoredChatProvider(): ChatProviderMode {
  if (typeof window === "undefined") return "groq";
  const v = window.localStorage.getItem(CHAT_PROVIDER_STORAGE_KEY);
  return v === "local" ? "local" : "groq";
}

export function writeStoredChatProvider(mode: ChatProviderMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_PROVIDER_STORAGE_KEY, mode);
}

/** Exact copy for UI errors (assignment / onboarding). */
export const LOCAL_LLM_START_HELP =
  "Local model not running. Start with: uvicorn ml/server/inference_server:app --port 8001";

/** Fired on `window` when AI Assistant changes provider (same-tab sync). */
export const CHAT_PROVIDER_CHANGED_EVENT = "optiops-chat-provider-changed";

export type ModelStatusPayload = {
  status: "online" | "offline";
  model: string;
  adapter_loaded?: boolean;
  server_status?: string;
  detail?: string;
};

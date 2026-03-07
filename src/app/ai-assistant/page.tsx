import { EnhancedAIAssistant } from "@/components/ai-assistant/EnhancedAIAssistant";

export default function AIAssistantPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">AI Assistant</h1>
        <p className="text-gray-400">Get intelligent help with DevOps tasks and optimization</p>
      </div>
      <EnhancedAIAssistant />
    </>
  );
}

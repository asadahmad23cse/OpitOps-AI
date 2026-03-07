import { TopKPIBar } from "@/components/monitoring/TopKPIBar";
import { LogsAnalysis } from "@/components/logs/LogsAnalysis";

export default function LogsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Logs & Error Analysis</h1>
        <p className="text-gray-400">Real-time log streaming with AI-powered troubleshooting</p>
      </div>
      <TopKPIBar />
      <LogsAnalysis />
    </>
  );
}

import { TopKPIBar } from "@/components/monitoring/TopKPIBar";
import { MonitoringCharts } from "@/components/monitoring/MonitoringCharts";
import { AlertsIncidentCenter } from "@/components/monitoring/AlertsIncidentCenter";

export default function MonitoringPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">System Monitoring</h1>
        <p className="text-gray-400">Real-time performance metrics and analytics</p>
      </div>
      <TopKPIBar />
      <MonitoringCharts />
      <AlertsIncidentCenter />
    </>
  );
}

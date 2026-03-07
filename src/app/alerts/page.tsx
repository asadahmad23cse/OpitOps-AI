import { AlertsIncidentCenter } from "@/components/monitoring/AlertsIncidentCenter";

export default function AlertsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Alerts & Incident Center</h1>
        <p className="text-gray-400">Manage and track system incidents and alerts</p>
      </div>
      <AlertsIncidentCenter />
    </>
  );
}

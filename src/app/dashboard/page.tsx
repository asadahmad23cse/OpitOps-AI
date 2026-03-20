import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";

export default function DashboardPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400">
          Real-time insights into your infrastructure health and performance
        </p>
      </div>
      <DashboardHome />
      <ActivityTimeline />
    </>
  );
}

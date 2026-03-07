import { Suspense } from "react";
import EnhancedDeployments from "@/components/deployments/EnhancedDeployments";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function DeploymentsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Deployments</h1>
        <p className="text-gray-400">Manage and monitor deployment pipelines</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <EnhancedDeployments />
      </Suspense>
    </>
  );
}

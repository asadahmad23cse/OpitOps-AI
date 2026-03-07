import { Suspense } from "react";
import { EnhancedReports } from "@/components/reports/EnhancedReports";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

export default function ReportsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Optimization Reports</h1>
        <p className="text-gray-400">AI-generated insights and performance recommendations</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <EnhancedReports />
      </Suspense>
    </>
  );
}

import { TopKPIBar } from "@/components/monitoring/TopKPIBar";
import { InfrastructureTopology } from "@/components/infrastructure/InfrastructureTopology";
import { InfrastructureArchitectureMap } from "@/components/infrastructure/topology/InfrastructureArchitectureMap";
import { CostOptimization } from "@/components/infrastructure/CostOptimization";

export default function InfrastructurePage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Infrastructure</h1>
        <p className="text-gray-400">Visual topology and resource management</p>
      </div>
      <TopKPIBar />
      <InfrastructureTopology />

      {/* Architecture Map Section */}
      <div className="mt-10">
        <InfrastructureArchitectureMap />
      </div>

      {/* Cost Optimization Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Cost Optimization</h2>
            <p className="text-gray-400">Identify savings opportunities and reduce cloud spend</p>
          </div>
        </div>
        <CostOptimization />
      </div>
    </>
  );
}

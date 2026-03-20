import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-8 py-16 text-center bg-gray-950/40">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          OptiOps AI
        </h1>
        <p className="text-lg text-gray-400">
          DevOps intelligence: health, alerts, deployments, infrastructure topology, and
          cost optimization — in one dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/sign-up"
            className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 rounded-xl border border-white/15 text-white font-medium hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

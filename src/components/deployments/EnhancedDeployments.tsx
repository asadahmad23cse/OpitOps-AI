"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Rocket,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Filter,
  Plus,
  ChevronDown,
  GitCommit,
  User,
  Server,
  Tag,
  Terminal,
  X,
  RefreshCw,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import {
  useDeployments,
  useCreateDeployment,
} from "@/hooks/use-deployments";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  formatTimeAgo,
  formatDuration,
  statusColor,
  statusBgColor,
  cn,
} from "@/lib/utils";
import { toast } from "sonner";
import type {
  Deployment,
  DeploymentLog,
  DeploymentsSummary,
  DeploymentStatus,
  CreateDeploymentInput,
} from "@/types";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const createDeploymentSchema = z.object({
  service: z.string().min(1, "Service name is required").max(128),
  version: z
    .string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+\.\d+/, "Must follow semver (e.g. 1.0.0)"),
  environment: z.enum(["production", "staging", "development"], {
    error: "Environment is required",
  }),
  commitHash: z
    .string()
    .min(7, "Commit hash must be at least 7 characters")
    .max(40),
});

type CreateDeploymentForm = z.infer<typeof createDeploymentSchema>;

interface Filters {
  environment: string;
  status: string;
}

const ENVIRONMENT_OPTIONS = [
  { label: "All Environments", value: "" },
  { label: "Production", value: "production" },
  { label: "Staging", value: "staging" },
  { label: "Development", value: "development" },
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "" },
  { label: "Running", value: "running" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Rolled Back", value: "rolled_back" },
  { label: "Queued", value: "queued" },
];

const STATUS_ICON: Record<DeploymentStatus, React.ReactNode> = {
  running: <Play className="h-3.5 w-3.5" />,
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  rolled_back: <RotateCcw className="h-3.5 w-3.5" />,
  queued: <Clock className="h-3.5 w-3.5" />,
};

const LOG_LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex items-center gap-4 transition-colors hover:bg-white/[0.07]">
      <div className={cn("p-2.5 rounded-lg", accent)}>{icon}</div>
      <div>
        <p className="text-sm text-white/50 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 animate-pulse"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

function DeploymentCard({
  deployment,
  onSelect,
}: {
  deployment: Deployment;
  onSelect: (d: Deployment) => void;
}) {
  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={() => onSelect(deployment)}
      className="w-full text-left bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 transition-all hover:bg-white/[0.08] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white font-semibold text-base truncate">
              {deployment.service}
            </span>
            <Badge
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border",
                statusColor(deployment.status),
                statusBgColor(deployment.status)
              )}
            >
              {STATUS_ICON[deployment.status]}
              {deployment.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              v{deployment.version}
            </span>
            <span className="flex items-center gap-1.5">
              <GitCommit className="h-3.5 w-3.5" />
              {deployment.commitHash.slice(0, 7)}
            </span>
            <span className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              {deployment.environment}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {deployment.triggeredBy}
            </span>
            <span>{formatTimeAgo(deployment.startedAt)}</span>
            {deployment.duration !== null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatDuration(deployment.duration)}
              </span>
            )}
          </div>
        </div>
      </div>

      {deployment.status === "running" && (
        <div className="mt-3">
          <ProgressBar progress={deployment.progress} />
          <p className="text-xs text-white/40 mt-1">{deployment.progress}% complete</p>
        </div>
      )}
    </button>
  );
}

function LogEntry({ log }: { log: DeploymentLog }) {
  return (
    <div className="flex gap-3 font-mono text-xs leading-relaxed">
      <span className="text-white/30 whitespace-nowrap shrink-0">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span
        className={cn(
          "uppercase font-bold w-12 shrink-0 text-right",
          LOG_LEVEL_STYLES[log.level] ?? "text-white/50"
        )}
      >
        {log.level}
      </span>
      <span className="text-white/70 break-all">{log.message}</span>
    </div>
  );
}

function DeploymentDetailModal({
  deployment,
  onClose,
}: {
  deployment: Deployment;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose}>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl max-w-2xl w-full mx-auto max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {deployment.service}
            </h2>
            <p className="text-sm text-white/50 mt-0.5">
              v{deployment.version} &middot; {deployment.commitHash.slice(0, 7)}
            </p>
          </div>
          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label="Environment" value={deployment.environment} />
            <DetailItem
              label="Status"
              value={
                <Badge
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border",
                    statusColor(deployment.status),
                    statusBgColor(deployment.status)
                  )}
                >
                  {STATUS_ICON[deployment.status]}
                  {deployment.status.replace("_", " ")}
                </Badge>
              }
            />
            <DetailItem label="Triggered By" value={deployment.triggeredBy} />
            <DetailItem
              label="Duration"
              value={
                deployment.duration !== null
                  ? formatDuration(deployment.duration)
                  : "—"
              }
            />
            <DetailItem
              label="Started At"
              value={new Date(deployment.startedAt).toLocaleString()}
            />
            <DetailItem
              label="Completed At"
              value={
                deployment.completedAt
                  ? new Date(deployment.completedAt).toLocaleString()
                  : "In progress"
              }
            />
            <DetailItem label="Commit" value={deployment.commitHash} />
            {deployment.status === "running" && (
              <DetailItem
                label="Progress"
                value={`${deployment.progress}%`}
              />
            )}
          </div>

          {deployment.status === "running" && (
            <ProgressBar progress={deployment.progress} />
          )}

          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-white/50" />
              Deployment Logs
            </h3>
            <div className="bg-black/40 rounded-lg border border-white/5 p-4 space-y-1.5 max-h-64 overflow-y-auto">
              {deployment.logs.length === 0 ? (
                <p className="text-xs text-white/30 italic">No logs available</p>
              ) : (
                deployment.logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <div className="text-sm text-white/80">{value}</div>
    </div>
  );
}

function CreateDeploymentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const createMutation = useCreateDeployment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDeploymentForm>({
    resolver: zodResolver(createDeploymentSchema),
    defaultValues: {
      service: "",
      version: "",
      environment: undefined,
      commitHash: "",
    },
  });

  const onSubmit = useCallback(
    async (formData: CreateDeploymentForm) => {
      try {
        await createMutation.mutateAsync(formData as CreateDeploymentInput);
        toast.success("Deployment created successfully");
        reset();
        onCreated();
        onClose();
      } catch {
        toast.error("Failed to create deployment");
      }
    },
    [createMutation, reset, onCreated, onClose]
  );

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl max-w-lg w-full mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            New Deployment
          </h2>
          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <FormField label="Service" error={errors.service?.message}>
            <input
              {...register("service")}
              suppressHydrationWarning
              placeholder="e.g. api-gateway"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors"
            />
          </FormField>

          <FormField label="Version" error={errors.version?.message}>
            <input
              {...register("version")}
              suppressHydrationWarning
              placeholder="e.g. 2.1.0"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors"
            />
          </FormField>

          <FormField label="Environment" error={errors.environment?.message}>
            <select
              {...register("environment")}
              suppressHydrationWarning
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors appearance-none"
            >
              <option value="" className="bg-gray-900">
                Select environment
              </option>
              <option value="production" className="bg-gray-900">
                Production
              </option>
              <option value="staging" className="bg-gray-900">
                Staging
              </option>
              <option value="development" className="bg-gray-900">
                Development
              </option>
            </select>
          </FormField>

          <FormField label="Commit Hash" error={errors.commitHash?.message}>
            <input
              {...register("commitHash")}
              suppressHydrationWarning
              placeholder="e.g. a1b2c3d"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors font-mono"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              suppressHydrationWarning
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Deploy
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        suppressHydrationWarning
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3.5 pr-9 py-2 text-sm text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function EnhancedDeployments() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    environment: "",
    status: "",
  });
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  const queryFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filters.environment) f.environment = filters.environment;
    if (filters.status) f.status = filters.status;
    return f;
  }, [filters]);

  const { data, isLoading, error, refetch } = useDeployments(queryFilters);

  const deployments: Deployment[] = data?.data?.deployments ?? [];
  const summary: DeploymentsSummary | null = data?.data?.summary ?? null;

  const handleFilterChange = useCallback(
    (key: keyof Filters) => (value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          message={error.message || "Failed to load deployments"}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Deployments
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Monitor and manage your service deployments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => refetch()}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Deployment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Deployments"
            value={summary.total}
            icon={<Rocket className="h-5 w-5 text-blue-400" />}
            accent="bg-blue-500/10"
          />
          <SummaryCard
            label="Running"
            value={summary.running}
            icon={<Play className="h-5 w-5 text-cyan-400" />}
            accent="bg-cyan-500/10"
          />
          <SummaryCard
            label="Successful"
            value={summary.success}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            accent="bg-emerald-500/10"
          />
          <SummaryCard
            label="Failed"
            value={summary.failed}
            icon={<XCircle className="h-5 w-5 text-red-400" />}
            accent="bg-red-500/10"
          />
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
        <FilterDropdown
          label="Environment"
          value={filters.environment}
          options={ENVIRONMENT_OPTIONS}
          onChange={handleFilterChange("environment")}
        />
        <FilterDropdown
          label="Status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={handleFilterChange("status")}
        />
        {(filters.environment || filters.status) && (
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setFilters({ environment: "", status: "" })}
            className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Deployment List */}
      {deployments.length === 0 ? (
        <EmptyState
          icon={<Rocket className="h-10 w-10 text-white/20" />}
          title="No deployments found"
          description="Create a new deployment or adjust your filters."
        />
      ) : (
        <div className="space-y-3">
          {deployments.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              onSelect={setSelectedDeployment}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDeployment && (
        <DeploymentDetailModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}

      {/* Create Modal */}
      <CreateDeploymentModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}

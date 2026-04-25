import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { fetchGitHubDeploymentsAsDeployments } from "@/lib/github-deployments";
import type {
  ActivityEvent,
  Alert,
  AlertHistoryEntry,
  AlertSeverity,
  AlertStatus,
  AlertsSummary,
  AppSettings,
  CostSnapshot,
  CreateDeploymentInput,
  DashboardData,
  Deployment,
  DeploymentLog,
  DeploymentStatus,
  DeploymentsSummary,
  HealthScore,
  InfrastructureNode,
  LogEntry,
  Notification,
  PaginatedResponse,
  Recommendation,
  RecommendationDifficulty,
  RecommendationImpact,
  RecommendationStatus,
  Report,
  SearchResult,
  SearchResultCategory,
  TopologyEdge,
  TopologyNode,
  TopologyNodeDetail,
  TopologyResponse,
} from "@/types";

const execFileAsync = promisify(execFile);

const RUNTIME_DIR = path.join(process.cwd(), "data", "runtime");
const STATE_PATH = path.join(RUNTIME_DIR, "optiops-live-state.json");

const SNAPSHOT_TTL_MS = 5_000;
const EXTERNAL_DEPLOYMENTS_TTL_MS = 60_000;

interface AlertOverride {
  status?: AlertStatus;
  assignee?: string | null;
  history: AlertHistoryEntry[];
  updatedAt: string;
}

interface LiveState {
  version: number;
  createdAt: string;
  updatedAt: string;
  settings: AppSettings;
  manualDeployments: Deployment[];
  alertOverrides: Record<string, AlertOverride>;
  recommendationStatus: Record<string, RecommendationStatus>;
  notificationRead: Record<string, boolean>;
  reports: Report[];
}

interface ModelSignal {
  online: boolean;
  adapterLoaded: boolean;
  detail: string;
}

interface LiveSnapshot {
  healthScore: HealthScore;
  alerts: Alert[];
  alertsSummary: AlertsSummary;
  deployments: Deployment[];
  deploymentsSummary: DeploymentsSummary;
  costSnapshot: CostSnapshot;
  recommendations: Recommendation[];
  infrastructure: InfrastructureNode[];
  activityEvents: ActivityEvent[];
  logs: LogEntry[];
  notifications: Notification[];
  reports: Report[];
  settings: AppSettings;
  topology: TopologyResponse;
  lastUpdated: string;
}

let stateCache: LiveState | null = null;
let writeQueue: Promise<void> = Promise.resolve();
let snapshotCache: { at: number; data: LiveSnapshot } | null = null;
let externalDeploymentsCache: { at: number; data: Deployment[] } | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRatio(seed: string): number {
  const h = hashString(seed);
  return (Math.sin(h) + 1) / 2;
}

function seededRange(seed: string, min: number, max: number): number {
  return min + seededRatio(seed) * (max - min);
}

function defaultSettings(): AppSettings {
  return {
    profile: {
      name: "Asad Ahmad",
      email: "asad.ahmad@example.com",
      role: "DevOps Engineer",
      avatar: null,
      timezone: "Asia/Calcutta",
    },
    notifications: {
      emailAlerts: true,
      slackIntegration: false,
      criticalOnly: false,
      digestFrequency: "realtime",
    },
    dashboard: {
      refreshInterval: 30,
      defaultTimeRange: "24h",
      autoRefresh: true,
    },
    integrations: {
      aws: { connected: false, region: "ap-south-1" },
      slack: { connected: false, channel: "#optiops" },
      pagerduty: { connected: false },
      datadog: { connected: false },
    },
  };
}

function defaultState(): LiveState {
  const ts = nowIso();
  return {
    version: 1,
    createdAt: ts,
    updatedAt: ts,
    settings: defaultSettings(),
    manualDeployments: [],
    alertOverrides: {},
    recommendationStatus: {},
    notificationRead: {},
    reports: [],
  };
}

async function ensureRuntimeDir(): Promise<void> {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

async function loadState(): Promise<LiveState> {
  if (stateCache) return stateCache;
  await ensureRuntimeDir();
  try {
    const raw = await fs.readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LiveState>;
    const state: LiveState = {
      ...defaultState(),
      ...parsed,
      settings: { ...defaultSettings(), ...(parsed.settings || {}) },
      manualDeployments: Array.isArray(parsed.manualDeployments) ? parsed.manualDeployments : [],
      alertOverrides: parsed.alertOverrides || {},
      recommendationStatus: parsed.recommendationStatus || {},
      notificationRead: parsed.notificationRead || {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
    stateCache = state;
    return state;
  } catch {
    const created = defaultState();
    await fs.writeFile(STATE_PATH, JSON.stringify(created, null, 2), "utf-8");
    stateCache = created;
    return created;
  }
}

async function persistState(state: LiveState): Promise<void> {
  state.updatedAt = nowIso();
  stateCache = state;
  await ensureRuntimeDir();
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

async function mutateState<T>(mutator: (state: LiveState) => Promise<T> | T): Promise<T> {
  const state = await loadState();
  let out!: T;
  writeQueue = writeQueue.then(async () => {
    out = await mutator(state);
    await persistState(state);
    snapshotCache = null;
  });
  await writeQueue;
  return out;
}

function invalidateCaches(): void {
  snapshotCache = null;
  externalDeploymentsCache = null;
}

function isGithubConfigured(): boolean {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  return Boolean(
    token &&
      owner &&
      token !== "your_github_token_here" &&
      owner !== "your_github_username_here",
  );
}

function inferEnvironment(input: string): string {
  const t = input.toLowerCase();
  if (t.includes("prod")) return "production";
  if (t.includes("stag")) return "staging";
  return "development";
}

async function fetchLocalGitDeployments(): Promise<Deployment[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--pretty=format:%H|%ct|%an|%s", "-n", "50"],
      { cwd: process.cwd(), maxBuffer: 4_000_000 },
    );
    const repoName = path.basename(process.cwd());
    const lines = String(stdout)
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const out: Deployment[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const [sha, unixTs, author, message] = lines[i]!.split("|");
      if (!sha || !unixTs) continue;
      const startedAt = new Date(Number(unixTs) * 1000).toISOString();
      const short = sha.slice(0, 7);
      out.push({
        id: `DEP-GIT-${short}`,
        service: repoName,
        version: `v0.0.${short}`,
        commitHash: short,
        environment: inferEnvironment(message || ""),
        status: "success",
        duration: null,
        triggeredBy: author || "git",
        startedAt,
        completedAt: startedAt,
        progress: 100,
        logs: [
          {
            id: `log-${short}`,
            timestamp: startedAt,
            level: "info",
            message: (message || `Commit ${short}`).slice(0, 220),
          },
        ],
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchExternalDeployments(): Promise<Deployment[]> {
  const cached = externalDeploymentsCache;
  if (cached && Date.now() - cached.at < EXTERNAL_DEPLOYMENTS_TTL_MS) {
    return deepCopy(cached.data);
  }

  let deployments: Deployment[] = [];
  if (isGithubConfigured()) {
    const token = process.env.GITHUB_TOKEN!.trim();
    const owner = process.env.GITHUB_OWNER!.trim();
    try {
      deployments = await fetchGitHubDeploymentsAsDeployments(owner, token);
    } catch {
      deployments = [];
    }
  }
  if (deployments.length === 0) {
    deployments = await fetchLocalGitDeployments();
  }

  deployments.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  externalDeploymentsCache = { at: Date.now(), data: deployments };
  return deepCopy(deployments);
}

function materializeManualDeployment(dep: Deployment, nowMs: number): Deployment {
  if (dep.status !== "queued" && dep.status !== "running") return dep;
  const started = new Date(dep.startedAt).getTime();
  if (Number.isNaN(started)) return dep;
  const elapsedMs = Math.max(0, nowMs - started);
  const steps = Math.floor(elapsedMs / 3_000);
  const progress = clamp(steps * 20, 0, 100);
  const isQueued = elapsedMs < 3_000;
  const done = progress >= 100;
  const status: DeploymentStatus = done ? "success" : isQueued ? "queued" : "running";
  return {
    ...dep,
    progress,
    status,
    completedAt: done ? new Date(started + 15_000).toISOString() : null,
    duration: done ? 15_000 : null,
  };
}

function mergeDeployments(
  manualDeployments: Deployment[],
  externalDeployments: Deployment[],
): Deployment[] {
  const byId = new Map<string, Deployment>();
  for (const d of manualDeployments) byId.set(d.id, d);
  for (const d of externalDeployments) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

function summarizeDeployments(deployments: Deployment[]): DeploymentsSummary {
  const today = new Date().toDateString();
  const durationValues = deployments
    .map((d) => d.duration)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const sumDur = durationValues.reduce((acc, n) => acc + n, 0);
  return {
    total: deployments.length,
    running: deployments.filter((d) => d.status === "running").length,
    success: deployments.filter((d) => d.status === "success").length,
    failed: deployments.filter((d) => d.status === "failed").length,
    rolledBack: deployments.filter((d) => d.status === "rolled_back").length,
    queued: deployments.filter((d) => d.status === "queued").length,
    completedToday: deployments.filter(
      (d) => d.completedAt && new Date(d.completedAt).toDateString() === today,
    ).length,
    avgDuration: durationValues.length ? Math.round(sumDur / durationValues.length) : 0,
  };
}

async function getModelSignal(): Promise<ModelSignal> {
  const rawBase =
    process.env.NEXT_PUBLIC_LOCAL_LLM_URL?.trim() || "http://127.0.0.1:8001";
  const base = rawBase.replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        online: false,
        adapterLoaded: false,
        detail: `model health HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      status?: string;
      adapter_loaded?: boolean;
      error?: string | null;
    };
    const online = json.status === "ready";
    return {
      online,
      adapterLoaded: Boolean(json.adapter_loaded),
      detail: online ? "ready" : (json.error || json.status || "not ready"),
    };
  } catch {
    return {
      online: false,
      adapterLoaded: false,
      detail: "model health endpoint unreachable",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function envDeploymentStats(deployments: Deployment[]): Record<string, { total: number; failed: number; running: number }> {
  const out: Record<string, { total: number; failed: number; running: number }> = {
    production: { total: 0, failed: 0, running: 0 },
    staging: { total: 0, failed: 0, running: 0 },
    development: { total: 0, failed: 0, running: 0 },
  };
  for (const d of deployments) {
    const env = inferEnvironment(d.environment);
    const bucket = out[env];
    if (!bucket) continue;
    bucket.total += 1;
    if (d.status === "failed" || d.status === "rolled_back") bucket.failed += 1;
    if (d.status === "running" || d.status === "queued") bucket.running += 1;
  }
  return out;
}

function buildInfrastructure(
  deployments: Deployment[],
  modelSignal: ModelSignal,
): InfrastructureNode[] {
  const stats = envDeploymentStats(deployments);
  const nowBucket = Math.floor(Date.now() / 60000);
  const cpuCount = Math.max(1, os.cpus().length);
  const load = os.loadavg()[0];
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsedPct = clamp(Math.round(((memTotal - memFree) / memTotal) * 100), 10, 99);
  const machineCpuPct = clamp(Math.round((load / cpuCount) * 100), 8, 98);

  const baseProdCpu = clamp(machineCpuPct + stats.production.running * 4, 20, 95);
  const baseStgCpu = clamp(Math.round(baseProdCpu * 0.7), 10, 92);
  const baseDevCpu = clamp(Math.round(baseProdCpu * 0.5), 8, 90);

  const prodStatus =
    stats.production.failed > 0 ? "degraded" : baseProdCpu > 85 ? "degraded" : "operational";
  const stgStatus =
    stats.staging.failed > 0 ? "degraded" : baseStgCpu > 85 ? "degraded" : "operational";
  const devStatus =
    stats.development.failed > 0 ? "degraded" : baseDevCpu > 88 ? "degraded" : "operational";

  const modelStatus = modelSignal.online ? "operational" : "outage";

  const nodes: InfrastructureNode[] = [
    {
      id: "infra-prod",
      name: "Production",
      type: "Kubernetes",
      nodes: 24,
      totalNodes: 24,
      cpuAvg: baseProdCpu,
      memoryAvg: clamp(memUsedPct + 6, 25, 98),
      region: "ap-south-1",
      status: prodStatus,
      uptime: clamp(99.2 - stats.production.failed * 0.2, 96, 99.99),
      latency: Math.round(seededRange(`prod-lat-${nowBucket}`, 35, 80)),
      errorRate: Number((seededRange(`prod-err-${nowBucket}`, 0.05, 0.9)).toFixed(2)),
      activeIncidents: 0,
      relatedDeployments: stats.production.total,
      relatedAlerts: 0,
    },
    {
      id: "infra-staging",
      name: "Staging",
      type: "Kubernetes",
      nodes: 8,
      totalNodes: 8,
      cpuAvg: baseStgCpu,
      memoryAvg: clamp(Math.round(memUsedPct * 0.8), 20, 95),
      region: "ap-south-1",
      status: stgStatus,
      uptime: clamp(99.5 - stats.staging.failed * 0.2, 95, 99.95),
      latency: Math.round(seededRange(`stg-lat-${nowBucket}`, 40, 95)),
      errorRate: Number((seededRange(`stg-err-${nowBucket}`, 0.1, 1.1)).toFixed(2)),
      activeIncidents: 0,
      relatedDeployments: stats.staging.total,
      relatedAlerts: 0,
    },
    {
      id: "infra-dev",
      name: "Development",
      type: "Kubernetes",
      nodes: 6,
      totalNodes: 8,
      cpuAvg: baseDevCpu,
      memoryAvg: clamp(Math.round(memUsedPct * 0.65), 15, 92),
      region: "ap-south-1",
      status: devStatus,
      uptime: clamp(98.8 - stats.development.failed * 0.25, 93, 99.8),
      latency: Math.round(seededRange(`dev-lat-${nowBucket}`, 45, 110)),
      errorRate: Number((seededRange(`dev-err-${nowBucket}`, 0.15, 1.4)).toFixed(2)),
      activeIncidents: 0,
      relatedDeployments: stats.development.total,
      relatedAlerts: 0,
    },
    {
      id: "infra-db",
      name: "Database Cluster",
      type: "PostgreSQL",
      nodes: 3,
      totalNodes: 3,
      cpuAvg: clamp(Math.round(baseProdCpu * 0.75), 18, 94),
      memoryAvg: clamp(Math.round(memUsedPct * 0.85), 22, 96),
      region: "ap-south-1",
      status: "operational",
      uptime: 99.97,
      latency: Math.round(seededRange(`db-lat-${nowBucket}`, 7, 25)),
      errorRate: Number((seededRange(`db-err-${nowBucket}`, 0.01, 0.2)).toFixed(2)),
      activeIncidents: 0,
      relatedDeployments: 0,
      relatedAlerts: 0,
    },
    {
      id: "infra-cache",
      name: "Cache Layer",
      type: "Redis",
      nodes: 4,
      totalNodes: 4,
      cpuAvg: clamp(Math.round(baseProdCpu * 0.68), 15, 93),
      memoryAvg: clamp(Math.round(memUsedPct * 0.9), 25, 97),
      region: "ap-south-1",
      status: memUsedPct > 88 ? "degraded" : "operational",
      uptime: clamp(99.85 - (memUsedPct > 88 ? 0.12 : 0), 98.9, 99.95),
      latency: Math.round(seededRange(`cache-lat-${nowBucket}`, 2, 9)),
      errorRate: Number((seededRange(`cache-err-${nowBucket}`, 0.01, 0.12)).toFixed(2)),
      activeIncidents: 0,
      relatedDeployments: 0,
      relatedAlerts: 0,
    },
    {
      id: "infra-model",
      name: "Local Inference",
      type: "Qwen2.5 + QLoRA",
      nodes: modelSignal.online ? 1 : 0,
      totalNodes: 1,
      cpuAvg: modelSignal.online ? clamp(Math.round(baseProdCpu * 0.55), 8, 90) : 0,
      memoryAvg: modelSignal.online ? clamp(Math.round(memUsedPct * 0.8), 8, 92) : 0,
      region: "local",
      status: modelStatus,
      uptime: modelSignal.online ? 99.4 : 92.0,
      latency: modelSignal.online ? Math.round(seededRange(`llm-lat-${nowBucket}`, 120, 380)) : 0,
      errorRate: modelSignal.online ? 0.08 : 5.0,
      activeIncidents: modelSignal.online ? 0 : 1,
      relatedDeployments: 0,
      relatedAlerts: 0,
    },
  ];

  return nodes;
}

function makeIncidentCode(id: string): string {
  return `INC-${1000 + (hashString(id) % 9000)}`;
}

function makeAlertHistory(action: string, details: string, timestamp: string): AlertHistoryEntry {
  return {
    id: `h-${randomUUID().slice(0, 8)}`,
    action,
    user: "system",
    timestamp,
    details,
  };
}

function makeAlert(params: {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  service: string;
  environment: string;
  createdAt: string;
}): Alert {
  const createdAt = params.createdAt;
  return {
    id: params.id,
    title: params.title,
    description: params.description,
    severity: params.severity,
    status: "open",
    service: params.service,
    environment: params.environment,
    assignee: null,
    createdAt,
    updatedAt: createdAt,
    incidentCode: makeIncidentCode(params.id),
    history: [
      makeAlertHistory("Alert created", "Auto-generated from live telemetry", createdAt),
    ],
  };
}

function buildBaseAlerts(
  deployments: Deployment[],
  infra: InfrastructureNode[],
  modelSignal: ModelSignal,
): Alert[] {
  const out: Alert[] = [];

  if (!modelSignal.online) {
    out.push(
      makeAlert({
        id: "ALT-MODEL-OFFLINE",
        title: "Local LLM server is offline",
        description:
          "The local inference endpoint is unreachable or not ready. Start uvicorn for ml/server/inference_server.py.",
        severity: "critical",
        service: "Local Inference",
        environment: "local",
        createdAt: nowIso(),
      }),
    );
  }

  const failed = deployments.filter((d) => d.status === "failed" || d.status === "rolled_back");
  for (const dep of failed.slice(0, 8)) {
    out.push(
      makeAlert({
        id: `ALT-DEP-${dep.id}`,
        title: `Deployment issue in ${dep.service}`,
        description: `${dep.status.replace("_", " ")} deployment detected for ${dep.service} (${dep.version}).`,
        severity: "high",
        service: dep.service,
        environment: inferEnvironment(dep.environment),
        createdAt: dep.startedAt,
      }),
    );
  }

  const runningTooLong = deployments.filter((d) => {
    if (d.status !== "running" && d.status !== "queued") return false;
    const started = new Date(d.startedAt).getTime();
    return Date.now() - started > 20 * 60 * 1000;
  });
  for (const dep of runningTooLong.slice(0, 6)) {
    out.push(
      makeAlert({
        id: `ALT-RUN-${dep.id}`,
        title: `Long-running deployment: ${dep.service}`,
        description: `${dep.service} has remained in ${dep.status} status for over 20 minutes.`,
        severity: "medium",
        service: dep.service,
        environment: inferEnvironment(dep.environment),
        createdAt: dep.startedAt,
      }),
    );
  }

  for (const node of infra) {
    if (node.status === "degraded" || node.status === "outage") {
      out.push(
        makeAlert({
          id: `ALT-INFRA-${node.id}`,
          title: `${node.name} health degraded`,
          description: `${node.name} is ${node.status}. CPU ${node.cpuAvg}% / Memory ${node.memoryAvg}% / latency ${node.latency}ms.`,
          severity: node.status === "outage" ? "critical" : "medium",
          service: node.name,
          environment: node.region === "local" ? "local" : "production",
          createdAt: nowIso(),
        }),
      );
    } else if (node.cpuAvg > 85 || node.memoryAvg > 90) {
      out.push(
        makeAlert({
          id: `ALT-HOT-${node.id}`,
          title: `${node.name} resource pressure`,
          description: `${node.name} is near saturation (CPU ${node.cpuAvg}% / memory ${node.memoryAvg}%).`,
          severity: "medium",
          service: node.name,
          environment: node.region === "local" ? "local" : "production",
          createdAt: nowIso(),
        }),
      );
    }
  }

  if (out.length === 0) {
    out.push(
      makeAlert({
        id: "ALT-INFO-STABLE",
        title: "No active incidents detected",
        description: "Current telemetry shows healthy deployments and infrastructure.",
        severity: "low",
        service: "Platform",
        environment: "production",
        createdAt: nowIso(),
      }),
    );
    out[0]!.status = "resolved";
  }

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

function applyAlertOverrides(alerts: Alert[], state: LiveState): Alert[] {
  return alerts.map((alert) => {
    const ov = state.alertOverrides[alert.id];
    if (!ov) return alert;
    const status = ov.status || alert.status;
    const assignee = ov.assignee !== undefined ? ov.assignee : alert.assignee;
    return {
      ...alert,
      status,
      assignee,
      updatedAt: ov.updatedAt || alert.updatedAt,
      history: [...alert.history, ...ov.history],
    };
  });
}

function summarizeAlerts(alerts: Alert[]): AlertsSummary {
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
    open: alerts.filter((a) => a.status === "open").length,
    acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
  };
}

function scoreStatus(score: number): "healthy" | "warning" | "critical" {
  if (score >= 90) return "healthy";
  if (score >= 75) return "warning";
  return "critical";
}

function buildHealthScore(
  infra: InfrastructureNode[],
  alertsSummary: AlertsSummary,
  deploymentsSummary: DeploymentsSummary,
): HealthScore {
  const avgCpu =
    infra.length > 0
      ? Math.round(infra.reduce((acc, n) => acc + n.cpuAvg, 0) / infra.length)
      : 0;
  const penalties =
    alertsSummary.critical * 12 +
    alertsSummary.high * 6 +
    alertsSummary.medium * 3 +
    deploymentsSummary.failed * 5 +
    deploymentsSummary.rolledBack * 4 +
    Math.max(0, avgCpu - 72) * 0.35;
  const score = clamp(Math.round(100 - penalties), 35, 99);
  const trend = clamp(
    Math.round(4 - alertsSummary.critical * 2 - alertsSummary.high * 0.5 + deploymentsSummary.success * 0.08),
    -8,
    8,
  );
  const totalChecks = 96;
  const warnings = alertsSummary.open + alertsSummary.acknowledged;
  const checksPassed = clamp(totalChecks - warnings, 1, totalChecks);

  const categories = [
    {
      name: "Infrastructure Uptime",
      score: clamp(Math.round(infra.reduce((a, n) => a + n.uptime, 0) / Math.max(infra.length, 1)), 0, 100),
      details: "Aggregated from live infrastructure node uptime.",
      affectedResources: infra.filter((n) => n.status !== "operational").length,
    },
    {
      name: "Open Incidents",
      score: clamp(100 - alertsSummary.open * 12 - alertsSummary.critical * 10, 0, 100),
      details: "Computed from active alert severity and status.",
      affectedResources: alertsSummary.open,
    },
    {
      name: "Deployment Health",
      score: clamp(
        100 - deploymentsSummary.failed * 14 - deploymentsSummary.rolledBack * 10 - deploymentsSummary.running * 1,
        0,
        100,
      ),
      details: "Recent deployment outcomes from GitHub/manual pipeline.",
      affectedResources: deploymentsSummary.failed + deploymentsSummary.rolledBack,
    },
    {
      name: "Resource Pressure",
      score: clamp(100 - Math.max(0, avgCpu - 60) * 1.2, 0, 100),
      details: "CPU trend across inferred infrastructure nodes.",
      affectedResources: infra.filter((n) => n.cpuAvg >= 85 || n.memoryAvg >= 90).length,
    },
  ].map((c) => ({
    ...c,
    status: scoreStatus(c.score),
  }));

  return {
    score,
    trend,
    checksPassed,
    totalChecks,
    warnings,
    lastUpdated: nowIso(),
    breakdown: categories,
  };
}

function buildBaseCost(infra: InfrastructureNode[], deployments: Deployment[]): CostSnapshot {
  const day = new Date().getDate();
  const monthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const infraCpu = infra.reduce((a, n) => a + n.cpuAvg, 0);
  const infraMem = infra.reduce((a, n) => a + n.memoryAvg, 0);
  const deploymentFactor = deployments.length * 95;

  const ec2 = Math.round(90_000 + infraCpu * 420 + deploymentFactor);
  const db = Math.round(55_000 + infraMem * 280);
  const transfer = Math.round(28_000 + deployments.length * 110);

  const currentMonth = ec2 + db + transfer;
  const projected = Math.round((currentMonth / Math.max(day, 1)) * monthDays);

  const dailyCosts: { date: string; cost: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const seed = `${dt.toISOString().slice(0, 10)}-${infraCpu}-${deployments.length}`;
    const jitter = seededRange(seed, -0.08, 0.11);
    const cost = Math.round((currentMonth / Math.max(day, 1)) * (1 + jitter));
    dailyCosts.push({ date: dt.toISOString(), cost });
  }

  const last7 = dailyCosts.slice(-7).reduce((a, b) => a + b.cost, 0);
  const prev7 = dailyCosts.slice(-14, -7).reduce((a, b) => a + b.cost, 0) || 1;
  const trend = Number((((last7 - prev7) / prev7) * 100).toFixed(1));

  return {
    currentMonth,
    projected,
    potentialSavings: 0,
    trend,
    savingsPercentage: "0% reduction",
    services: [
      { service: "AWS EC2", cost: ec2, trend: Number((trend * 0.6).toFixed(1)), icon: "server" },
      { service: "RDS Databases", cost: db, trend: Number((trend * 0.4).toFixed(1)), icon: "database" },
      { service: "Data Transfer", cost: transfer, trend: Number((trend * 0.9).toFixed(1)), icon: "network" },
    ],
    lastUpdated: nowIso(),
    dailyCosts,
  };
}

function impactFromSeverity(summary: AlertsSummary): RecommendationImpact {
  if (summary.critical > 0) return "high";
  if (summary.high > 0 || summary.open > 3) return "medium";
  return "low";
}

function defaultRecommendationStatus(
  state: LiveState,
  id: string,
  fallback: RecommendationStatus,
): RecommendationStatus {
  return state.recommendationStatus[id] || fallback;
}

function buildRecommendations(
  state: LiveState,
  alertsSummary: AlertsSummary,
  deploymentsSummary: DeploymentsSummary,
  infra: InfrastructureNode[],
): Recommendation[] {
  const highPressure = infra.some((n) => n.cpuAvg >= 85 || n.memoryAvg >= 90);
  const recs: Recommendation[] = [];
  const now = nowIso();

  recs.push({
    id: "REC-AUTOSCALE",
    title: "Enable intelligent autoscaling",
    impact: impactFromSeverity(alertsSummary),
    estimatedSavings: 18_000 + alertsSummary.open * 1200,
    performanceImprovement: "+15% throughput",
    difficulty: "medium",
    category: "Performance",
    description:
      "Use HPA targets based on CPU + request latency to reduce bottlenecks during deployment spikes.",
    status: defaultRecommendationStatus(state, "REC-AUTOSCALE", "pending"),
    createdAt: now,
  });

  recs.push({
    id: "REC-RIGHTSIZE",
    title: "Right-size compute for low-utilization services",
    impact: highPressure ? "high" : "medium",
    estimatedSavings: highPressure ? 14_500 : 10_250,
    performanceImprovement: "Lower hot-node throttling",
    difficulty: "easy",
    category: "Cost",
    description:
      "Review node pools and downsize under-utilized workloads while reserving burst capacity for production.",
    status: defaultRecommendationStatus(state, "REC-RIGHTSIZE", "pending"),
    createdAt: now,
  });

  if (deploymentsSummary.failed + deploymentsSummary.rolledBack > 0) {
    recs.push({
      id: "REC-DEPLOY-GUARDS",
      title: "Add deployment guardrails",
      impact: "high",
      estimatedSavings: 6_800,
      performanceImprovement: "Lower rollback frequency",
      difficulty: "medium",
      category: "Reliability",
      description:
        "Introduce progressive rollout + automated rollback SLO checks for failed/rolled-back services.",
      status: defaultRecommendationStatus(state, "REC-DEPLOY-GUARDS", "pending"),
      createdAt: now,
    });
  }

  if (alertsSummary.critical > 0) {
    recs.push({
      id: "REC-ONCALL",
      title: "Tighten critical alert routing",
      impact: "high",
      estimatedSavings: 3_500,
      performanceImprovement: "Faster MTTR",
      difficulty: "easy",
      category: "Operations",
      description:
        "Route critical incidents to dedicated escalation policy and attach runbooks with ownership.",
      status: defaultRecommendationStatus(state, "REC-ONCALL", "pending"),
      createdAt: now,
    });
  }

  recs.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  return recs;
}

function recommendationDifficultyScore(difficulty: RecommendationDifficulty): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return 2;
  return 3;
}

function buildActivity(
  deployments: Deployment[],
  alerts: Alert[],
  recommendations: Recommendation[],
): ActivityEvent[] {
  const out: ActivityEvent[] = [];

  for (const dep of deployments.slice(0, 8)) {
    out.push({
      id: `act-dep-${dep.id}`,
      type: "deployment",
      title: `${dep.service} ${dep.version} (${dep.status})`,
      description: `Environment: ${dep.environment}`,
      user: dep.triggeredBy,
      timestamp: dep.startedAt,
      metadata: {
        status: dep.status,
        environment: dep.environment,
      },
    });
  }

  for (const alert of alerts.slice(0, 6)) {
    out.push({
      id: `act-alert-${alert.id}`,
      type: alert.status === "resolved" ? "incident_resolved" : "alert",
      title: alert.title,
      description: `${alert.severity} • ${alert.status}`,
      user: alert.assignee || "system",
      timestamp: alert.updatedAt,
      metadata: {
        severity: alert.severity,
        service: alert.service,
      },
    });
  }

  for (const rec of recommendations.slice(0, 4)) {
    out.push({
      id: `act-rec-${rec.id}`,
      type: "recommendation",
      title: rec.title,
      description: `${rec.impact} impact • ${rec.status}`,
      user: "AI Engine",
      timestamp: rec.createdAt,
      metadata: {
        category: rec.category,
        difficulty: String(recommendationDifficultyScore(rec.difficulty)),
      },
    });
  }

  out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return out;
}

function levelFromSeverity(severity: AlertSeverity): "info" | "warn" | "error" {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warn";
  return "info";
}

function buildLogs(
  deployments: Deployment[],
  alerts: Alert[],
  modelSignal: ModelSignal,
): LogEntry[] {
  const out: LogEntry[] = [];
  for (const dep of deployments.slice(0, 24)) {
    const logs: DeploymentLog[] = dep.logs.length
      ? dep.logs
      : [
          {
            id: `fallback-${dep.id}`,
            timestamp: dep.startedAt,
            level: dep.status === "failed" ? "error" : "info",
            message: `${dep.service} deployment ${dep.status}`,
          },
        ];
    for (const log of logs) {
      out.push({
        id: `log-${dep.id}-${log.id}`,
        timestamp: log.timestamp,
        level: log.level,
        service: dep.service,
        environment: inferEnvironment(dep.environment),
        message: log.message,
        traceId: `trace-${hashString(dep.id + log.id).toString(16).slice(0, 10)}`,
      });
    }
  }

  for (const alert of alerts.slice(0, 24)) {
    out.push({
      id: `log-alert-${alert.id}`,
      timestamp: alert.updatedAt,
      level: levelFromSeverity(alert.severity),
      service: alert.service,
      environment: alert.environment,
      message: `${alert.title} (${alert.status})`,
      traceId: `trace-${hashString(alert.id).toString(16).slice(0, 10)}`,
    });
  }

  out.push({
    id: "log-model-health",
    timestamp: nowIso(),
    level: modelSignal.online ? "info" : "error",
    service: "Local Inference",
    environment: "local",
    message: modelSignal.online
      ? `Local model online (adapter loaded=${modelSignal.adapterLoaded})`
      : `Local model offline: ${modelSignal.detail}`,
    traceId: `trace-model-${hashString(modelSignal.detail).toString(16).slice(0, 8)}`,
  });

  out.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return out.slice(0, 300);
}

function mapInfraToTopoStatus(status: InfrastructureNode["status"]): "healthy" | "warning" | "critical" {
  if (status === "operational") return "healthy";
  if (status === "degraded") return "warning";
  return "critical";
}

function buildTopologyFromInfra(infra: InfrastructureNode[]): TopologyResponse {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const now = nowIso();

  const lb: TopologyNode = {
    id: "lb-1",
    label: "Load Balancer",
    type: "load_balancer",
    subtitle: "Edge Ingress",
    environment: "production",
    status: "healthy",
    region: "ap-south-1",
    metrics: {
      "Requests/s": Math.round(seededRange(`lb-rps-${now.slice(0, 16)}`, 1800, 5200)),
      "Healthy Targets": "100%",
      "Latency P95": `${Math.round(seededRange(`lb-lat-${now.slice(0, 16)}`, 8, 28))}ms`,
    },
    position: { x: 420, y: 30 },
    dependencies: ["gw-1"],
    metadata: { provider: "local-live", source: "live-data" },
  };
  const gateway: TopologyNode = {
    id: "gw-1",
    label: "API Gateway",
    type: "gateway",
    subtitle: "Traffic Router",
    environment: "production",
    status: "healthy",
    region: "ap-south-1",
    metrics: {
      Throughput: `${Math.round(seededRange(`gw-tp-${now.slice(0, 16)}`, 900, 3100))}/s`,
      "Error Rate": `${seededRange(`gw-err-${now.slice(0, 16)}`, 0.02, 0.9).toFixed(2)}%`,
      "Latency P95": `${Math.round(seededRange(`gw-lat-${now.slice(0, 16)}`, 25, 95))}ms`,
    },
    position: { x: 420, y: 150 },
    dependencies: [],
    metadata: { source: "live-data" },
  };
  nodes.push(lb, gateway);

  const serviceNodes = infra.filter((n) => !n.name.toLowerCase().includes("database") && !n.name.toLowerCase().includes("cache"));
  const dataNodes = infra.filter((n) => n.name.toLowerCase().includes("database") || n.name.toLowerCase().includes("cache"));

  serviceNodes.forEach((n, idx) => {
    const x = 180 + idx * 220;
    const id = `svc-${n.id.replace("infra-", "")}`;
    const dependencies = dataNodes.map((d) => `data-${d.id.replace("infra-", "")}`);
    nodes.push({
      id,
      label: n.name,
      type: "service",
      subtitle: n.type,
      environment: n.region === "local" ? "development" : "production",
      status: mapInfraToTopoStatus(n.status),
      region: n.region,
      metrics: {
        CPU: `${n.cpuAvg}%`,
        Memory: `${n.memoryAvg}%`,
        Latency: `${n.latency}ms`,
      },
      position: { x, y: 290 },
      dependencies,
      metadata: { infraId: n.id },
    });
    edges.push({
      id: `e-gw-${id}`,
      source: gateway.id,
      target: id,
      status: mapInfraToTopoStatus(n.status),
      traffic: `${Math.round(seededRange(`tr-${id}`, 240, 1800))} req/s`,
      latencyP95: `${n.latency}ms`,
      errorRate: `${n.errorRate.toFixed(2)}%`,
      protocol: "HTTP/2",
    });
  });

  dataNodes.forEach((n, idx) => {
    const x = 250 + idx * 280;
    const id = `data-${n.id.replace("infra-", "")}`;
    nodes.push({
      id,
      label: n.name,
      type: n.name.toLowerCase().includes("cache") ? "cache" : "database",
      subtitle: n.type,
      environment: "production",
      status: mapInfraToTopoStatus(n.status),
      region: n.region,
      metrics: {
        CPU: `${n.cpuAvg}%`,
        Memory: `${n.memoryAvg}%`,
        Nodes: `${n.nodes}/${n.totalNodes}`,
      },
      position: { x, y: 440 },
      dependencies: [],
      metadata: { infraId: n.id },
    });
  });

  const dataIds = nodes
    .filter((n) => n.type === "database" || n.type === "cache")
    .map((n) => n.id);
  const serviceIds = nodes.filter((n) => n.type === "service").map((n) => n.id);
  for (const sid of serviceIds) {
    for (const did of dataIds.slice(0, 2)) {
      const svc = nodes.find((n) => n.id === sid);
      const dat = nodes.find((n) => n.id === did);
      if (!svc || !dat) continue;
      edges.push({
        id: `e-${sid}-${did}`,
        source: sid,
        target: did,
        status: svc.status === "critical" || dat.status === "critical" ? "critical" : svc.status === "warning" || dat.status === "warning" ? "warning" : "healthy",
        traffic: `${Math.round(seededRange(`traffic-${sid}-${did}`, 80, 640))} ops/s`,
        latencyP95: `${Math.round(seededRange(`lat-${sid}-${did}`, 4, 34))}ms`,
        errorRate: `${seededRange(`err-${sid}-${did}`, 0.01, 0.5).toFixed(2)}%`,
        protocol: did.includes("cache") ? "TCP/6379" : "TCP/5432",
      });
    }
  }

  return { nodes, edges, lastUpdated: nowIso() };
}

function buildNotifications(
  state: LiveState,
  alerts: Alert[],
  deployments: Deployment[],
  reports: Report[],
  modelSignal: ModelSignal,
): Notification[] {
  const out: Notification[] = [];
  for (const alert of alerts.filter((a) => a.status !== "resolved").slice(0, 6)) {
    out.push({
      id: `not-alert-${alert.id}`,
      type: "alert",
      title: `${alert.severity.toUpperCase()} Alert`,
      message: alert.title,
      read: Boolean(state.notificationRead[`not-alert-${alert.id}`]),
      createdAt: alert.updatedAt,
      actionUrl: "/alerts",
    });
  }

  for (const dep of deployments.filter((d) => d.status === "running" || d.status === "failed").slice(0, 4)) {
    const id = `not-dep-${dep.id}`;
    out.push({
      id,
      type: "deployment",
      title: dep.status === "failed" ? "Deployment Failed" : "Deployment Running",
      message: `${dep.service} ${dep.version} is ${dep.status}`,
      read: Boolean(state.notificationRead[id]),
      createdAt: dep.startedAt,
      actionUrl: "/deployments",
    });
  }

  if (!modelSignal.online) {
    const id = "not-model-offline";
    out.push({
      id,
      type: "system",
      title: "Local model offline",
      message: "Fine-tuned local model is unreachable. Start inference server.",
      read: Boolean(state.notificationRead[id]),
      createdAt: nowIso(),
      actionUrl: "/ai-assistant",
    });
  }

  for (const report of reports.slice(0, 2)) {
    const id = `not-report-${report.id}`;
    out.push({
      id,
      type: "report",
      title: `Report ${report.status}`,
      message: report.title,
      read: Boolean(state.notificationRead[id]),
      createdAt: report.generatedAt,
      actionUrl: "/reports",
    });
  }

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out.slice(0, 40);
}

function withInfraAlertCounters(
  infra: InfrastructureNode[],
  alerts: Alert[],
): InfrastructureNode[] {
  return infra.map((node) => {
    const matched = alerts.filter(
      (a) =>
        a.status !== "resolved" &&
        (a.service === node.name || a.service.toLowerCase().includes(node.name.toLowerCase())),
    );
    return {
      ...node,
      activeIncidents: matched.length,
      relatedAlerts: matched.length,
    };
  });
}

async function buildSnapshot(force = false): Promise<LiveSnapshot> {
  const cached = snapshotCache;
  if (!force && cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) {
    return deepCopy(cached.data);
  }

  const state = await loadState();
  const [externalDeployments, modelSignal] = await Promise.all([
    fetchExternalDeployments(),
    getModelSignal(),
  ]);
  const nowMs = Date.now();
  const manualDeployments = state.manualDeployments.map((d) => materializeManualDeployment(d, nowMs));
  const deployments = mergeDeployments(manualDeployments, externalDeployments);
  const deploymentsSummary = summarizeDeployments(deployments);

  const infraBase = buildInfrastructure(deployments, modelSignal);
  const alertsBase = buildBaseAlerts(deployments, infraBase, modelSignal);
  const alerts = applyAlertOverrides(alertsBase, state);
  const alertsSummary = summarizeAlerts(alerts);

  const infrastructure = withInfraAlertCounters(infraBase, alerts);
  const healthScore = buildHealthScore(infrastructure, alertsSummary, deploymentsSummary);
  const recommendations = buildRecommendations(state, alertsSummary, deploymentsSummary, infrastructure);

  const costSnapshot = buildBaseCost(infrastructure, deployments);
  const potentialSavings = recommendations
    .filter((r) => r.status !== "dismissed")
    .reduce((acc, r) => acc + r.estimatedSavings, 0);
  costSnapshot.potentialSavings = potentialSavings;
  const savingsPct = costSnapshot.projected > 0
    ? Math.round((potentialSavings / costSnapshot.projected) * 100)
    : 0;
  costSnapshot.savingsPercentage = `${savingsPct}% reduction`;

  const reports = [...state.reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
  const activityEvents = buildActivity(deployments, alerts, recommendations);
  const logs = buildLogs(deployments, alerts, modelSignal);
  const notifications = buildNotifications(state, alerts, deployments, reports, modelSignal);
  const topology = buildTopologyFromInfra(infrastructure);

  const data: LiveSnapshot = {
    healthScore,
    alerts,
    alertsSummary,
    deployments,
    deploymentsSummary,
    costSnapshot,
    recommendations,
    infrastructure,
    activityEvents,
    logs,
    notifications,
    reports,
    settings: state.settings,
    topology,
    lastUpdated: nowIso(),
  };
  snapshotCache = { at: Date.now(), data };
  return deepCopy(data);
}

function filterAlerts(
  alerts: Alert[],
  params: { severity?: string | null; status?: string | null; service?: string | null; search?: string | null },
): Alert[] {
  let out = alerts.slice();
  if (params.severity) out = out.filter((a) => a.severity === params.severity);
  if (params.status) out = out.filter((a) => a.status === params.status);
  if (params.service) out = out.filter((a) => a.service === params.service);
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.service.toLowerCase().includes(q),
    );
  }
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

export async function getLiveDashboardData(): Promise<DashboardData> {
  const snap = await buildSnapshot();
  return {
    healthScore: snap.healthScore,
    alertsSummary: snap.alertsSummary,
    deploymentsSummary: snap.deploymentsSummary,
    costSnapshot: snap.costSnapshot,
    recommendations: snap.recommendations.filter((r) => r.status !== "dismissed").slice(0, 3),
    infrastructure: snap.infrastructure,
    recentActivity: snap.activityEvents.slice(0, 8),
    lastUpdated: snap.lastUpdated,
  };
}

export async function getLiveHealthScore(): Promise<HealthScore> {
  return (await buildSnapshot()).healthScore;
}

export async function getLiveInfrastructure(): Promise<InfrastructureNode[]> {
  return (await buildSnapshot()).infrastructure;
}

export async function getLiveCostSnapshot(): Promise<CostSnapshot> {
  return (await buildSnapshot()).costSnapshot;
}

export async function getLiveAlerts(params: {
  severity?: string | null;
  status?: string | null;
  service?: string | null;
  search?: string | null;
}): Promise<{ alerts: Alert[]; summary: AlertsSummary }> {
  const snap = await buildSnapshot();
  return {
    alerts: filterAlerts(snap.alerts, params),
    summary: snap.alertsSummary,
  };
}

export async function updateLiveAlert(update: { id: string } & Partial<Alert>): Promise<Alert | null> {
  if (!update.id) return null;
  const existing = (await buildSnapshot(true)).alerts.find((a) => a.id === update.id);
  if (!existing) return null;

  await mutateState((state) => {
    const action =
      update.status === "acknowledged"
        ? "Acknowledged"
        : update.status === "resolved"
          ? "Resolved"
          : update.assignee
            ? `Assigned to ${update.assignee}`
            : "Updated";
    const details =
      update.status
        ? `Status changed to ${update.status}`
        : update.assignee
          ? `Assignee set to ${update.assignee}`
          : "Alert metadata updated";
    const ov = state.alertOverrides[update.id] || { history: [], updatedAt: existing.updatedAt };
    ov.status = (update.status as AlertStatus | undefined) || ov.status;
    if (update.assignee !== undefined) ov.assignee = update.assignee;
    ov.updatedAt = nowIso();
    ov.history.push({
      id: `h-${randomUUID().slice(0, 8)}`,
      action,
      user: state.settings.profile.name || "operator",
      timestamp: ov.updatedAt,
      details,
    });
    state.alertOverrides[update.id] = ov;
  });
  invalidateCaches();
  return (await buildSnapshot(true)).alerts.find((a) => a.id === update.id) || null;
}

export async function getLiveDeployments(params: {
  environment?: string | null;
  status?: string | null;
}): Promise<{ deployments: Deployment[]; summary: DeploymentsSummary }> {
  const snap = await buildSnapshot();
  let deployments = snap.deployments;
  if (params.environment) {
    deployments = deployments.filter(
      (d) => inferEnvironment(d.environment) === inferEnvironment(params.environment as string),
    );
  }
  if (params.status) {
    deployments = deployments.filter((d) => d.status === params.status);
  }
  return { deployments, summary: summarizeDeployments(deployments) };
}

export async function createLiveDeployment(input: CreateDeploymentInput): Promise<Deployment> {
  const createdAt = nowIso();
  const id = `DEP-${randomUUID().slice(0, 6).toUpperCase()}`;
  const dep: Deployment = {
    id,
    service: input.service,
    version: input.version,
    commitHash: input.commitHash,
    environment: input.environment,
    status: "queued",
    duration: null,
    triggeredBy: "manual",
    startedAt: createdAt,
    completedAt: null,
    progress: 0,
    logs: [
      {
        id: `log-${id}-1`,
        timestamp: createdAt,
        level: "info",
        message: `Queued deployment for ${input.service} ${input.version} (${input.environment})`,
      },
    ],
  };
  await mutateState((state) => {
    state.manualDeployments.unshift(dep);
  });
  invalidateCaches();
  return dep;
}

export async function getLiveActivity(page: number, pageSize: number): Promise<PaginatedResponse<ActivityEvent>> {
  const events = (await buildSnapshot()).activityEvents;
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, Math.min(100, pageSize));
  const start = (safePage - 1) * safeSize;
  const end = start + safeSize;
  return {
    data: events.slice(start, end),
    total: events.length,
    page: safePage,
    pageSize: safeSize,
    hasMore: end < events.length,
  };
}

export async function getLiveLogs(
  params: {
    search?: string | null;
    level?: string | null;
    service?: string | null;
    environment?: string | null;
  },
  page: number,
  pageSize: number,
): Promise<PaginatedResponse<LogEntry>> {
  let logs = (await buildSnapshot()).logs;
  if (params.search) {
    const q = params.search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q) ||
        l.traceId.toLowerCase().includes(q),
    );
  }
  if (params.level) logs = logs.filter((l) => l.level === params.level);
  if (params.service) logs = logs.filter((l) => l.service === params.service);
  if (params.environment) logs = logs.filter((l) => l.environment === params.environment);

  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, Math.min(200, pageSize));
  const start = (safePage - 1) * safeSize;
  const end = start + safeSize;
  return {
    data: logs.slice(start, end),
    total: logs.length,
    page: safePage,
    pageSize: safeSize,
    hasMore: end < logs.length,
  };
}

export async function getLiveRecommendations(): Promise<Recommendation[]> {
  return (await buildSnapshot()).recommendations;
}

export async function updateLiveRecommendation(
  id: string,
  status: RecommendationStatus,
): Promise<Recommendation | null> {
  await mutateState((state) => {
    state.recommendationStatus[id] = status;
  });
  invalidateCaches();
  return (await buildSnapshot(true)).recommendations.find((r) => r.id === id) || null;
}

function buildReportFromSnapshot(snapshot: LiveSnapshot, generatedBy: string): Report {
  const criticalAlerts = snapshot.alerts.filter(
    (a) => a.status !== "resolved" && (a.severity === "critical" || a.severity === "high"),
  );
  const topRisks = criticalAlerts.slice(0, 5).map((a) => `${a.title} (${a.severity})`);
  const costOps = snapshot.recommendations
    .filter((r) => r.estimatedSavings > 0)
    .slice(0, 5)
    .map((r) => `${r.title} (-₹${r.estimatedSavings.toLocaleString("en-IN")}/mo)`);
  const perf = snapshot.recommendations
    .filter((r) => r.category.toLowerCase().includes("performance") || r.category.toLowerCase().includes("reliability"))
    .slice(0, 5)
    .map((r) => r.title);
  const security = snapshot.alerts
    .filter((a) => a.title.toLowerCase().includes("security") || a.title.toLowerCase().includes("vulnerability"))
    .slice(0, 5)
    .map((a) => a.title);

  return {
    id: `RPT-${randomUUID().slice(0, 5).toUpperCase()}`,
    title: "Live Optimization Report",
    type: "optimization",
    status: "completed",
    generatedAt: nowIso(),
    generatedBy,
    score: snapshot.healthScore.score,
    savingsEstimate: snapshot.costSnapshot.potentialSavings,
    recommendationCount: snapshot.recommendations.length,
    summary: `Health score ${snapshot.healthScore.score}/100 with ${snapshot.alertsSummary.open} open incidents and projected spend ₹${snapshot.costSnapshot.projected.toLocaleString("en-IN")}.`,
    topRisks,
    costOpportunities: costOps,
    performanceBottlenecks: perf,
    securityFindings: security,
    recommendations: snapshot.recommendations.slice(0, 8).map((r) => r.title),
  };
}

export async function getLiveReports(): Promise<Report[]> {
  return (await buildSnapshot()).reports;
}

export async function generateLiveReport(): Promise<Report> {
  const snapshot = await buildSnapshot(true);
  const generatedBy = snapshot.settings.profile.name || "operator";
  const report = buildReportFromSnapshot(snapshot, generatedBy);
  await mutateState((state) => {
    state.reports.unshift(report);
    if (state.reports.length > 100) state.reports = state.reports.slice(0, 100);
  });
  invalidateCaches();
  return report;
}

export async function deleteLiveReport(id: string): Promise<boolean> {
  let removed = false;
  await mutateState((state) => {
    const before = state.reports.length;
    state.reports = state.reports.filter((r) => r.id !== id);
    removed = state.reports.length < before;
  });
  invalidateCaches();
  return removed;
}

export async function getLiveNotifications(): Promise<Notification[]> {
  return (await buildSnapshot()).notifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await mutateState((state) => {
    state.notificationRead[id] = true;
  });
  invalidateCaches();
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifications = await getLiveNotifications();
  await mutateState((state) => {
    for (const n of notifications) state.notificationRead[n.id] = true;
  });
  invalidateCaches();
}

export async function getLiveSettings(): Promise<AppSettings> {
  return (await buildSnapshot()).settings;
}

function mergeSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return {
    ...current,
    ...patch,
    profile: { ...current.profile, ...(patch.profile || {}) },
    notifications: { ...current.notifications, ...(patch.notifications || {}) },
    dashboard: { ...current.dashboard, ...(patch.dashboard || {}) },
    integrations: {
      ...current.integrations,
      ...(patch.integrations || {}),
      aws: { ...current.integrations.aws, ...(patch.integrations?.aws || {}) },
      slack: { ...current.integrations.slack, ...(patch.integrations?.slack || {}) },
      pagerduty: { ...current.integrations.pagerduty, ...(patch.integrations?.pagerduty || {}) },
      datadog: { ...current.integrations.datadog, ...(patch.integrations?.datadog || {}) },
    },
  };
}

export async function updateLiveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  await mutateState((state) => {
    state.settings = mergeSettings(state.settings, patch);
  });
  invalidateCaches();
  return (await buildSnapshot(true)).settings;
}

function searchResult(
  id: string,
  title: string,
  description: string,
  category: SearchResultCategory,
  icon: string,
  opts?: { url?: string; action?: string },
): SearchResult {
  return {
    id,
    title,
    description,
    category,
    icon,
    ...(opts?.url ? { url: opts.url } : {}),
    ...(opts?.action ? { action: opts.action } : {}),
  };
}

export async function getLiveSearchResults(query: string): Promise<SearchResult[]> {
  const snap = await buildSnapshot();
  const pages: SearchResult[] = [
    searchResult("page-dashboard", "Dashboard", "Live operational overview", "page", "layout-dashboard", { url: "/dashboard" }),
    searchResult("page-monitoring", "Monitoring", "System metrics and alerts", "page", "activity", { url: "/monitoring" }),
    searchResult("page-alerts", "Alerts", "Incident queue", "page", "alert-circle", { url: "/alerts" }),
    searchResult("page-deployments", "Deployments", "Release pipeline", "page", "rocket", { url: "/deployments" }),
    searchResult("page-infra", "Infrastructure", "Topology and health", "page", "server", { url: "/infrastructure" }),
    searchResult("page-reports", "Reports", "Optimization reports", "page", "file-text", { url: "/reports" }),
    searchResult("action-report", "Generate Report", "Create optimization report", "action", "file-plus", { action: "generate-report" }),
  ];

  const dynamic = [
    ...snap.alerts.slice(0, 20).map((a) =>
      searchResult(`alert-${a.id}`, a.title, `${a.severity} • ${a.service}`, "alert", "alert-circle", { url: "/alerts" }),
    ),
    ...snap.deployments.slice(0, 20).map((d) =>
      searchResult(`dep-${d.id}`, `${d.service} ${d.version}`, `${d.status} • ${d.environment}`, "deployment", "rocket", {
        url: "/deployments",
      }),
    ),
    ...snap.reports.slice(0, 10).map((r) =>
      searchResult(`report-${r.id}`, r.title, `${r.type} • score ${r.score}/100`, "report", "file-text", { url: "/reports" }),
    ),
    ...snap.logs.slice(0, 20).map((l) =>
      searchResult(`log-${l.id}`, l.service, l.message.slice(0, 120), "log", "scroll-text", { url: "/logs" }),
    ),
  ];
  const all = [...pages, ...dynamic];
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, 20);
  return all
    .filter((item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q))
    .slice(0, 25);
}

export async function getLiveTopology(): Promise<TopologyResponse> {
  return (await buildSnapshot()).topology;
}

export async function getLiveTopologyNodeDetail(nodeId: string): Promise<TopologyNodeDetail | null> {
  const snap = await buildSnapshot();
  const node = snap.topology.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const relatedAlerts = snap.alerts
    .filter((a) => a.service.toLowerCase().includes(node.label.toLowerCase()) || node.label.toLowerCase().includes(a.service.toLowerCase()))
    .slice(0, 5)
    .map((a) => ({ id: a.id, title: a.title, severity: a.severity, timestamp: a.updatedAt }));
  const relatedLogs = snap.logs
    .filter((l) => l.service.toLowerCase().includes(node.label.toLowerCase()) || node.label.toLowerCase().includes(l.service.toLowerCase()))
    .slice(0, 8)
    .map((l) => ({ id: l.id, level: l.level, message: l.message, timestamp: l.timestamp }));
  const relatedDeployments = snap.deployments
    .filter((d) => d.service.toLowerCase().includes(node.label.toLowerCase()) || node.label.toLowerCase().includes(d.service.toLowerCase()))
    .slice(0, 6)
    .map((d) => ({ id: d.id, version: d.version, status: d.status, timestamp: d.startedAt }));
  const upstreamDeps = snap.topology.edges.filter((e) => e.target === nodeId).map((e) => e.source);
  const downstreamDeps = snap.topology.edges.filter((e) => e.source === nodeId).map((e) => e.target);
  const recommendedActions = snap.recommendations
    .filter((r) => r.status !== "dismissed")
    .slice(0, 4)
    .map((r) => r.title);

  const healthScore = clamp(
    Math.round(
      100 -
        relatedAlerts.length * 6 -
        relatedLogs.filter((l) => l.level === "error").length * 5 -
        relatedDeployments.filter((d) => d.status === "failed" || d.status === "rolled_back").length * 8,
    ),
    35,
    100,
  );

  return {
    node,
    health: {
      score: healthScore,
      checks: 12,
      passed: clamp(12 - relatedAlerts.length, 2, 12),
    },
    recentAlerts: relatedAlerts,
    recentLogs: relatedLogs,
    recentDeployments: relatedDeployments,
    upstreamDeps,
    downstreamDeps,
    recommendedActions,
  };
}


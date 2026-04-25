// ── Health Score ──────────────────────────────────────────────
export interface HealthCategory {
  name: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  details: string;
  affectedResources: number;
}

export interface HealthScore {
  score: number;
  trend: number;
  checksPassed: number;
  totalChecks: number;
  warnings: number;
  lastUpdated: string;
  breakdown: HealthCategory[];
}

// ── Alerts ───────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  service: string;
  environment: string;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  incidentCode: string;
  history: AlertHistoryEntry[];
}

export interface AlertHistoryEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

export interface AlertsFilter {
  severity?: AlertSeverity;
  status?: AlertStatus;
  service?: string;
  search?: string;
  dateRange?: { start: string; end: string };
}

export interface AlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  acknowledged: number;
  resolved: number;
}

// ── Deployments ──────────────────────────────────────────────
export type DeploymentStatus = 'running' | 'success' | 'failed' | 'rolled_back' | 'queued';

export interface Deployment {
  id: string;
  service: string;
  version: string;
  commitHash: string;
  environment: string;
  status: DeploymentStatus;
  duration: number | null;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  progress: number;
  logs: DeploymentLog[];
}

export interface DeploymentLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface CreateDeploymentInput {
  service: string;
  version: string;
  environment: string;
  commitHash: string;
}

export interface DeploymentsSummary {
  total: number;
  running: number;
  success: number;
  failed: number;
  rolledBack: number;
  queued: number;
  completedToday: number;
  avgDuration: number;
}

// ── Cost ─────────────────────────────────────────────────────
export interface ServiceCost {
  service: string;
  cost: number;
  trend: number;
  icon: string;
}

export interface CostSnapshot {
  currentMonth: number;
  projected: number;
  potentialSavings: number;
  trend: number;
  savingsPercentage: string;
  services: ServiceCost[];
  lastUpdated: string;
  dailyCosts: { date: string; cost: number }[];
}

// ── Recommendations ──────────────────────────────────────────
export type RecommendationImpact = 'high' | 'medium' | 'low';
export type RecommendationStatus = 'pending' | 'in_progress' | 'applied' | 'dismissed';
export type RecommendationDifficulty = 'easy' | 'medium' | 'hard';

export interface Recommendation {
  id: string;
  title: string;
  impact: RecommendationImpact;
  estimatedSavings: number;
  performanceImprovement: string;
  difficulty: RecommendationDifficulty;
  category: string;
  description: string;
  status: RecommendationStatus;
  createdAt: string;
}

// ── Infrastructure ───────────────────────────────────────────
export type InfraStatus = 'operational' | 'degraded' | 'outage';

export interface InfrastructureNode {
  id: string;
  name: string;
  type: string;
  nodes: number;
  totalNodes: number;
  cpuAvg: number;
  memoryAvg: number;
  region: string;
  status: InfraStatus;
  uptime: number;
  latency: number;
  errorRate: number;
  activeIncidents: number;
  relatedDeployments: number;
  relatedAlerts: number;
}

// ── Activity Timeline ────────────────────────────────────────
export type ActivityType =
  | 'deployment'
  | 'alert'
  | 'config_change'
  | 'recommendation'
  | 'report'
  | 'security_scan'
  | 'incident_resolved';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  user: string;
  timestamp: string;
  metadata: Record<string, string>;
}

// ── Monitoring Metrics ───────────────────────────────────────
export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface ServiceMetrics {
  service: string;
  cpu: MetricPoint[];
  memory: MetricPoint[];
  network: MetricPoint[];
  errorRate: MetricPoint[];
  latency: MetricPoint[];
  uptime: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface MonitoringKPI {
  label: string;
  value: string;
  change: number;
  status: 'up' | 'down' | 'stable';
  icon: string;
}

// ── Logs ─────────────────────────────────────────────────────
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  message: string;
  traceId: string;
  metadata?: Record<string, string>;
}

export interface LogsFilter {
  search?: string;
  level?: LogLevel;
  service?: string;
  environment?: string;
  dateRange?: { start: string; end: string };
}

// ── Reports ──────────────────────────────────────────────────
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type ReportType = 'optimization' | 'security' | 'cost' | 'performance';

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  generatedAt: string;
  generatedBy: string;
  score: number;
  savingsEstimate: number;
  recommendationCount: number;
  summary: string;
  topRisks: string[];
  costOpportunities: string[];
  performanceBottlenecks: string[];
  securityFindings: string[];
  recommendations: string[];
}

// ── Notifications ────────────────────────────────────────────
export type NotificationType = 'alert' | 'deployment' | 'report' | 'recommendation' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ── Settings ─────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  timezone: string;
}

export interface AppSettings {
  profile: UserProfile;
  notifications: {
    emailAlerts: boolean;
    slackIntegration: boolean;
    criticalOnly: boolean;
    digestFrequency: 'realtime' | 'hourly' | 'daily';
  };
  dashboard: {
    refreshInterval: number;
    defaultTimeRange: string;
    autoRefresh: boolean;
  };
  integrations: {
    aws: { connected: boolean; region: string };
    slack: { connected: boolean; channel: string };
    pagerduty: { connected: boolean };
    datadog: { connected: boolean };
  };
}

// ── Search / Command Palette ─────────────────────────────────
export type SearchResultCategory = 'page' | 'alert' | 'deployment' | 'infrastructure' | 'action' | 'report' | 'log';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: SearchResultCategory;
  icon: string;
  url?: string;
  action?: string;
}

// ── Dashboard Summary ────────────────────────────────────────
export interface DashboardData {
  healthScore: HealthScore;
  alertsSummary: AlertsSummary;
  deploymentsSummary: DeploymentsSummary;
  costSnapshot: CostSnapshot;
  recommendations: Recommendation[];
  infrastructure: InfrastructureNode[];
  recentActivity: ActivityEvent[];
  lastUpdated: string;
}

// ── Topology / Architecture Map ──────────────────────────────
export type TopoNodeStatus = 'healthy' | 'warning' | 'critical';
export type TopoNodeType = 'load_balancer' | 'gateway' | 'service' | 'database' | 'cache';

export interface TopoNodeMetrics {
  [key: string]: string | number;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: TopoNodeType;
  subtitle: string;
  environment: string;
  status: TopoNodeStatus;
  region: string;
  metrics: TopoNodeMetrics;
  position: { x: number; y: number };
  dependencies: string[];
  metadata: Record<string, string>;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  status: TopoNodeStatus;
  traffic: string;
  latencyP95: string;
  errorRate: string;
  protocol: string;
}

export interface TopologyNodeDetail {
  node: TopologyNode;
  health: { score: number; checks: number; passed: number };
  recentAlerts: { id: string; title: string; severity: string; timestamp: string }[];
  recentLogs: { id: string; level: string; message: string; timestamp: string }[];
  recentDeployments: { id: string; version: string; status: string; timestamp: string }[];
  upstreamDeps: string[];
  downstreamDeps: string[];
  recommendedActions: string[];
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  lastUpdated: string;
}

// ── API Response Wrapper ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type IncidentSeverity = 'P1' | 'P2' | 'P3';

export interface PostMortemTimelineEntry {
  time: string;
  event: string;
}

export interface PostMortemFollowUpAction {
  action: string;
  owner: string;
  dueDate: string;
}

export interface IncidentPostMortem {
  title: string;
  severity: IncidentSeverity;
  timeline: PostMortemTimelineEntry[];
  rootCause: string;
  impactedServices: string[];
  resolutionSteps: string[];
  followUpActions: PostMortemFollowUpAction[];
  lessonsLearned: string;
}

export interface CostAnomaly {
  service: string;
  currentCost: number;
  previousCost: number;
  percentChange: number;
  topContributors: string[];
}

export interface CostAnomalyContext {
  anomalies: CostAnomaly[];
  totalSpendChange: number;
}

export interface CostAnomalyExplainResponse {
  hasAnomalies: boolean;
  anomalies?: CostAnomaly[];
  aiExplanation?: string;
}

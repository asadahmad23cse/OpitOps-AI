import type {
  Alert, AlertsSummary, Deployment, DeploymentsSummary, HealthScore,
  CostSnapshot, Recommendation, InfrastructureNode, ActivityEvent,
  LogEntry, Report, Notification, AppSettings, SearchResult,
  MonitoringKPI, ServiceMetrics, MetricPoint,
} from '@/types';

// ── Helpers ──────────────────────────────────────────────────
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}
function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

function generateTimeSeries(hours: number, baseValue: number, variance: number): MetricPoint[] {
  const points: MetricPoint[] = [];
  for (let i = hours; i >= 0; i--) {
    points.push({
      timestamp: hoursAgo(i),
      value: baseValue + (Math.random() - 0.5) * variance * 2,
    });
  }
  return points;
}

// ── Health Score ─────────────────────────────────────────────
export const healthScore: HealthScore = {
  score: 94,
  trend: 3,
  checksPassed: 89,
  totalChecks: 95,
  warnings: 6,
  lastUpdated: minutesAgo(2),
  breakdown: [
    { name: 'Infrastructure Uptime', score: 98, status: 'healthy', details: '99.97% uptime across all regions', affectedResources: 0 },
    { name: 'Open Incidents', score: 88, status: 'warning', details: '3 active alerts, 1 critical', affectedResources: 3 },
    { name: 'CPU/Memory Thresholds', score: 92, status: 'healthy', details: 'All services within 80% threshold', affectedResources: 0 },
    { name: 'Deployment Success Rate', score: 96, status: 'healthy', details: '48/50 deployments succeeded this week', affectedResources: 2 },
    { name: 'Database Health', score: 95, status: 'healthy', details: 'All clusters operational, replication lag < 50ms', affectedResources: 0 },
    { name: 'Security Compliance', score: 90, status: 'warning', details: '2 medium-severity findings pending', affectedResources: 2 },
  ],
};

// ── Alerts ───────────────────────────────────────────────────
export const alerts: Alert[] = [
  {
    id: 'ALT-001', title: 'Database Connection Pool Exhausted', description: 'Primary database connection pool at 98% capacity. Service degradation imminent if not addressed.',
    severity: 'critical', status: 'open', service: 'API Gateway', environment: 'Production',
    assignee: 'Sarah Kim', createdAt: minutesAgo(15), updatedAt: minutesAgo(15), incidentCode: 'INC-2847',
    history: [
      { id: 'h1', action: 'Alert created', user: 'System', timestamp: minutesAgo(15), details: 'Auto-detected by monitoring agent' },
      { id: 'h2', action: 'Assigned to Sarah Kim', user: 'System', timestamp: minutesAgo(14), details: 'P1 auto-assignment rule' },
    ],
  },
  {
    id: 'ALT-002', title: 'High Memory Usage on Worker Nodes', description: 'Worker nodes in us-east-1 showing 92% memory utilization consistently for the past 30 minutes.',
    severity: 'high', status: 'acknowledged', service: 'Worker Service', environment: 'Production',
    assignee: 'Mike Johnson', createdAt: hoursAgo(1), updatedAt: minutesAgo(30), incidentCode: 'INC-2846',
    history: [
      { id: 'h3', action: 'Alert created', user: 'System', timestamp: hoursAgo(1), details: 'Memory threshold exceeded' },
      { id: 'h4', action: 'Acknowledged', user: 'Mike Johnson', timestamp: minutesAgo(30), details: 'Investigating memory leak in batch processor' },
    ],
  },
  {
    id: 'ALT-003', title: 'SSL Certificate Expiring Soon', description: 'SSL certificate for api.optiops.io expires in 14 days. Renewal required.',
    severity: 'medium', status: 'open', service: 'Load Balancer', environment: 'Production',
    assignee: null, createdAt: hoursAgo(4), updatedAt: hoursAgo(4), incidentCode: 'INC-2845',
    history: [{ id: 'h5', action: 'Alert created', user: 'System', timestamp: hoursAgo(4), details: 'Certificate expiration check' }],
  },
  {
    id: 'ALT-004', title: 'Elevated Error Rate on Auth Service', description: 'Authentication service returning 5xx errors at 2.3% rate, above 1% threshold.',
    severity: 'high', status: 'open', service: 'Auth Service', environment: 'Production',
    assignee: 'Alex Chen', createdAt: minutesAgo(45), updatedAt: minutesAgo(20), incidentCode: 'INC-2848',
    history: [
      { id: 'h6', action: 'Alert created', user: 'System', timestamp: minutesAgo(45), details: 'Error rate threshold exceeded' },
      { id: 'h7', action: 'Assigned to Alex Chen', user: 'Sarah Kim', timestamp: minutesAgo(20), details: 'Manual assignment' },
    ],
  },
  {
    id: 'ALT-005', title: 'Disk Usage Warning on Log Aggregator', description: 'Log aggregator disk usage at 78%, projected to reach 90% in 48 hours.',
    severity: 'low', status: 'open', service: 'Log Aggregator', environment: 'Staging',
    assignee: null, createdAt: hoursAgo(6), updatedAt: hoursAgo(6), incidentCode: 'INC-2844',
    history: [{ id: 'h8', action: 'Alert created', user: 'System', timestamp: hoursAgo(6), details: 'Disk usage projection alert' }],
  },
  {
    id: 'ALT-006', title: 'Cache Hit Rate Below Threshold', description: 'Redis cache hit rate dropped to 72%, below the 85% target.',
    severity: 'medium', status: 'resolved', service: 'Cache Layer', environment: 'Production',
    assignee: 'Lisa Wang', createdAt: daysAgo(1), updatedAt: hoursAgo(18), incidentCode: 'INC-2840',
    history: [
      { id: 'h9', action: 'Alert created', user: 'System', timestamp: daysAgo(1), details: 'Cache performance degradation' },
      { id: 'h10', action: 'Resolved', user: 'Lisa Wang', timestamp: hoursAgo(18), details: 'Increased cache TTL and warmed hot keys' },
    ],
  },
  {
    id: 'ALT-007', title: 'API Latency Spike Detected', description: 'P99 latency for /api/v2/users endpoint increased to 1.8s from 300ms baseline.',
    severity: 'high', status: 'resolved', service: 'API Gateway', environment: 'Production',
    assignee: 'Alex Chen', createdAt: daysAgo(2), updatedAt: daysAgo(1), incidentCode: 'INC-2838',
    history: [
      { id: 'h11', action: 'Alert created', user: 'System', timestamp: daysAgo(2), details: 'Latency anomaly detection' },
      { id: 'h12', action: 'Resolved', user: 'Alex Chen', timestamp: daysAgo(1), details: 'Database index optimization applied' },
    ],
  },
];

export function getAlertsSummary(): AlertsSummary {
  return {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    open: alerts.filter(a => a.status === 'open').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };
}

// ── Deployments ──────────────────────────────────────────────
export const deployments: Deployment[] = [
  {
    id: 'DEP-001', service: 'API Gateway', version: 'v2.4.1', commitHash: 'a3f8c2d', environment: 'Production',
    status: 'success', duration: 252000, triggeredBy: 'Alex Chen', startedAt: minutesAgo(10), completedAt: minutesAgo(6), progress: 100,
    logs: [
      { id: 'l1', timestamp: minutesAgo(10), level: 'info', message: 'Starting deployment pipeline...' },
      { id: 'l2', timestamp: minutesAgo(9), level: 'info', message: 'Building Docker image v2.4.1...' },
      { id: 'l3', timestamp: minutesAgo(8), level: 'info', message: 'Running test suite (142 tests)...' },
      { id: 'l4', timestamp: minutesAgo(7), level: 'info', message: 'All tests passed. Pushing to registry...' },
      { id: 'l5', timestamp: minutesAgo(6), level: 'info', message: 'Deployment complete. Health checks passing.' },
    ],
  },
  {
    id: 'DEP-002', service: 'Auth Service', version: 'v1.8.3', commitHash: 'b7e1f9a', environment: 'Production',
    status: 'running', duration: null, triggeredBy: 'CI/CD Pipeline', startedAt: minutesAgo(3), completedAt: null, progress: 65,
    logs: [
      { id: 'l6', timestamp: minutesAgo(3), level: 'info', message: 'Starting deployment pipeline...' },
      { id: 'l7', timestamp: minutesAgo(2), level: 'info', message: 'Building Docker image v1.8.3...' },
      { id: 'l8', timestamp: minutesAgo(1), level: 'info', message: 'Running canary deployment (25% traffic)...' },
    ],
  },
  {
    id: 'DEP-003', service: 'Payment Service', version: 'v3.1.0', commitHash: 'c4d2e8f', environment: 'Staging',
    status: 'failed', duration: 180000, triggeredBy: 'Sarah Kim', startedAt: hoursAgo(2), completedAt: hoursAgo(2), progress: 100,
    logs: [
      { id: 'l9', timestamp: hoursAgo(2), level: 'info', message: 'Starting deployment...' },
      { id: 'l10', timestamp: hoursAgo(2), level: 'info', message: 'Running migrations...' },
      { id: 'l11', timestamp: hoursAgo(2), level: 'error', message: 'Migration failed: column "payment_method_v2" already exists' },
      { id: 'l12', timestamp: hoursAgo(2), level: 'error', message: 'Deployment aborted. Rolling back...' },
    ],
  },
  {
    id: 'DEP-004', service: 'Worker Service', version: 'v2.4.0', commitHash: 'e9a3b7c', environment: 'Production',
    status: 'rolled_back', duration: 300000, triggeredBy: 'Mike Johnson', startedAt: hoursAgo(5), completedAt: hoursAgo(5), progress: 100,
    logs: [
      { id: 'l13', timestamp: hoursAgo(5), level: 'info', message: 'Deployment succeeded initially.' },
      { id: 'l14', timestamp: hoursAgo(5), level: 'warn', message: 'Post-deploy health check failures detected.' },
      { id: 'l15', timestamp: hoursAgo(5), level: 'error', message: 'Automatically rolled back to v2.3.9' },
    ],
  },
  {
    id: 'DEP-005', service: 'Notification Service', version: 'v1.2.5', commitHash: 'f1b4d6e', environment: 'Development',
    status: 'queued', duration: null, triggeredBy: 'CI/CD Pipeline', startedAt: minutesAgo(1), completedAt: null, progress: 0,
    logs: [{ id: 'l16', timestamp: minutesAgo(1), level: 'info', message: 'Queued for deployment. Waiting for available runner...' }],
  },
  {
    id: 'DEP-006', service: 'Dashboard API', version: 'v4.0.2', commitHash: 'g2c5e8a', environment: 'Production',
    status: 'success', duration: 198000, triggeredBy: 'Alex Chen', startedAt: daysAgo(1), completedAt: daysAgo(1), progress: 100,
    logs: [
      { id: 'l17', timestamp: daysAgo(1), level: 'info', message: 'Deployment completed successfully in 3m 18s.' },
    ],
  },
];

export function computeDeploymentsSummary(list: Deployment[]): DeploymentsSummary {
  const today = new Date().toDateString();
  const withDuration = list.filter((d) => d.duration != null && d.duration > 0);
  return {
    total: list.length,
    running: list.filter((d) => d.status === "running").length,
    success: list.filter((d) => d.status === "success").length,
    failed: list.filter((d) => d.status === "failed").length,
    rolledBack: list.filter((d) => d.status === "rolled_back").length,
    queued: list.filter((d) => d.status === "queued").length,
    completedToday: list.filter(
      (d) => d.completedAt && new Date(d.completedAt).toDateString() === today,
    ).length,
    avgDuration:
      withDuration.length > 0
        ? Math.round(
            withDuration.reduce((s, d) => s + (d.duration || 0), 0) / withDuration.length,
          )
        : 0,
  };
}

export function getDeploymentsSummary(): DeploymentsSummary {
  return computeDeploymentsSummary(deployments);
}

// ── Cost (amounts in Indian Rupees, INR) ─────────────────────
export const costSnapshot: CostSnapshot = {
  currentMonth: 2_36_301, // ≈ prior USD mock × 83
  projected: 4_25_292,
  potentialSavings: 42_496,
  trend: -4.2,
  savingsPercentage: '18% reduction',
  services: [
    { service: 'AWS EC2', cost: 1_03_335, trend: -2.1, icon: 'server' },
    { service: 'RDS Databases', cost: 74_036, trend: 1.3, icon: 'database' },
    { service: 'Data Transfer', cost: 58_930, trend: -5.4, icon: 'network' },
  ],
  lastUpdated: minutesAgo(5),
  dailyCosts: Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    cost: Math.round((80 + Math.random() * 40) * 83),
  })),
};

// ── Recommendations ──────────────────────────────────────────
export const recommendations: Recommendation[] = [
  {
    id: 'REC-001', title: 'Enable Auto-scaling', impact: 'high', estimatedSavings: 28_220,
    performanceImprovement: '+25% throughput', difficulty: 'medium',
    category: 'Performance', description: 'Configure horizontal pod autoscaler for API Gateway to handle traffic spikes without over-provisioning.',
    status: 'pending', createdAt: daysAgo(3),
  },
  {
    id: 'REC-002', title: 'Right-size EC2 Instances', impact: 'high', estimatedSavings: 12_948,
    performanceImprovement: 'No degradation', difficulty: 'easy',
    category: 'Cost', description: 'Analysis shows 3 instances running at <20% average CPU. Downsize from m5.xlarge to m5.large.',
    status: 'pending', createdAt: daysAgo(5),
  },
  {
    id: 'REC-003', title: 'Use Reserved Instances', impact: 'medium', estimatedSavings: 5_976,
    performanceImprovement: 'None', difficulty: 'easy',
    category: 'Cost', description: 'Convert 5 on-demand instances to 1-year reserved instances for predictable workloads.',
    status: 'pending', createdAt: daysAgo(7),
  },
  {
    id: 'REC-004', title: 'Enable Redis Caching', impact: 'high', estimatedSavings: 0,
    performanceImprovement: '+28% response time', difficulty: 'medium',
    category: 'Performance', description: 'Add Redis caching layer for frequently accessed user profile and settings endpoints.',
    status: 'in_progress', createdAt: daysAgo(10),
  },
  {
    id: 'REC-005', title: 'Optimize Database Connection Pooling', impact: 'medium', estimatedSavings: 3_735,
    performanceImprovement: '+15% query throughput', difficulty: 'easy',
    category: 'Performance', description: 'Current pool size is undersized. Increase from 10 to 25 connections per service.',
    status: 'applied', createdAt: daysAgo(14),
  },
];

// ── Infrastructure ───────────────────────────────────────────
export const infrastructure: InfrastructureNode[] = [
  { id: 'infra-prod', name: 'Production', type: 'Kubernetes', nodes: 24, totalNodes: 24, cpuAvg: 68, memoryAvg: 72, region: 'us-east-1', status: 'operational', uptime: 99.97, latency: 45, errorRate: 0.12, activeIncidents: 1, relatedDeployments: 3, relatedAlerts: 2 },
  { id: 'infra-staging', name: 'Staging', type: 'Kubernetes', nodes: 8, totalNodes: 8, cpuAvg: 45, memoryAvg: 52, region: 'us-east-1', status: 'operational', uptime: 99.85, latency: 52, errorRate: 0.34, activeIncidents: 0, relatedDeployments: 1, relatedAlerts: 0 },
  { id: 'infra-dev', name: 'Development', type: 'Kubernetes', nodes: 6, totalNodes: 8, cpuAvg: 32, memoryAvg: 38, region: 'us-west-2', status: 'degraded', uptime: 99.5, latency: 78, errorRate: 1.2, activeIncidents: 1, relatedDeployments: 2, relatedAlerts: 1 },
  { id: 'infra-db', name: 'Database Cluster', type: 'RDS Multi-AZ', nodes: 6, totalNodes: 6, cpuAvg: 72, memoryAvg: 65, region: 'us-east-1', status: 'operational', uptime: 99.99, latency: 12, errorRate: 0.01, activeIncidents: 0, relatedDeployments: 0, relatedAlerts: 0 },
  { id: 'infra-cache', name: 'Cache Layer', type: 'ElastiCache', nodes: 4, totalNodes: 6, cpuAvg: 58, memoryAvg: 82, region: 'us-east-1', status: 'degraded', uptime: 99.8, latency: 3, errorRate: 0.05, activeIncidents: 0, relatedDeployments: 0, relatedAlerts: 1 },
];

// ── Activity Timeline ────────────────────────────────────────
export const activityEvents: ActivityEvent[] = [
  { id: 'act-01', type: 'deployment', title: 'Deployed API Gateway v2.4.1 to Production', description: 'Healthy • 4m 32s duration', user: 'Alex Chen', timestamp: minutesAgo(10), metadata: { environment: 'Production', service: 'API Gateway' } },
  { id: 'act-02', type: 'alert', title: 'Database Connection Pool Exhausted', description: 'Sarah Kim • P1 Priority', user: 'System', timestamp: minutesAgo(15), metadata: { severity: 'critical', incidentCode: 'INC-2847' } },
  { id: 'act-03', type: 'config_change', title: 'Updated Auto-scaling Configuration', description: 'Min: 5 → Max: 12 → 16 pods', user: 'Mike Johnson', timestamp: hoursAgo(1), metadata: { service: 'Worker Service' } },
  { id: 'act-04', type: 'recommendation', title: 'AI: Enable Redis Caching', description: 'Performance improvement: +28%', user: 'AI Engine', timestamp: hoursAgo(2), metadata: { impact: 'high', savings: '₹0/mo' } },
  { id: 'act-05', type: 'report', title: 'Generated Weekly Optimization Report', description: '3 recommendations • ₹69,637 potential savings', user: 'System', timestamp: hoursAgo(3), metadata: { reportId: 'RPT-045' } },
  { id: 'act-06', type: 'deployment', title: 'Rolled back Worker Service v2.4.0', description: 'Automatically rolled back to v2.3.9', user: 'System', timestamp: hoursAgo(5), metadata: { environment: 'Production', service: 'Worker Service' } },
  { id: 'act-07', type: 'security_scan', title: 'Security Scan Completed', description: '2 medium findings • 0 critical', user: 'Security Scanner', timestamp: hoursAgo(8), metadata: { findings: '2' } },
  { id: 'act-08', type: 'config_change', title: 'Updated Connection Pool Settings', description: '10 → 20 connections', user: 'Lisa Wang', timestamp: daysAgo(1), metadata: { service: 'Payment Service' } },
  { id: 'act-09', type: 'incident_resolved', title: 'Resolved High Memory Usage', description: 'Resolution: Logs archived', user: 'Mike Johnson', timestamp: daysAgo(1), metadata: { duration: '4h 12m' } },
  { id: 'act-10', type: 'deployment', title: 'Deployed Auth Service v1.8.2 to Production', description: 'Healthy • 5m 12s duration', user: 'CI/CD Pipeline', timestamp: daysAgo(2), metadata: { environment: 'Production' } },
  { id: 'act-11', type: 'alert', title: 'API Latency Spike Resolved', description: 'Database index optimization applied', user: 'Alex Chen', timestamp: daysAgo(2), metadata: { severity: 'high' } },
  { id: 'act-12', type: 'report', title: 'Monthly Cost Analysis Report', description: '₹2,36,301 current month • ₹42,496 savings identified', user: 'System', timestamp: daysAgo(3), metadata: {} },
];

// ── Logs ─────────────────────────────────────────────────────
export const logEntries: LogEntry[] = [
  { id: 'log-001', timestamp: minutesAgo(1), level: 'error', service: 'API Gateway', environment: 'Production', message: 'Connection pool exhausted: max_connections=100, active=100, waiting=23', traceId: 'trace-a1b2c3' },
  { id: 'log-002', timestamp: minutesAgo(2), level: 'warn', service: 'Auth Service', environment: 'Production', message: 'Token refresh rate exceeding threshold: 450 req/s (limit: 500)', traceId: 'trace-d4e5f6' },
  { id: 'log-003', timestamp: minutesAgo(3), level: 'info', service: 'API Gateway', environment: 'Production', message: 'Deployment v2.4.1 health check passed on all 24 nodes', traceId: 'trace-g7h8i9' },
  { id: 'log-004', timestamp: minutesAgo(5), level: 'error', service: 'Payment Service', environment: 'Staging', message: 'Migration failed: column "payment_method_v2" already exists in table "transactions"', traceId: 'trace-j1k2l3' },
  { id: 'log-005', timestamp: minutesAgo(8), level: 'info', service: 'Worker Service', environment: 'Production', message: 'Auto-scaling event: scaling from 5 to 8 replicas based on CPU utilization', traceId: 'trace-m4n5o6' },
  { id: 'log-006', timestamp: minutesAgo(12), level: 'debug', service: 'Cache Layer', environment: 'Production', message: 'Cache eviction triggered: 1,247 keys removed, memory freed: 128MB', traceId: 'trace-p7q8r9' },
  { id: 'log-007', timestamp: minutesAgo(15), level: 'warn', service: 'Database Cluster', environment: 'Production', message: 'Replication lag increased to 45ms on replica-3 (threshold: 50ms)', traceId: 'trace-s1t2u3' },
  { id: 'log-008', timestamp: minutesAgo(20), level: 'info', service: 'Auth Service', environment: 'Production', message: 'Rate limiter engaged for IP 203.45.67.89: 1000 requests in 60s window', traceId: 'trace-v4w5x6' },
  { id: 'log-009', timestamp: hoursAgo(1), level: 'error', service: 'Worker Service', environment: 'Production', message: 'OOM killed: container worker-batch-processor exceeded 4GB memory limit', traceId: 'trace-y7z8a1' },
  { id: 'log-010', timestamp: hoursAgo(2), level: 'info', service: 'Notification Service', environment: 'Development', message: 'Email template engine initialized with 45 templates loaded', traceId: 'trace-b2c3d4' },
  { id: 'log-011', timestamp: hoursAgo(3), level: 'warn', service: 'API Gateway', environment: 'Production', message: 'Circuit breaker tripped for downstream service: payment-processor (5 failures in 30s)', traceId: 'trace-e5f6g7' },
  { id: 'log-012', timestamp: hoursAgo(5), level: 'info', service: 'Dashboard API', environment: 'Production', message: 'Metrics aggregation job completed: processed 2.4M data points in 12.3s', traceId: 'trace-h8i9j1' },
];

// ── Reports ──────────────────────────────────────────────────
export const reports: Report[] = [
  {
    id: 'RPT-045', title: 'Weekly Optimization Report', type: 'optimization', status: 'completed',
    generatedAt: hoursAgo(3), generatedBy: 'AI Engine', score: 94,     savingsEstimate: 69_637,
    recommendationCount: 5,
    summary: 'Overall infrastructure health is strong at 94/100. Three cost optimization opportunities identified totaling ₹69,637/month in potential savings.',
    topRisks: ['Database connection pool nearing capacity', 'SSL certificate expiring in 14 days'],
    costOpportunities: ['Right-size 3 EC2 instances (-₹12,948/mo)', 'Convert to reserved instances (-₹5,976/mo)', 'Enable auto-scaling (-₹28,220/mo)'],
    performanceBottlenecks: ['API Gateway P99 latency trending upward', 'Cache hit rate below 85% target'],
    securityFindings: ['2 medium-severity compliance findings', 'Outdated TLS version on staging load balancer'],
    recommendations: ['Enable auto-scaling for API Gateway', 'Right-size EC2 instances', 'Renew SSL certificates', 'Update TLS configuration', 'Optimize connection pooling'],
  },
  {
    id: 'RPT-044', title: 'Monthly Cost Analysis', type: 'cost', status: 'completed',
    generatedAt: daysAgo(3), generatedBy: 'System', score: 88,     savingsEstimate: 42_496,
    recommendationCount: 3,
    summary: 'Monthly cloud spend is ₹2,36,301, projected to reach ₹4,25,292 by month end. ₹42,496 in immediate savings identified.',
    topRisks: ['Projected 8% cost overrun vs budget'], costOpportunities: ['Reserved instance conversion', 'Right-sizing opportunities'],
    performanceBottlenecks: [], securityFindings: [],
    recommendations: ['Convert on-demand to reserved', 'Right-size underutilized instances', 'Review data transfer costs'],
  },
  {
    id: 'RPT-043', title: 'Security Compliance Audit', type: 'security', status: 'completed',
    generatedAt: daysAgo(7), generatedBy: 'Security Scanner', score: 90, savingsEstimate: 0,
    recommendationCount: 4,
    summary: 'Security posture is good with 90/100 compliance score. 2 medium and 2 low findings require attention.',
    topRisks: ['Outdated TLS on staging', 'Missing WAF rules on 2 endpoints'], costOpportunities: [],
    performanceBottlenecks: [], securityFindings: ['TLS 1.1 still enabled on staging LB', 'Missing rate limiting on admin endpoints', 'Overly permissive IAM role for batch jobs', 'Unencrypted S3 bucket for staging logs'],
    recommendations: ['Upgrade TLS to 1.3', 'Add rate limiting', 'Restrict IAM permissions', 'Enable S3 encryption'],
  },
];

// ── Notifications ────────────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'not-01', type: 'alert', title: 'Critical Alert', message: 'Database Connection Pool Exhausted in Production', read: false, createdAt: minutesAgo(15), actionUrl: '/alerts' },
  { id: 'not-02', type: 'deployment', title: 'Deployment Complete', message: 'API Gateway v2.4.1 deployed to Production successfully', read: false, createdAt: minutesAgo(10), actionUrl: '/deployments' },
  { id: 'not-03', type: 'alert', title: 'High Severity Alert', message: 'Elevated Error Rate on Auth Service', read: false, createdAt: minutesAgo(45), actionUrl: '/alerts' },
  { id: 'not-04', type: 'recommendation', title: 'New Recommendation', message: 'AI suggests enabling auto-scaling for +25% throughput', read: true, createdAt: hoursAgo(2), actionUrl: '/dashboard' },
  { id: 'not-05', type: 'report', title: 'Report Generated', message: 'Weekly Optimization Report is ready', read: true, createdAt: hoursAgo(3), actionUrl: '/reports' },
  { id: 'not-06', type: 'deployment', title: 'Deployment Failed', message: 'Payment Service v3.1.0 deployment failed in Staging', read: true, createdAt: hoursAgo(2), actionUrl: '/deployments' },
];

// ── Settings ─────────────────────────────────────────────────
export const appSettings: AppSettings = {
  profile: { name: 'Alex Chen', email: 'alex.chen@optiops.io', role: 'DevOps Engineer', avatar: null, timezone: 'America/New_York' },
  notifications: { emailAlerts: true, slackIntegration: true, criticalOnly: false, digestFrequency: 'realtime' },
  dashboard: { refreshInterval: 30, defaultTimeRange: '24h', autoRefresh: true },
  integrations: {
    aws: { connected: true, region: 'us-east-1' },
    slack: { connected: true, channel: '#ops-alerts' },
    pagerduty: { connected: false },
    datadog: { connected: false },
  },
};

// ── Monitoring Metrics ───────────────────────────────────────
export const monitoringKPIs: MonitoringKPI[] = [
  { label: 'Avg Response Time', value: '145ms', change: -12, status: 'down', icon: 'clock' },
  { label: 'Request Rate', value: '2.4k/s', change: 8, status: 'up', icon: 'activity' },
  { label: 'Error Rate', value: '0.12%', change: -23, status: 'down', icon: 'alert-triangle' },
  { label: 'Active Connections', value: '1,247', change: 5, status: 'up', icon: 'users' },
];

export const serviceMetrics: ServiceMetrics[] = [
  { service: 'API Gateway', cpu: generateTimeSeries(24, 65, 15), memory: generateTimeSeries(24, 70, 10), network: generateTimeSeries(24, 500, 200), errorRate: generateTimeSeries(24, 0.1, 0.05), latency: generateTimeSeries(24, 120, 40), uptime: 99.97, status: 'healthy' },
  { service: 'Auth Service', cpu: generateTimeSeries(24, 45, 20), memory: generateTimeSeries(24, 55, 8), network: generateTimeSeries(24, 200, 100), errorRate: generateTimeSeries(24, 2.3, 1), latency: generateTimeSeries(24, 85, 30), uptime: 99.85, status: 'warning' },
  { service: 'Worker Service', cpu: generateTimeSeries(24, 80, 12), memory: generateTimeSeries(24, 88, 5), network: generateTimeSeries(24, 100, 50), errorRate: generateTimeSeries(24, 0.5, 0.3), latency: generateTimeSeries(24, 200, 60), uptime: 99.9, status: 'warning' },
  { service: 'Payment Service', cpu: generateTimeSeries(24, 35, 10), memory: generateTimeSeries(24, 42, 8), network: generateTimeSeries(24, 150, 70), errorRate: generateTimeSeries(24, 0.05, 0.02), latency: generateTimeSeries(24, 95, 25), uptime: 99.99, status: 'healthy' },
];

// ── Search Index ─────────────────────────────────────────────
export const searchIndex: SearchResult[] = [
  { id: 's-1', title: 'Dashboard', description: 'Overview of infrastructure health', category: 'page', icon: 'layout-dashboard', url: '/dashboard' },
  { id: 's-2', title: 'Monitoring', description: 'Real-time performance metrics', category: 'page', icon: 'activity', url: '/monitoring' },
  { id: 's-3', title: 'Alerts', description: 'Manage system alerts and incidents', category: 'page', icon: 'alert-circle', url: '/alerts' },
  { id: 's-4', title: 'AI Assistant', description: 'DevOps AI helper', category: 'page', icon: 'bot', url: '/ai-assistant' },
  { id: 's-5', title: 'Reports', description: 'Optimization reports', category: 'page', icon: 'file-text', url: '/reports' },
  { id: 's-6', title: 'Logs', description: 'Log analysis and streaming', category: 'page', icon: 'scroll-text', url: '/logs' },
  { id: 's-7', title: 'Deployments', description: 'Deployment pipelines', category: 'page', icon: 'rocket', url: '/deployments' },
  { id: 's-8', title: 'Infrastructure', description: 'Topology and resources', category: 'page', icon: 'server', url: '/infrastructure' },
  { id: 's-9', title: 'Settings', description: 'App configuration', category: 'page', icon: 'settings', url: '/settings' },
  { id: 's-10', title: 'Create Deployment', description: 'Start a new deployment pipeline', category: 'action', icon: 'plus', action: 'create-deployment' },
  { id: 's-11', title: 'Generate Report', description: 'Create optimization report', category: 'action', icon: 'file-plus', action: 'generate-report' },
  { id: 's-12', title: 'Export Logs', description: 'Export current log entries', category: 'action', icon: 'download', action: 'export-logs' },
  ...alerts.map(a => ({ id: `s-alert-${a.id}`, title: a.title, description: `${a.severity} • ${a.service}`, category: 'alert' as const, icon: 'alert-circle', url: `/alerts?id=${a.id}` })),
  ...deployments.map(d => ({ id: `s-dep-${d.id}`, title: `${d.service} ${d.version}`, description: `${d.status} • ${d.environment}`, category: 'deployment' as const, icon: 'rocket', url: `/deployments?id=${d.id}` })),
];

import { NextRequest, NextResponse } from 'next/server';
import type { TopologyNode, TopologyEdge, TopologyNodeDetail } from '@/types';

function minutesAgo(m: number) { return new Date(Date.now() - m * 60000).toISOString(); }
function hoursAgo(h: number) { return new Date(Date.now() - h * 3600000).toISOString(); }

const nodes: TopologyNode[] = [
  {
    id: 'lb-1', label: 'Load Balancer', type: 'load_balancer', subtitle: 'AWS ALB',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Requests/s': '12.4k', 'Active Conn': '2,847', 'Healthy Targets': '24/24' },
    position: { x: 400, y: 30 }, dependencies: ['gw-1'],
    metadata: { provider: 'AWS', arn: 'arn:aws:elasticloadbalancing:us-east-1:...' },
  },
  {
    id: 'gw-1', label: 'API Gateway', type: 'gateway', subtitle: 'Kong / Rate Limiting',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Throughput': '8.2k/s', 'Latency P95': '45ms', 'Error Rate': '0.12%' },
    position: { x: 400, y: 150 }, dependencies: ['svc-auth', 'svc-api', 'svc-worker'],
    metadata: { version: '3.4.1', rateLimitRps: '10000' },
  },
  {
    id: 'svc-auth', label: 'Auth Service', type: 'service', subtitle: 'Kubernetes',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Pods': '4/4', 'CPU': '38%', 'Memory': '52%' },
    position: { x: 140, y: 290 }, dependencies: [],
    metadata: { namespace: 'auth', image: 'optiops/auth:v1.8.3' },
  },
  {
    id: 'svc-api', label: 'API Service', type: 'service', subtitle: 'Kubernetes',
    environment: 'Production', status: 'warning', region: 'us-east-1',
    metrics: { 'Pods': '8/8', 'CPU': '74%', 'Memory': '68%' },
    position: { x: 400, y: 290 }, dependencies: ['db-pg', 'db-mongo', 'cache-redis'],
    metadata: { namespace: 'api', image: 'optiops/api:v2.4.1' },
  },
  {
    id: 'svc-worker', label: 'Worker Service', type: 'service', subtitle: 'Kubernetes',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Pods': '6/6', 'CPU': '55%', 'Memory': '61%' },
    position: { x: 660, y: 290 }, dependencies: ['cache-redis', 'db-pg'],
    metadata: { namespace: 'workers', image: 'optiops/worker:v2.4.0' },
  },
  {
    id: 'db-pg', label: 'PostgreSQL', type: 'database', subtitle: 'RDS Multi-AZ Primary',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Connections': '142/300', 'Storage': '245 GB', 'Query Lat': '8ms' },
    position: { x: 210, y: 440 }, dependencies: [],
    metadata: { engine: 'PostgreSQL 15.4', instanceClass: 'db.r6g.xlarge', multiAz: 'true' },
  },
  {
    id: 'db-mongo', label: 'MongoDB', type: 'database', subtitle: 'Atlas Document Store',
    environment: 'Production', status: 'healthy', region: 'us-east-1',
    metrics: { 'Connections': '89/500', 'Storage': '128 GB', 'Ops/s': '3.2k' },
    position: { x: 450, y: 440 }, dependencies: [],
    metadata: { cluster: 'optiops-prod', version: '7.0', replicaSet: '3 nodes' },
  },
  {
    id: 'cache-redis', label: 'Redis Cache', type: 'cache', subtitle: 'ElastiCache In-Memory',
    environment: 'Production', status: 'warning', region: 'us-east-1',
    metrics: { 'Memory': '82%', 'Hit Rate': '94.2%', 'Clients': '67' },
    position: { x: 660, y: 440 }, dependencies: [],
    metadata: { engine: 'Redis 7.0', nodeType: 'cache.r6g.large', cluster: '4 nodes' },
  },
];

const edges: TopologyEdge[] = [
  { id: 'e-lb-gw', source: 'lb-1', target: 'gw-1', status: 'healthy', traffic: '12.4k req/s', latencyP95: '2ms', errorRate: '0.01%', protocol: 'HTTPS' },
  { id: 'e-gw-auth', source: 'gw-1', target: 'svc-auth', status: 'healthy', traffic: '3.1k req/s', latencyP95: '12ms', errorRate: '0.05%', protocol: 'gRPC' },
  { id: 'e-gw-api', source: 'gw-1', target: 'svc-api', status: 'healthy', traffic: '8.2k req/s', latencyP95: '45ms', errorRate: '0.12%', protocol: 'HTTP/2' },
  { id: 'e-gw-worker', source: 'gw-1', target: 'svc-worker', status: 'healthy', traffic: '1.8k req/s', latencyP95: '28ms', errorRate: '0.08%', protocol: 'gRPC' },
  { id: 'e-api-pg', source: 'svc-api', target: 'db-pg', status: 'healthy', traffic: '4.5k qps', latencyP95: '8ms', errorRate: '0.02%', protocol: 'TCP/5432' },
  { id: 'e-api-mongo', source: 'svc-api', target: 'db-mongo', status: 'healthy', traffic: '3.2k ops/s', latencyP95: '12ms', errorRate: '0.01%', protocol: 'TCP/27017' },
  { id: 'e-api-redis', source: 'svc-api', target: 'cache-redis', status: 'warning', traffic: '9.8k ops/s', latencyP95: '3ms', errorRate: '0.00%', protocol: 'TCP/6379' },
  { id: 'e-worker-redis', source: 'svc-worker', target: 'cache-redis', status: 'warning', traffic: '2.1k ops/s', latencyP95: '4ms', errorRate: '0.00%', protocol: 'TCP/6379' },
  { id: 'e-worker-pg', source: 'svc-worker', target: 'db-pg', status: 'healthy', traffic: '1.2k qps', latencyP95: '10ms', errorRate: '0.03%', protocol: 'TCP/5432' },
];

const nodeDetails: Record<string, Omit<TopologyNodeDetail, 'node'>> = {
  'lb-1': {
    health: { score: 99, checks: 12, passed: 12 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l1', level: 'info', message: 'Health check passed for all 24 targets', timestamp: minutesAgo(1) },
      { id: 'l2', level: 'info', message: 'TLS certificate rotation completed', timestamp: hoursAgo(6) },
    ],
    recentDeployments: [],
    upstreamDeps: [],
    downstreamDeps: ['gw-1'],
    recommendedActions: ['Schedule TLS certificate renewal in 30 days'],
  },
  'gw-1': {
    health: { score: 97, checks: 18, passed: 18 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l3', level: 'info', message: 'Rate limiter reconfigured: 10k rps', timestamp: hoursAgo(2) },
      { id: 'l4', level: 'warn', message: 'Spike detected: 15k rps for 30s window', timestamp: hoursAgo(4) },
    ],
    recentDeployments: [{ id: 'd1', version: 'v3.4.1', status: 'success', timestamp: hoursAgo(12) }],
    upstreamDeps: ['lb-1'],
    downstreamDeps: ['svc-auth', 'svc-api', 'svc-worker'],
    recommendedActions: ['Consider increasing rate limit threshold during peak hours'],
  },
  'svc-auth': {
    health: { score: 98, checks: 15, passed: 15 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l5', level: 'info', message: 'Token refresh rate: 450 req/s', timestamp: minutesAgo(5) },
    ],
    recentDeployments: [{ id: 'd2', version: 'v1.8.3', status: 'running', timestamp: minutesAgo(3) }],
    upstreamDeps: ['gw-1'],
    downstreamDeps: [],
    recommendedActions: ['Monitor JWT token cache hit rate after v1.8.3 rollout'],
  },
  'svc-api': {
    health: { score: 88, checks: 20, passed: 18 },
    recentAlerts: [
      { id: 'a1', title: 'Elevated CPU usage on API Service', severity: 'medium', timestamp: minutesAgo(20) },
    ],
    recentLogs: [
      { id: 'l6', level: 'warn', message: 'CPU utilization averaging 74% over 15m window', timestamp: minutesAgo(5) },
      { id: 'l7', level: 'info', message: 'Deployment v2.4.1 health checks passing', timestamp: minutesAgo(10) },
    ],
    recentDeployments: [{ id: 'd3', version: 'v2.4.1', status: 'success', timestamp: minutesAgo(10) }],
    upstreamDeps: ['gw-1'],
    downstreamDeps: ['db-pg', 'db-mongo', 'cache-redis'],
    recommendedActions: ['Enable horizontal pod autoscaler', 'Profile top CPU-consuming endpoints', 'Consider adding read replicas for PostgreSQL'],
  },
  'svc-worker': {
    health: { score: 95, checks: 16, passed: 16 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l8', level: 'info', message: 'Batch job completed: 12,450 items processed', timestamp: minutesAgo(8) },
    ],
    recentDeployments: [{ id: 'd4', version: 'v2.4.0', status: 'rolled_back', timestamp: hoursAgo(5) }],
    upstreamDeps: ['gw-1'],
    downstreamDeps: ['cache-redis', 'db-pg'],
    recommendedActions: ['Investigate v2.4.0 rollback root cause', 'Increase batch job concurrency to 8'],
  },
  'db-pg': {
    health: { score: 99, checks: 14, passed: 14 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l9', level: 'info', message: 'Automated backup completed: 245 GB', timestamp: hoursAgo(3) },
      { id: 'l10', level: 'info', message: 'Replication lag: <1ms', timestamp: minutesAgo(2) },
    ],
    recentDeployments: [],
    upstreamDeps: ['svc-api', 'svc-worker'],
    downstreamDeps: [],
    recommendedActions: ['Schedule major version upgrade to PostgreSQL 16'],
  },
  'db-mongo': {
    health: { score: 97, checks: 12, passed: 12 },
    recentAlerts: [],
    recentLogs: [
      { id: 'l11', level: 'info', message: 'Index optimization completed for users collection', timestamp: hoursAgo(1) },
    ],
    recentDeployments: [],
    upstreamDeps: ['svc-api'],
    downstreamDeps: [],
    recommendedActions: ['Review slow query log for collections >100ms'],
  },
  'cache-redis': {
    health: { score: 78, checks: 10, passed: 8 },
    recentAlerts: [
      { id: 'a2', title: 'Redis memory usage at 82%', severity: 'high', timestamp: minutesAgo(15) },
      { id: 'a3', title: 'Cache eviction rate increasing', severity: 'medium', timestamp: hoursAgo(1) },
    ],
    recentLogs: [
      { id: 'l12', level: 'warn', message: 'Memory usage 82% — eviction policy active', timestamp: minutesAgo(5) },
      { id: 'l13', level: 'warn', message: 'Eviction rate: 124 keys/s (threshold: 100)', timestamp: minutesAgo(10) },
      { id: 'l14', level: 'info', message: 'Connected clients: 67', timestamp: minutesAgo(1) },
    ],
    recentDeployments: [],
    upstreamDeps: ['svc-api', 'svc-worker'],
    downstreamDeps: [],
    recommendedActions: ['Scale Redis cluster from 4 to 6 nodes', 'Review TTL policies for large key patterns', 'Consider tiered caching strategy'],
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const nodeId = searchParams.get('nodeId');

  if (nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return NextResponse.json({ error: 'Node not found', success: false }, { status: 404 });
    const detail = nodeDetails[nodeId];
    if (!detail) return NextResponse.json({ error: 'Details not found', success: false }, { status: 404 });
    return NextResponse.json({ data: { node, ...detail }, success: true, timestamp: new Date().toISOString() });
  }

  return NextResponse.json({
    data: { nodes, edges, lastUpdated: new Date().toISOString() },
    success: true,
    timestamp: new Date().toISOString(),
  });
}

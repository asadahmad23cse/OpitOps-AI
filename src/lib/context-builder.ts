import type { Alert, AlertsSummary, Deployment, DeploymentsSummary, HealthScore } from "@/types";

type DeploymentsApiData = { deployments: Deployment[]; summary: DeploymentsSummary };
type AlertsApiData = { alerts: Alert[]; summary: AlertsSummary };
type DashboardApiData = {
  healthScore: HealthScore;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseDeployments(json: unknown): DeploymentsApiData | null {
  if (!isRecord(json)) return null;
  const data = json.data;
  if (!isRecord(data)) return null;
  const deployments = data.deployments;
  const summary = data.summary;
  if (!Array.isArray(deployments) || !isRecord(summary)) return null;
  return {
    deployments: deployments as Deployment[],
    summary: summary as unknown as DeploymentsSummary,
  };
}

function parseAlerts(json: unknown): AlertsApiData | null {
  if (!isRecord(json)) return null;
  const data = json.data;
  if (!isRecord(data)) return null;
  const alerts = data.alerts;
  const summary = data.summary;
  if (!Array.isArray(alerts) || !isRecord(summary)) return null;
  return {
    alerts: alerts as Alert[],
    summary: summary as unknown as AlertsSummary,
  };
}

function parseDashboard(json: unknown): DashboardApiData | null {
  if (!isRecord(json)) return null;
  const data = json.data;
  if (!isRecord(data)) return null;
  const healthScore = data.healthScore;
  if (!isRecord(healthScore) || typeof healthScore.score !== "number") return null;
  return { healthScore: healthScore as unknown as HealthScore };
}

function formatDeploymentsLines(deployments: Deployment[], max = 20): string {
  if (deployments.length === 0) return "none recorded";
  const slice = deployments.slice(0, max);
  return slice
    .map((d) => {
      const when = d.startedAt ? new Date(d.startedAt).toISOString() : "?";
      return `${d.service} (${d.status}) — ${when}`;
    })
    .join("; ");
}

/** Non-resolved alerts count as “active” for operators. */
function formatActiveAlerts(alerts: Alert[]): string {
  const active = alerts.filter((a) => a.status !== "resolved");
  if (active.length === 0) return "0 active (all resolved or empty)";

  const sev = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of active) {
    if (a.severity in sev) sev[a.severity as keyof typeof sev]++;
  }

  const detail = `critical=${sev.critical}, high=${sev.high}, medium=${sev.medium}, low=${sev.low}`;
  const titles = active
    .slice(0, 5)
    .map((a) => `"${a.title}" (${a.severity}, ${a.service})`)
    .join("; ");

  return `${active.length} active (${detail}). Examples: ${titles}`;
}

/**
 * Loads live dashboard JSON from this deployment’s own API routes.
 * Pass the request origin (e.g. from `new URL(req.url).origin`) so internal fetch resolves correctly.
 * Forward the browser `Cookie` header so Clerk-protected routes (e.g. `/api/deployments`) still authorize.
 */
export async function buildLiveSystemContext(origin: string, cookieHeader: string | null): Promise<string> {
  const base = origin.replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookieHeader) headers.Cookie = cookieHeader;
  const init: RequestInit = {
    headers,
    cache: "no-store",
  };

  let deploymentsPart = "unavailable";
  let alertsPart = "unavailable";
  let healthPart = "unavailable";

  try {
    const [depRes, alertRes, dashRes] = await Promise.all([
      fetch(`${base}/api/deployments`, init),
      fetch(`${base}/api/alerts`, init),
      fetch(`${base}/api/dashboard`, init),
    ]);

    const [depJson, alertJson, dashJson] = await Promise.all([
      depRes.json().catch(() => null),
      alertRes.json().catch(() => null),
      dashRes.json().catch(() => null),
    ]);

    const depParsed = parseDeployments(depJson);
    if (depParsed) {
      const { deployments, summary } = depParsed;
      const line = formatDeploymentsLines(deployments);
      deploymentsPart = `${deployments.length} total (running=${summary.running}, success=${summary.success}, failed=${summary.failed}, rolled_back=${summary.rolledBack}, queued=${summary.queued}). Recent: ${line}`;
    }

    const alertParsed = parseAlerts(alertJson);
    if (alertParsed) {
      const { alerts, summary } = alertParsed;
      alertsPart = `summary: total=${summary.total}, open=${summary.open}, critical=${summary.critical}, high=${summary.high}. Active (non-resolved): ${formatActiveAlerts(alerts)}`;
    }

    const dashParsed = parseDashboard(dashJson);
    if (dashParsed) {
      const hs = dashParsed.healthScore;
      healthPart = `${hs.score}/100 (trend ${hs.trend >= 0 ? "+" : ""}${hs.trend}, checks ${hs.checksPassed}/${hs.totalChecks}, warnings ${hs.warnings}). Last updated: ${hs.lastUpdated}`;
    }
  } catch {
    return `LIVE SYSTEM DATA:
- Deployments: (could not load)
- Active Alerts: (could not load)
- Health Score: (could not load)

Answer using general DevOps guidance only when live data is missing.`;
  }

  return `LIVE SYSTEM DATA (use this for factual answers about this workspace — repo/service names, statuses, dates, alerts, health):
- Deployments: ${deploymentsPart}
- Active Alerts: ${alertsPart}
- Health Score: ${healthPart}

When the user asks which repos or services need attention, prefer items with deployment status failed, rolled_back, or running with issues, and open alerts with critical/high severity. Cite exact service (repo) names and dates from the deployments list above.`;
}

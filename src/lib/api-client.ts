const BASE_URL = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<import('@/types').ApiResponse<import('@/types').DashboardData>>('/dashboard'),

  // Health Score
  getHealthScore: () => request<import('@/types').ApiResponse<import('@/types').HealthScore>>('/health-score'),

  // Alerts
  getAlerts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<import('@/types').ApiResponse<{ alerts: import('@/types').Alert[]; summary: import('@/types').AlertsSummary }>>(`/alerts${qs}`);
  },
  getAlert: (id: string) => request<import('@/types').ApiResponse<import('@/types').Alert>>(`/alerts/${id}`),
  updateAlert: (id: string, data: Partial<import('@/types').Alert>) =>
    request<import('@/types').ApiResponse<import('@/types').Alert>>(`/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Deployments
  getDeployments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<import('@/types').ApiResponse<{ deployments: import('@/types').Deployment[]; summary: import('@/types').DeploymentsSummary }>>(`/deployments${qs}`);
  },
  createDeployment: (data: import('@/types').CreateDeploymentInput) =>
    request<import('@/types').ApiResponse<import('@/types').Deployment>>('/deployments', { method: 'POST', body: JSON.stringify(data) }),

  // Infrastructure
  getInfrastructure: () =>
    request<import('@/types').ApiResponse<import('@/types').InfrastructureNode[]>>('/infrastructure'),

  // Cost
  getCost: (timeRange?: string) => {
    const qs = timeRange ? `?timeRange=${timeRange}` : '';
    return request<import('@/types').ApiResponse<import('@/types').CostSnapshot>>(`/cost${qs}`);
  },

  // Recommendations
  getRecommendations: () =>
    request<import('@/types').ApiResponse<import('@/types').Recommendation[]>>('/recommendations'),
  updateRecommendation: (id: string, data: Partial<import('@/types').Recommendation>) =>
    request<import('@/types').ApiResponse<import('@/types').Recommendation>>(`/recommendations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Activity
  getActivity: (page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    const qs = params.toString() ? `?${params}` : '';
    return request<import('@/types').PaginatedResponse<import('@/types').ActivityEvent>>(`/activity${qs}`);
  },

  // Reports
  getReports: () => request<import('@/types').ApiResponse<import('@/types').Report[]>>('/reports'),
  generateReport: () =>
    request<import('@/types').ApiResponse<import('@/types').Report>>('/reports', { method: 'POST' }),
  deleteReport: (id: string) =>
    request<import('@/types').ApiResponse<null>>(`/reports/${id}`, { method: 'DELETE' }),

  // Logs
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<import('@/types').PaginatedResponse<import('@/types').LogEntry>>(`/logs${qs}`);
  },

  // Notifications
  getNotifications: () =>
    request<import('@/types').ApiResponse<import('@/types').Notification[]>>('/notifications'),
  markNotificationRead: (id: string) =>
    request<import('@/types').ApiResponse<null>>(`/notifications/${id}`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<import('@/types').ApiResponse<null>>('/notifications/read-all', { method: 'POST' }),

  // Settings
  getSettings: () => request<import('@/types').ApiResponse<import('@/types').AppSettings>>('/settings'),
  updateSettings: (data: Partial<import('@/types').AppSettings>) =>
    request<import('@/types').ApiResponse<import('@/types').AppSettings>>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // Search
  search: (query: string) =>
    request<import('@/types').ApiResponse<import('@/types').SearchResult[]>>(`/search?q=${encodeURIComponent(query)}`),
};

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Bell,
  LayoutDashboard,
  Puzzle,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  Globe,
  Shield,
  RefreshCw,
  Cloud,
  MessageSquare,
  Siren,
  BarChart3,
  Cpu,
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AppSettings } from '@/types';
import {
  CHAT_PROVIDER_CHANGED_EVENT,
  CHAT_PROVIDER_STORAGE_KEY,
  getLocalLlmBaseUrl,
  LOCAL_LLM_START_HELP,
  readStoredChatProvider,
  writeStoredChatProvider,
  type ChatProviderMode,
  type ModelStatusPayload,
} from '@/lib/local-llm';

// ── Zod Schemas ─────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

const notificationsSchema = z.object({
  emailAlerts: z.boolean(),
  slackIntegration: z.boolean(),
  criticalOnly: z.boolean(),
  digestFrequency: z.enum(['realtime', 'hourly', 'daily']),
});

const dashboardSchema = z.object({
  refreshInterval: z.number().min(5, 'Minimum 5 seconds').max(300, 'Maximum 300 seconds'),
  defaultTimeRange: z.string().min(1),
  autoRefresh: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type NotificationsFormData = z.infer<typeof notificationsSchema>;
type DashboardFormData = z.infer<typeof dashboardSchema>;

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'ai-model', label: 'AI Model', icon: Cpu },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function EnhancedSettings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const { data, isLoading, isError, refetch } = useSettings();
  const updateSettings = useUpdateSettings();

  const settings: AppSettings | undefined = data?.data;

  if (isError) {
    return <ErrorState message="Failed to load settings." onRetry={() => refetch()} />;
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your profile, preferences, and integrations</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              suppressHydrationWarning
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeTab === 'dashboard' && (
        <DashboardSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeTab === 'integrations' && (
        <IntegrationsSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeTab === 'ai-model' && <ModelConfigurationSection />}
    </div>
  );
}

// ── Profile Section ─────────────────────────────────────────

function ProfileSection({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: ReturnType<typeof useUpdateSettings>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: settings.profile.name,
      email: settings.profile.email,
      role: settings.profile.role,
      timezone: settings.profile.timezone,
    },
  });

  useEffect(() => {
    reset({
      name: settings.profile.name,
      email: settings.profile.email,
      role: settings.profile.role,
      timezone: settings.profile.timezone,
    });
  }, [settings, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateSettings.mutate(
      { profile: { ...settings.profile, ...data } },
      {
        onSuccess: () => toast.success('Profile updated successfully'),
        onError: () => toast.error('Failed to update profile'),
      }
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-cyan-500/20">
          <User className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Information</h3>
          <p className="text-sm text-gray-400">Update your personal details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Full Name" error={errors.name?.message} icon={User}>
            <input
              suppressHydrationWarning
              {...register('name')}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </FormField>

          <FormField label="Email Address" error={errors.email?.message} icon={Mail}>
            <input
              suppressHydrationWarning
              {...register('email')}
              type="email"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </FormField>

          <FormField label="Role" error={errors.role?.message} icon={Shield}>
            <input
              suppressHydrationWarning
              {...register('role')}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </FormField>

          <FormField label="Timezone" error={errors.timezone?.message} icon={Globe}>
            <input
              suppressHydrationWarning
              {...register('timezone')}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </FormField>
        </div>

        <div className="flex justify-end pt-2">
          <button
            suppressHydrationWarning
            type="submit"
            disabled={!isDirty || updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors disabled:opacity-50"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Notifications Section ───────────────────────────────────

function NotificationsSection({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: ReturnType<typeof useUpdateSettings>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty },
  } = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: settings.notifications,
  });

  useEffect(() => {
    reset(settings.notifications);
  }, [settings, reset]);

  const values = watch();

  const onSubmit = (data: NotificationsFormData) => {
    updateSettings.mutate(
      { notifications: data },
      {
        onSuccess: () => toast.success('Notification preferences saved'),
        onError: () => toast.error('Failed to update notifications'),
      }
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-amber-500/20">
          <Bell className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
          <p className="text-sm text-gray-400">Control how and when you receive alerts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <ToggleRow
            label="Email Alerts"
            description="Receive alert notifications via email"
            icon={Mail}
            checked={values.emailAlerts}
            onChange={v => setValue('emailAlerts', v, { shouldDirty: true })}
          />
          <ToggleRow
            label="Slack Integration"
            description="Push notifications to your Slack workspace"
            icon={MessageSquare}
            checked={values.slackIntegration}
            onChange={v => setValue('slackIntegration', v, { shouldDirty: true })}
          />
          <ToggleRow
            label="Critical Alerts Only"
            description="Only notify for critical severity incidents"
            icon={Siren}
            checked={values.criticalOnly}
            onChange={v => setValue('criticalOnly', v, { shouldDirty: true })}
          />
        </div>

        <div className="pt-2">
          <label className="text-sm text-gray-300 mb-2 block">Digest Frequency</label>
          <div className="flex gap-3">
            {(['realtime', 'hourly', 'daily'] as const).map(freq => (
              <button
                suppressHydrationWarning
                key={freq}
                type="button"
                onClick={() => setValue('digestFrequency', freq, { shouldDirty: true })}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize',
                  values.digestFrequency === freq
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                )}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            suppressHydrationWarning
            type="submit"
            disabled={!isDirty || updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors disabled:opacity-50"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Notifications
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Dashboard Section ───────────────────────────────────────

function DashboardSection({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: ReturnType<typeof useUpdateSettings>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<DashboardFormData>({
    resolver: zodResolver(dashboardSchema),
    defaultValues: settings.dashboard,
  });

  useEffect(() => {
    reset(settings.dashboard);
  }, [settings, reset]);

  const values = watch();

  const onSubmit = (data: DashboardFormData) => {
    updateSettings.mutate(
      { dashboard: data },
      {
        onSuccess: () => toast.success('Dashboard settings saved'),
        onError: () => toast.error('Failed to update dashboard settings'),
      }
    );
  };

  const timeRangeOptions = ['1h', '6h', '12h', '24h', '7d', '30d'];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-purple-500/20">
          <LayoutDashboard className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Dashboard Settings</h3>
          <p className="text-sm text-gray-400">Customize your dashboard experience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Refresh Interval (seconds)" error={errors.refreshInterval?.message} icon={RefreshCw}>
            <input
              suppressHydrationWarning
              {...register('refreshInterval')}
              type="number"
              min={5}
              max={300}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </FormField>

          <div>
            <label className="text-sm text-gray-300 mb-2 block">Default Time Range</label>
            <div className="flex gap-2 flex-wrap">
              {timeRangeOptions.map(opt => (
                <button
                  suppressHydrationWarning
                  key={opt}
                  type="button"
                  onClick={() => setValue('defaultTimeRange', opt, { shouldDirty: true })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                    values.defaultTimeRange === opt
                      ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ToggleRow
          label="Auto Refresh"
          description="Automatically refresh dashboard data at the configured interval"
          icon={RefreshCw}
          checked={values.autoRefresh}
          onChange={v => setValue('autoRefresh', v, { shouldDirty: true })}
        />

        <div className="flex justify-end pt-2">
          <button
            suppressHydrationWarning
            type="submit"
            disabled={!isDirty || updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors disabled:opacity-50"
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Dashboard Settings
          </button>
        </div>
      </form>
    </div>
  );
}

// ── AI Model (local inference + Groq) ───────────────────────

function ModelConfigurationSection() {
  const [provider, setProvider] = useState<ChatProviderMode>('groq');
  const [status, setStatus] = useState<ModelStatusPayload | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    setTesting(true);
    try {
      const r = await fetch('/api/model-status', { cache: 'no-store' });
      setStatus((await r.json()) as ModelStatusPayload);
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    setProvider(readStoredChatProvider());
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_PROVIDER_STORAGE_KEY && (e.newValue === 'groq' || e.newValue === 'local')) {
        setProvider(e.newValue);
      }
    };
    const onSameTab = () => setProvider(readStoredChatProvider());
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHAT_PROVIDER_CHANGED_EVENT, onSameTab);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHAT_PROVIDER_CHANGED_EVENT, onSameTab);
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const baseUrl = getLocalLlmBaseUrl();

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-cyan-500/20">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Model configuration</h3>
            <p className="text-sm text-gray-400">
              Groq cloud vs local Qwen2.5 + QLoRA (FastAPI on port 8001)
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-xl bg-black/20 border border-white/10">
            <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Assistant preference</h4>
            <p className="text-sm text-white mb-3">
              Active in AI Assistant:{' '}
              <span className="text-cyan-400 font-medium">
                {provider === 'groq' ? 'Groq API' : 'Fine-tuned (local)'}
              </span>
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Switch models from the AI Assistant page header. This mirrors{' '}
              <code className="text-gray-400">localStorage[{`"${CHAT_PROVIDER_STORAGE_KEY}"`}]</code>.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => {
                  writeStoredChatProvider('groq');
                  setProvider('groq');
                  window.dispatchEvent(new Event(CHAT_PROVIDER_CHANGED_EVENT));
                  toast.success('Default chat provider set to Groq');
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
              >
                Use Groq
              </button>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => {
                  writeStoredChatProvider('local');
                  setProvider('local');
                  window.dispatchEvent(new Event(CHAT_PROVIDER_CHANGED_EVENT));
                  toast.success('Default chat provider set to local model');
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
              >
                Use local model
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/20 border border-white/10">
            <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Local inference server</h4>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                  status?.status === 'online'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400',
                )}
              >
                {status?.status === 'online' ? 'Online' : 'Offline'}
              </span>
              {status?.adapter_loaded ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  QLoRA loaded
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-400 border border-white/10">
                  Base only
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono break-all mb-2">{baseUrl}/health</p>
            {status?.detail ? <p className="text-xs text-amber-200/80 mb-2">{status.detail}</p> : null}
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              From the repo: <code className="text-gray-300">cd ml/server</code> →{' '}
              <code className="text-gray-300">pip install -r requirements-server.txt</code> →{' '}
              <code className="text-gray-300">uvicorn inference_server:app --host 0.0.0.0 --port 8001</code>
            </p>
            <p className="text-xs text-red-400/90 mb-3">{LOCAL_LLM_START_HELP}</p>
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => void refresh()}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs text-white disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Test connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integrations Section ────────────────────────────────────

function IntegrationsSection({
  settings,
  updateSettings,
}: {
  settings: AppSettings;
  updateSettings: ReturnType<typeof useUpdateSettings>;
}) {
  const integrations = settings.integrations;

  const toggleIntegration = useCallback(
    (key: keyof AppSettings['integrations'], connected: boolean) => {
      const current = integrations[key];
      updateSettings.mutate(
        {
          integrations: {
            ...integrations,
            [key]: { ...current, connected },
          },
        },
        {
          onSuccess: () =>
            toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} ${connected ? 'connected' : 'disconnected'}`),
          onError: () => toast.error(`Failed to update ${key}`),
        }
      );
    },
    [integrations, updateSettings]
  );

  const items: {
    key: keyof AppSettings['integrations'];
    name: string;
    description: string;
    icon: typeof Cloud;
    color: string;
    bg: string;
    border: string;
    detail?: string;
  }[] = [
    {
      key: 'aws',
      name: 'AWS',
      description: 'Amazon Web Services infrastructure management',
      icon: Cloud,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      detail: integrations.aws.connected ? `Region: ${integrations.aws.region}` : undefined,
    },
    {
      key: 'slack',
      name: 'Slack',
      description: 'Team notifications and alert routing',
      icon: MessageSquare,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      detail: integrations.slack.connected ? `Channel: ${integrations.slack.channel}` : undefined,
    },
    {
      key: 'pagerduty',
      name: 'PagerDuty',
      description: 'Incident management and on-call scheduling',
      icon: Siren,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
    },
    {
      key: 'datadog',
      name: 'Datadog',
      description: 'Monitoring, metrics, and APM integration',
      icon: BarChart3,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
    },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-emerald-500/20">
          <Puzzle className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Integrations</h3>
          <p className="text-sm text-gray-400">Connect your external services and tools</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(item => {
          const Icon = item.icon;
          const isConnected = integrations[item.key].connected;

          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-lg', item.bg)}>
                  <Icon className={cn('w-5 h-5', item.color)} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-0.5">{item.name}</h4>
                  <p className="text-xs text-gray-400">{item.description}</p>
                  {item.detail && (
                    <p className="text-xs text-cyan-400 mt-1">{item.detail}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                    <button
                      suppressHydrationWarning
                      onClick={() => toggleIntegration(item.key, false)}
                      disabled={updateSettings.isPending}
                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs text-red-400 transition-colors disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-500 font-medium">
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </span>
                    <button
                      suppressHydrationWarning
                      onClick={() => toggleIntegration(item.key, true)}
                      disabled={updateSettings.isPending}
                      className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-xs text-cyan-400 font-medium transition-colors disabled:opacity-50"
                    >
                      Connect
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────

function FormField({
  label,
  error,
  icon: Icon,
  children,
}: {
  label: string;
  error?: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm text-gray-300 mb-2 block">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        {children}
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon: typeof Bell;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-gray-400" />
        <div>
          <h4 className="text-sm font-medium text-white">{label}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        suppressHydrationWarning
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-white/20'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all',
            checked ? 'right-0.5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

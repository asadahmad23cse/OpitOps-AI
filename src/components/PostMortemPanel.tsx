"use client";

import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAlerts } from '@/hooks/use-alerts';
import { usePostMortem } from '@/hooks/usePostMortem';
import { cn } from '@/lib/utils';
import type { Alert, IncidentPostMortem } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

function toMarkdown(postMortem: IncidentPostMortem, alert: Alert): string {
  const lines: string[] = [
    `# ${postMortem.title}`,
    '',
    `- Alert ID: ${alert.id}`,
    `- Incident Code: ${alert.incidentCode}`,
    `- Severity: ${postMortem.severity}`,
    `- Service: ${alert.service}`,
    `- Environment: ${alert.environment}`,
    `- Resolved At: ${alert.updatedAt}`,
    '',
    '## Timeline',
  ];

  for (const item of postMortem.timeline) {
    lines.push(`- **${item.time}**: ${item.event}`);
  }

  lines.push('', '## Root Cause', postMortem.rootCause, '', '## Impacted Services');

  if (postMortem.impactedServices.length === 0) lines.push('- None documented');
  for (const service of postMortem.impactedServices) lines.push(`- ${service}`);

  lines.push('', '## Resolution Steps');
  if (postMortem.resolutionSteps.length === 0) lines.push('- None documented');
  for (const step of postMortem.resolutionSteps) lines.push(`- ${step}`);

  lines.push('', '## Follow-Up Actions');
  if (postMortem.followUpActions.length === 0) lines.push('- None documented');
  for (const followUp of postMortem.followUpActions) {
    lines.push(`- [ ] ${followUp.action} (Owner: ${followUp.owner}, Due: ${followUp.dueDate})`);
  }

  lines.push('', '## Lessons Learned', postMortem.lessonsLearned);
  return lines.join('\n');
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function PostMortemPanel() {
  const { data: resolvedAlertsResponse } = useAlerts({ status: 'resolved' });
  const postMortemMutation = usePostMortem();
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [postMortem, setPostMortem] = useState<IncidentPostMortem | null>(null);

  const resolvedAlerts = useMemo(() => {
    const items = resolvedAlertsResponse?.data?.alerts ?? [];
    return items
      .filter((alert) => alert.status === 'resolved')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [resolvedAlertsResponse]);

  const selectedAlert =
    resolvedAlerts.find((alert) => alert.id === selectedAlertId) ??
    resolvedAlerts[0] ??
    null;
  const hasResolvedAlerts = resolvedAlerts.length > 0;

  if (!hasResolvedAlerts) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Incident Post-Mortem
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Generate a structured post-mortem from live dashboard telemetry and resolved alert context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            suppressHydrationWarning
            value={selectedAlert?.id ?? ''}
            onChange={(event) => setSelectedAlertId(event.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-xs text-gray-200 px-3 py-2 focus:outline-none focus:border-cyan-500/50"
          >
            {resolvedAlerts.map((alert) => (
              <option key={alert.id} value={alert.id} className="bg-gray-900 text-white">
                {alert.incidentCode} - {alert.title}
              </option>
            ))}
          </select>
          <button
            suppressHydrationWarning
            type="button"
            onClick={async () => {
              if (!selectedAlert) return;
              try {
                const result = await postMortemMutation.mutateAsync({
                  alertId: selectedAlert.id,
                  resolvedAt: selectedAlert.updatedAt,
                });
                setPostMortem(result);
                toast.success('Post-mortem generated successfully');
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to generate post-mortem.';
                toast.error(message);
              }
            }}
            disabled={!selectedAlert || postMortemMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {postMortemMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Post-Mortem
          </button>
        </div>
      </div>

      {postMortemMutation.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!postMortemMutation.isPending && postMortem && selectedAlert && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xl font-semibold text-white">{postMortem.title}</h4>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
                  Severity {postMortem.severity}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                  {selectedAlert.incidentCode}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                  {selectedAlert.service}
                </span>
              </div>
            </div>
            <button
              suppressHydrationWarning
              type="button"
              onClick={async () => {
                try {
                  await copyTextToClipboard(toMarkdown(postMortem, selectedAlert));
                  toast.success('Post-mortem copied as Markdown');
                } catch {
                  toast.error('Could not copy markdown');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy as Markdown
            </button>
          </div>

          <section className="space-y-2">
            <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Timeline</h5>
            <div className="space-y-2">
              {postMortem.timeline.map((entry, index) => (
                <div key={`${entry.time}-${index}`} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-cyan-300 mb-1">{entry.time}</p>
                  <p className="text-sm text-gray-200">{entry.event}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Root Cause</h5>
            <p className="text-sm text-gray-200 bg-white/5 border border-white/10 rounded-lg p-3">
              {postMortem.rootCause}
            </p>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Impacted Services</h5>
              <ul className="space-y-1.5 bg-white/5 border border-white/10 rounded-lg p-3">
                {postMortem.impactedServices.length === 0 && <li className="text-sm text-gray-500">None documented</li>}
                {postMortem.impactedServices.map((service) => (
                  <li key={service} className="text-sm text-gray-200 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Resolution Steps</h5>
              <ul className="space-y-1.5 bg-white/5 border border-white/10 rounded-lg p-3">
                {postMortem.resolutionSteps.length === 0 && <li className="text-sm text-gray-500">None documented</li>}
                {postMortem.resolutionSteps.map((step, index) => (
                  <li key={`${index}-${step}`} className="text-sm text-gray-200">
                    {index + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Follow-Up Actions</h5>
            <div className="space-y-2">
              {postMortem.followUpActions.length === 0 && (
                <p className="text-sm text-gray-500 bg-white/5 border border-white/10 rounded-lg p-3">None documented</p>
              )}
              {postMortem.followUpActions.map((action, index) => (
                <div
                  key={`${action.action}-${index}`}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                >
                  <div>
                    <p className="text-sm text-gray-100">{action.action}</p>
                    <p className="text-xs text-gray-400 mt-1">Owner: {action.owner}</p>
                  </div>
                  <span className="text-xs text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 rounded-lg w-fit">
                    Due: {action.dueDate}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h5 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Lessons Learned</h5>
            <p className="text-sm text-gray-200 bg-white/5 border border-white/10 rounded-lg p-3">
              {postMortem.lessonsLearned}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

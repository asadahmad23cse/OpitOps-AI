"use client";

import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { CostAnomaly } from '@/types';

interface CostAnomalyCardProps {
  anomalies: CostAnomaly[];
  aiExplanation: string;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractServiceExplanation(aiExplanation: string, serviceName: string): string {
  const sentences = splitSentences(aiExplanation);
  const serviceSpecific = sentences.filter((sentence) =>
    sentence.toLowerCase().includes(serviceName.toLowerCase()),
  );

  if (serviceSpecific.length > 0) {
    return serviceSpecific.slice(0, 2).join(' ');
  }

  return sentences.slice(0, 2).join(' ') || aiExplanation;
}

function extractRecommendation(
  aiExplanation: string,
  serviceName: string,
  topContributors: string[],
): string {
  const sentences = splitSentences(aiExplanation);
  const recommendationSentence =
    sentences.find(
      (sentence) =>
        sentence.toLowerCase().includes(serviceName.toLowerCase()) &&
        /(recommend|should|action)/i.test(sentence),
    ) ||
    sentences.find((sentence) => /(recommend|should|action)/i.test(sentence));

  if (recommendationSentence) {
    return recommendationSentence;
  }

  const fallbackContributor = topContributors[0] || 'unexpected cost pressure';
  return `Action: Validate ${fallbackContributor.toLowerCase()} and apply right-sizing or traffic-shaping controls this week.`;
}

export function CostAnomalyCard({ anomalies, aiExplanation }: CostAnomalyCardProps) {
  if (anomalies.length === 0) return null;

  return (
    <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Cost Anomaly Detection</h3>
          <p className="text-xs text-gray-400">Week-over-week anomaly spikes detected</p>
        </div>
      </div>

      <div className="space-y-3">
        {anomalies.map((anomaly) => {
          const isHighSpike = anomaly.percentChange > 20;
          const serviceExplanation = extractServiceExplanation(aiExplanation, anomaly.service);
          const recommendation = extractRecommendation(
            aiExplanation,
            anomaly.service,
            anomaly.topContributors,
          );

          return (
            <div
              key={anomaly.service}
              className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-white">{anomaly.service}</h4>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border',
                    isHighSpike
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300',
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{anomaly.percentChange.toFixed(1)}%
                </span>
              </div>

              <p className="text-xs text-gray-400">
                Weekly spend: <span className="text-white">{formatCurrency(anomaly.currentCost)}</span> (prev:{' '}
                <span className="text-white">{formatCurrency(anomaly.previousCost)}</span>)
              </p>

              <p className="text-sm text-gray-200">{serviceExplanation}</p>

              <p className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-md px-3 py-2">
                {recommendation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

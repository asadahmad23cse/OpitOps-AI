"use client";

import { cn, severityColor, severityBgColor, statusColor, statusBgColor } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'severity' | 'status' | 'default';
  value?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let colorClass = 'bg-white/5 border border-white/10 text-gray-300';
  if (variant === 'severity' && value) colorClass = `${severityBgColor(value)} ${severityColor(value)}`;
  if (variant === 'status' && value) colorClass = `${statusBgColor(value)} ${statusColor(value)}`;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium', colorClass, className)}>
      {children}
    </span>
  );
}

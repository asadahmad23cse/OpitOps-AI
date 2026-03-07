"use client";

import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title = 'No data found', description = 'Try adjusting your filters or check back later.', icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-white/5 mb-4">
        {icon || <Inbox className="w-8 h-8 text-gray-500" />}
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-4">{description}</p>
      {action}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, Activity, AlertCircle, Bot, FileText, ScrollText, Rocket, Server, Settings, Plus, Download, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { SearchResult } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  'layout-dashboard': LayoutDashboard, activity: Activity, 'alert-circle': AlertCircle,
  bot: Bot, 'file-text': FileText, 'scroll-text': ScrollText, rocket: Rocket,
  server: Server, settings: Settings, plus: Plus, 'file-plus': FileText, download: Download,
};

const categoryLabels: Record<string, string> = {
  page: 'Pages', action: 'Quick Actions', alert: 'Alerts', deployment: 'Deployments',
  infrastructure: 'Infrastructure', report: 'Reports', log: 'Logs',
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['search', query],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()),
    enabled: open,
  });

  const results: SearchResult[] = data?.data || [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const flatResults = results;

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    if (result.url) router.push(result.url);
    else if (result.action === 'create-deployment') router.push('/deployments?action=create');
    else if (result.action === 'generate-report') router.push('/reports?action=generate');
    else if (result.action === 'export-logs') router.push('/logs?action=export');
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && flatResults[selectedIndex]) { handleSelect(flatResults[selectedIndex]); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, flatResults, selectedIndex, handleSelect]);

  useEffect(() => { if (open) { inputRef.current?.focus(); setSelectedIndex(0); } }, [open]);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />
      <div className="relative w-full max-w-2xl mx-4 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or type a command..."
            className="w-full py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
            suppressHydrationWarning
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-500 bg-white/5 border border-white/10 rounded">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {flatResults.length === 0 && query && (
            <div className="py-8 text-center text-gray-500 text-sm">No results found for &ldquo;{query}&rdquo;</div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {categoryLabels[category] || category}
              </div>
              {items.map(item => {
                flatIndex++;
                const Icon = iconMap[item.icon] || ArrowRight;
                const isSelected = flatIndex === selectedIndex;
                const idx = flatIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-cyan-500/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    suppressHydrationWarning
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
                    {isSelected && <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">↵</kbd> Select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">Ctrl+K</kbd> Toggle</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  return {
    open: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })),
  };
}

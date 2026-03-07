"use client";

import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/hooks/use-settings';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useSettings();
  const profile = data?.data?.profile;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const name = profile?.name || 'Alex Chen';
  const role = profile?.role || 'DevOps Engineer';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-3 pl-4 border-l border-white/10" suppressHydrationWarning>
        <div className="text-right">
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center text-sm font-bold text-black">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-gray-500">{profile?.email || 'alex.chen@optiops.io'}</p>
          </div>
          <div className="py-1">
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <UserCircle className="w-4 h-4" /> View Profile
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </div>
          <div className="border-t border-white/10 py-1">
            <button onClick={() => { setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors" suppressHydrationWarning>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

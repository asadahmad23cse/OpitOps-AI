"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, Bot, FileText, ScrollText, Rocket, Server, Settings, AlertCircle, BarChart3 } from 'lucide-react';

const navItems = [
  { id: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: '/monitoring', icon: Activity, label: 'Monitoring' },
  { id: '/alerts', icon: AlertCircle, label: 'Alerts' },
  { id: '/ml-research', icon: BarChart3, label: 'ML Research' },
  { id: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { id: '/reports', icon: FileText, label: 'Reports' },
  { id: '/logs', icon: ScrollText, label: 'Logs' },
  { id: '/deployments', icon: Rocket, label: 'Deployments' },
  { id: '/infrastructure', icon: Server, label: 'Infrastructure' },
  { id: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/5 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-black" />
          </div>
          <span className="font-semibold text-white text-lg">OptiOps AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.id || pathname.startsWith(`${item.id}/`);

          return (
            <Link
              key={item.id}
              href={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50"></div>
            <span className="text-xs text-gray-400">AI Status</span>
          </div>
          <p className="text-sm text-white font-medium">All Systems Active</p>
        </div>
      </div>
    </aside>
  );
}

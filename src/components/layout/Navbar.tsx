"use client";

import { Search, Command } from 'lucide-react';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { UserMenu } from '@/components/user-menu/UserMenu';

export function Navbar() {
  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  return (
    <>
      <header className="h-16 fixed top-0 left-64 right-0 bg-black/40 backdrop-blur-xl border-b border-white/5 z-30">
        <div className="h-full flex items-center justify-between px-8">
          <div className="flex-1 max-w-2xl">
            <button onClick={openPalette} className="w-full relative group" suppressHydrationWarning>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" />
              <Command className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <div className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-gray-500 text-left text-sm hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200">
                Search or type a command...
                <kbd className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-600 bg-white/5 border border-white/10 rounded">⌘K</kbd>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4 ml-8">
            <NotificationsDropdown />
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  );
}

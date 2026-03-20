"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Bot } from "lucide-react";

export function LandingHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="h-16 fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Bot className="w-5 h-5 text-black" />
        </div>
        <span className="font-semibold text-white text-lg">OptiOps AI</span>
      </Link>
      <div className="flex items-center gap-4">
        {!isLoaded ? (
          <div className="h-9 w-40 rounded-lg bg-white/5 animate-pulse" />
        ) : isSignedIn ? (
          <Link
            href="/dashboard"
            className="text-sm px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
          >
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { LandingHeader } from "@/components/layout/LandingHeader";

function BackgroundGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
    </div>
  );
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isClerkAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isLanding = pathname === "/";

  if (isClerkAuthPage) {
    return (
      <>
        {children}
        <BackgroundGlow />
      </>
    );
  }

  if (isLanding) {
    return (
      <>
        <LandingHeader />
        <main className="pt-16 min-h-screen">{children}</main>
        <BackgroundGlow />
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="ml-64">
        <Navbar />
        <main className="mt-16 p-8 space-y-8">{children}</main>
      </div>
      <CommandPalette />
      <BackgroundGlow />
    </>
  );
}

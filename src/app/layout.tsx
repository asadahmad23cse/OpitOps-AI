import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "sonner";
import { optiopsClerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "OptiOps AI - DevOps Intelligence Platform",
  description: "AI-powered DevOps optimization, monitoring, and infrastructure management",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!clerkPk) {
    return (
      <html lang="en" className="dark">
        <body className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans antialiased">
          <h1 className="text-xl font-bold text-amber-400">Clerk configuration missing</h1>
          <p className="mt-3 text-gray-300 max-w-lg">
            <code className="text-cyan-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> is not set at
            <strong> build time</strong>. In Netlify go to{" "}
            <strong>Project configuration → Environment variables</strong>, add the key, then{" "}
            <strong>Deploys → Trigger deploy → Clear cache and deploy site</strong>.
          </p>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="hydration-fix" strategy="beforeInteractive">
          {`(function(){try{new MutationObserver(function(m){m.forEach(function(r){if(r.type==='attributes'&&(r.attributeName==='fdprocessedid'||r.attributeName==='data-dashlane-rid'||r.attributeName==='data-form-type')){r.target.removeAttribute(r.attributeName)}})}).observe(document.documentElement,{attributes:true,subtree:true})}catch(e){}})();`}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans antialiased min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-x-hidden`}
      >
        <ClerkProvider appearance={optiopsClerkAppearance} afterSignOutUrl="/">
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  backdropFilter: "blur(12px)",
                },
              }}
            />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}

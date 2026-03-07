import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";
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
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="hydration-fix" strategy="beforeInteractive">
          {`(function(){try{new MutationObserver(function(m){m.forEach(function(r){if(r.type==='attributes'&&(r.attributeName==='fdprocessedid'||r.attributeName==='data-dashlane-rid'||r.attributeName==='data-form-type')){r.target.removeAttribute(r.attributeName)}})}).observe(document.documentElement,{attributes:true,subtree:true})}catch(e){}})();`}
        </Script>
      </head>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white overflow-x-hidden`}>
        <QueryProvider>
          <Sidebar />
          <div className="ml-64">
            <Navbar />
            <main className="mt-16 p-8 space-y-8">
              {children}
            </main>
          </div>
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', backdropFilter: 'blur(12px)' },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}

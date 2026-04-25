import Link from "next/link";
import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { optiopsClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (!clerkPk) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-semibold text-white">Auth disabled in local mode</h1>
          <p className="text-sm text-gray-400">
            Clerk keys are not configured, so sign-in is unavailable. You can still explore the app
            from the dashboard.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
      <ClerkLoading>
        <div className="text-center space-y-3 max-w-md">
          <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-300 text-sm">Loading sign in...</p>
          <p className="text-gray-500 text-xs">
            Stuck here? Clerk must allow this site URL (Netlify). Open F12 and check Console for errors.
          </p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
          appearance={optiopsClerkAppearance}
        />
      </ClerkLoaded>
    </div>
  );
}

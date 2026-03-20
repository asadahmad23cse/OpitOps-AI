import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { optiopsClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
      <ClerkLoading>
        <div className="text-center space-y-3 max-w-md">
          <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-300 text-sm">Loading sign in…</p>
          <p className="text-gray-500 text-xs">
            Stuck here? Clerk must allow this site URL (Netlify). Open F12 → Console for errors.
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

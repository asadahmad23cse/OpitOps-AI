import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { optiopsClerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
      <ClerkLoading>
        <div className="text-center space-y-3 max-w-md">
          <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-300 text-sm">Loading sign up…</p>
          <p className="text-gray-500 text-xs">
            If this never finishes: in Clerk Dashboard add your exact Netlify URL under Domains / allowed
            origins, then redeploy. Try Chrome or turn off Brave Shields for this site.
          </p>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={optiopsClerkAppearance}
        />
      </ClerkLoaded>
    </div>
  );
}

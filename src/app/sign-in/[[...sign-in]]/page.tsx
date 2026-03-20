import { SignIn } from "@clerk/nextjs";
import { optiopsClerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
        appearance={optiopsClerkAppearance}
      />
    </div>
  );
}

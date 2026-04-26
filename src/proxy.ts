import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const authDisabled =
  process.env.NEXT_PUBLIC_DISABLE_AUTH === "1" ||
  process.env.NEXT_PUBLIC_DISABLE_AUTH?.toLowerCase() === "true";

const clerkEnabled =
  !authDisabled &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
  Boolean(process.env.CLERK_SECRET_KEY?.trim());

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhooks(.*)",
  "/api/model-status(.*)",
  "/api/ai/chat(.*)",
  "/api/health(.*)",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function proxy(req: NextRequest, evt: NextFetchEvent) {
  if (!clerkEnabled) {
    return NextResponse.next();
  }

  return clerkHandler(req, evt);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

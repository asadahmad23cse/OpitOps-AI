import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const clerkEnabled =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
  Boolean(process.env.CLERK_SECRET_KEY?.trim());

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhooks(.*)",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, evt: NextFetchEvent) {
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

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/onboarding",
  "/api/webhooks(.*)",
]);

const clerk = clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();
    const { pathname } = req.nextUrl;

    // Redirect authenticated users away from auth pages
    if (userId && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect non-public routes
    if (!isPublicRoute(req)) {
      if (!userId) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  },
  { signInUrl: "/login" }
);

export default clerk;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
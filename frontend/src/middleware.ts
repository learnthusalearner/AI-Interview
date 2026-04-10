import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that strictly require authentication
const isProtectedRoute = createRouteMatcher([
  '/interview(.*)',
  '/dashboard(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
     // If user is not authenticated, this throws a 401/Redirects them securely to login
     await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

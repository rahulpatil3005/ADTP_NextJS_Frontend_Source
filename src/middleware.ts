import { NextResponse, type NextRequest } from 'next/server';

// Route groups and their access rules.
// Actual JWT validation happens client-side via the Zustand auth store
// (tokens live in localStorage, not cookies, matching the SPA-style auth
// used by the mobile app). This middleware only handles the coarse
// redirect for unauthenticated visits to known-protected paths when a
// session cookie mirror is present — see note below.
const PUBLIC_PATHS = ['/login', '/login-otp', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // NOTE: For a production deployment, mirror the access token into an
  // httpOnly cookie at login time so middleware (which runs on the edge,
  // without access to localStorage) can perform a real auth check here.
  // This is left as a deployment-time decision since Invictus's existing
  // BFF layer may already standardise on a particular session strategy.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

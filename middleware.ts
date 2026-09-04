import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, COOKIE_NAME } from '@/lib/auth/session';

// Define the routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/parts',
  '/categories',
  '/suppliers',
  '/inventory',
  '/imports',
  '/exports',
  '/stock-check',
  '/quality-checks',
  '/reports',
  '/users',
  '/roles',
  '/audit-logs',
  '/admin'
];

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  // Decrypt the session from the cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = cookie ? await decrypt(cookie) : null;

  // Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to /dashboard if the user is authenticated and trying to access a public route like /login
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g., .svg, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

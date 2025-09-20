import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token');

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = req.cookies.get('role')?.value; // Ensure role is a string
  const restrictedPaths = ['/users', '/historico'];

  if (role !== 'admin' && restrictedPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/estoque', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/estoque/:path*', '/produtos/:path*', '/prateleiras/:path*', '/historico/:path*', '/users/:path*'],
};
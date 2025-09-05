import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Normalize duplicate slashes in pathname (e.g., //table) and preserve query string
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const normalizedPath = pathname.replace(/\/+/g, '/');
  if (normalizedPath !== pathname) {
    const url = new URL(req.url);
    url.pathname = normalizedPath;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};



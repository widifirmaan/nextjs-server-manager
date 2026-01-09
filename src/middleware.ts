import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Exclude public paths (login, static files, api/auth)
    if (
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/favicon.ico') ||
        request.nextUrl.pathname.includes('.') // Assume files with extensions are public assets
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth_token');

    if (!token || token.value !== 'authenticated') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

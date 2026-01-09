import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();

        // In a real app, use environment variables. 
        // For this specific request, we hardcode as requested, but also fallback to env.
        const CORRECT_PASSWORD = process.env.AUTH_PASSWORD;

        if (!CORRECT_PASSWORD) {
            console.error('AUTH_PASSWORD is not defined in environment variables');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (password === CORRECT_PASSWORD) {
            // Set HttpOnly cookie
            const cookieStore = await cookies();
            cookieStore.set('auth_token', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

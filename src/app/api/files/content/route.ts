import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'Path required' }, { status: 400 });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({ content });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { path: filePath, content } = await req.json();

        if (!filePath) {
            return NextResponse.json({ error: 'Path required' }, { status: 400 });
        }

        await fs.writeFile(filePath, content || '');
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

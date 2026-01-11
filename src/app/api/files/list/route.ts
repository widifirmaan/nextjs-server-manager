import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let dirPath = searchParams.get('path') || '/root'; // Default to /root

        // Basic formatting
        dirPath = path.normalize(dirPath);

        // Security check (basic): allow accessing everything for now as it is a server manager, 
        // but typically you'd restrict to a workspace. 
        // The user asked for /root/ git management previously, so access to /root is expected.

        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Directory not found or access denied' }, { status: 404 });
        }

        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        const files = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            try {
                const stats = await fs.stat(fullPath);
                return {
                    name: entry.name,
                    path: fullPath,
                    isDirectory: entry.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime,
                    mode: stats.mode
                };
            } catch (e) {
                return null;
            }
        }));

        const filteredFiles = files.filter(f => f !== null).sort((a, b) => {
            // Sort directories first
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
            path: dirPath,
            files: filteredFiles
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

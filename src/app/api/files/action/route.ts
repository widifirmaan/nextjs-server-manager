import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, path: targetPath, newPath } = body;

        if (!targetPath) {
            return NextResponse.json({ error: 'Path required' }, { status: 400 });
        }

        switch (action) {
            case 'delete':
                // Use rm -rf for safety regarding directories
                await fs.rm(targetPath, { recursive: true, force: true });
                break;
            case 'create-dir':
                await fs.mkdir(targetPath, { recursive: true });
                break;
            case 'create-file':
                // Handled by content write usually, but simple empty file creation
                await fs.writeFile(targetPath, '');
                break;
            case 'rename':
            case 'move':
                if (!newPath) return NextResponse.json({ error: 'New path required' }, { status: 400 });
                // Check if destination exists to avoid accidental overwrite (optional but safer)
                // For a simple manager, standard behavior is overwrite or fail. 
                // fs.rename overwrites if dest exists (on Linux).
                await fs.rename(targetPath, newPath);
                break;
            case 'copy':
                if (!newPath) return NextResponse.json({ error: 'New path required' }, { status: 400 });
                await fs.cp(targetPath, newPath, { recursive: true });
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

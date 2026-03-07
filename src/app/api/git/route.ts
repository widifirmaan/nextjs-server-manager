import { NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import path from 'path';
import { readDb, writeDb } from '@/lib/db';
import { performSystemScan } from '@/lib/git';
import os from 'os';

export const dynamic = 'force-dynamic';

const ROOT_DIRS = ['/root', os.homedir()].filter(Boolean);

export async function GET() {
    try {
        const db = await readDb();
        if (db.gitProjects && db.gitProjects.length > 0) {
            return NextResponse.json(db.gitProjects);
        }

        // Initial scan if DB is empty
        const projects = await performSystemScan();
        await writeDb({ gitProjects: projects });
        return NextResponse.json(projects);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, repoUrl, folderName } = body;

        if (action === 'rescan') {
            const projects = await performSystemScan();
            await writeDb({ gitProjects: projects });
            return NextResponse.json(projects);
        }

        if (repoUrl) {
            let targetName = folderName;
            if (!targetName) {
                const parts = repoUrl.split('/');
                targetName = parts[parts.length - 1].replace('.git', '');
            }
            targetName = targetName.replace(/[^a-zA-Z0-9-_]/g, '');
            
            const targetPath = path.join(ROOT_DIRS[0], targetName);
            const git = simpleGit();
            await git.clone(repoUrl, targetPath);

            // Re-scan or just add to DB? Re-scan is safer since it's now global
            const projects = await performSystemScan();
            await writeDb({ gitProjects: projects });

            return NextResponse.json({ success: true, message: 'Repository cloned successfully' });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

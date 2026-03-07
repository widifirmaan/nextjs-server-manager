import { NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import { readDb, writeDb } from '@/lib/db';
import { updateProjectInDb } from '@/lib/git';
import os from 'os';

const execAsync = util.promisify(exec);
const ROOT_DIRS = ['/root', os.homedir()].filter(Boolean);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectPath, action } = body;

        const isPathAllowed = ROOT_DIRS.some(dir => projectPath && projectPath.startsWith(dir)) && !projectPath.includes('..');

        if (!isPathAllowed) {
            return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
        }

        const git = simpleGit(projectPath);
        let result;

        switch (action) {
            case 'pull':
                // User requested standard pull to be "force" (hard reset to origin)
                await git.fetch();
                const pullStatus = await git.status();
                const pullBranch = pullStatus.current;
                let pullTarget = '';
                try {
                    pullTarget = (await git.revparse(['--abbrev-ref', '@{u}'])).trim();
                } catch (e) {
                    pullTarget = `origin/${pullBranch}`;
                }
                
                await git.reset(['--hard', pullTarget]);
                await git.clean('f', ['-d']);
                result = { message: `Pulled and Reset to ${pullTarget} successfully` };
                break;

            case 'fetch':
                result = await git.fetch();
                break;

            case 'force-pull':
                await git.fetch();
                const status = await git.status();
                const currentBranch = status.current;

                let resetTarget = '';
                try {
                    resetTarget = (await git.revparse(['--abbrev-ref', '@{u}'])).trim();
                } catch (e) {
                    resetTarget = `origin/${currentBranch}`;
                }

                await git.reset(['--hard', resetTarget]);
                await git.clean('f', ['-d']);
                result = { message: `Hard Reset to ${resetTarget} successful` };
                break;

            case 'docker-rebuild':
                try {
                    const { stdout, stderr } = await execAsync('docker compose down && docker compose up -d --build --force-recreate', {
                        cwd: projectPath
                    });
                    result = { stdout, stderr, message: 'Docker rebuild triggered successfully' };
                } catch (e: any) {
                    throw new Error(`Docker build failed: ${e.message}`);
                }
                break;

            case 'springboot-rebuild':
                try {
                    await execAsync('mvn clean package -DskipTests', { cwd: projectPath });
                    try {
                        await fs.access(path.join(projectPath, 'docker-compose.yml'));
                        const { stdout, stderr } = await execAsync('docker compose down && docker compose up -d --build --force-recreate', {
                            cwd: projectPath
                        });
                        result = { stdout, stderr, message: 'Spring Boot built & Docker restarted' };
                    } catch {
                        result = { message: 'Spring Boot JAR built successfully (mvn clean package)' };
                    }
                } catch (e: any) {
                    throw new Error(`Spring Boot build failed: ${e.message}`);
                }
                break;

            case 'delete':
                await fs.rm(projectPath, { recursive: true, force: true });
                const db = await readDb();
                if (db.gitProjects) {
                    const updatedProjects = db.gitProjects.filter((p: any) => p.path !== projectPath);
                    await writeDb({ gitProjects: updatedProjects });
                }
                return NextResponse.json({ success: true, data: { message: 'Repository deleted successfully' } });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Always update project status in DB after any git action
        await updateProjectInDb(projectPath);

        return NextResponse.json({ success: true, data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

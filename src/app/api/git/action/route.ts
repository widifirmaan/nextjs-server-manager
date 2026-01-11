import { NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectPath, action } = body;

        if (!projectPath || !projectPath.startsWith('/root/') || projectPath.includes('..')) {
            return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
        }

        const git = simpleGit(projectPath);

        let result;

        switch (action) {
            case 'pull':
                result = await git.pull();
                break;
            case 'fetch':
                result = await git.fetch();
                break;
            case 'log':
                result = await git.log({ maxCount: 10 });
                break;
            case 'status':
                result = await git.status();
                break;

            case 'force-pull':
                await git.fetch();
                const status = await git.status();
                const currentBranch = status.current;

                let resetTarget = '';
                try {
                    // Try to get configured upstream (e.g. origin/main)
                    resetTarget = (await git.revparse(['--abbrev-ref', '@{u}'])).trim();
                } catch (e) {
                    // No upstream configured. Try guessing origin/<branch>
                    resetTarget = `origin/${currentBranch}`;
                }

                try {
                    await git.reset(['--hard', resetTarget]);
                    // ALSO clean untracked files/directories (-fd)
                    await git.clean('f', ['-d']);
                    result = { message: `Hard Reset to ${resetTarget} successful` };
                } catch (e: any) {
                    if (e.message.includes('ambiguous argument') || e.message.includes('unknown revision')) {
                        throw new Error(`Remote branch '${resetTarget}' does not exist. Cannot force pull local-only branch.`);
                    }
                    throw e;
                }
                break;
            case 'docker-rebuild':
                // We assume compose for "Rebuild Docker" usually means restarting the stack
                // Note: We need to change CWD to project path to run compose
                try {
                    // Try to detect compose file first
                    const { stdout, stderr } = await execAsync('docker compose down && docker compose up -d --build --force-recreate', {
                        cwd: projectPath
                    });
                    result = { stdout, stderr, message: 'Docker rebuild triggered successfully' };
                } catch (e: any) {
                    // Fallback or error
                    throw new Error(`Docker build failed: ${e.message}`);
                }
                break;
            case 'springboot-rebuild':
                try {
                    // 1. Build the JAR file
                    await execAsync('mvn clean package -DskipTests', { cwd: projectPath });

                    // 2. If Docker Compose exists, rebuild the container to pick up the new JAR
                    try {
                        await fs.access(path.join(projectPath, 'docker-compose.yml'));
                        // Compose exists, restart it
                        const { stdout, stderr } = await execAsync('docker compose down && docker compose up -d --build --force-recreate', {
                            cwd: projectPath
                        });
                        result = { stdout, stderr, message: 'Spring Boot built & Docker restarted' };
                    } catch {
                        // No compose, just return build success
                        result = { message: 'Spring Boot JAR built successfully (mvn clean package)' };
                    }
                } catch (e: any) {
                    throw new Error(`Spring Boot build failed: ${e.message}`);
                }
                break;
            case 'delete':
                // Double safety check is already done at top of function
                await fs.rm(projectPath, { recursive: true, force: true });
                result = { message: 'Repository deleted successfully' };
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

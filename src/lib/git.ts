import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readDb, writeDb } from './db';

const execAsync = promisify(exec);
const ROOT_DIRS = ['/root', os.homedir()].filter(Boolean);

export async function getProjectInfo(fullPath: string) {
    try {
        const git = simpleGit(fullPath);
        
        // Check for project markers
        const dockerComposeYml = path.join(fullPath, 'docker-compose.yml');
        const dockerComposeYaml = path.join(fullPath, 'docker-compose.yaml');
        const dockerfile = path.join(fullPath, 'Dockerfile');
        const pomXml = path.join(fullPath, 'pom.xml');

        const [status, remotes, hasComposeYml, hasComposeYaml, hasDockerfile, hasPomXml] = await Promise.all([
            git.status().catch(() => ({ current: 'unknown', isClean: () => true, ahead: 0, behind: 0, files: [] })),
            git.getRemotes(true).catch(() => []),
            fs.access(dockerComposeYml).then(() => true).catch(() => false),
            fs.access(dockerComposeYaml).then(() => true).catch(() => false),
            fs.access(dockerfile).then(() => true).catch(() => false),
            fs.access(pomXml).then(() => true).catch(() => false)
        ]);

        let dockerType = null;
        if (hasComposeYml || hasComposeYaml) dockerType = 'compose';
        else if (hasPomXml) dockerType = 'springboot';
        else if (hasDockerfile) dockerType = 'file';

        const lastCommit = await git.log({ maxCount: 1 }).catch(() => null);

        return {
            name: path.basename(fullPath),
            path: fullPath,
            branch: (status as any).current,
            isClean: (status as any).isClean(),
            ahead: (status as any).ahead,
            behind: (status as any).behind,
            filesChanged: (status as any).files.length,
            files: (status as any).files,
            dockerType,
            remote: remotes[0]?.refs?.fetch || '',
            lastCommit: lastCommit?.latest ? {
                message: lastCommit.latest.message,
                date: lastCommit.latest.date,
                author_name: lastCommit.latest.author_name
            } : null
        };
    } catch (err) {
        return {
            name: path.basename(fullPath),
            path: fullPath,
            error: 'Failed to read git info'
        };
    }
}

export async function performSystemScan() {
    const scanPaths = ROOT_DIRS.join(' ');
    try {
        const { stdout } = await execAsync(`find ${scanPaths} -type d \\( -name node_modules -o -name bower_components -o -name .next -o -name .cache -o -name .npm -o -name .cargo -o -name .local -o -name .ssh \\) -prune -o -name .git -type d -prune -print 2>/dev/null || true`);
        const paths = stdout.split('\n').filter(p => p.trim() !== '').map(p => path.dirname(p));
        
        const projects = [];
        for (const p of paths) {
            const info = await getProjectInfo(p);
            projects.push(info);
        }
        return projects;
    } catch (e) {
        console.error('System scan failed:', e);
        return [];
    }
}

export async function updateProjectInDb(projectPath: string) {
    try {
        const info = await getProjectInfo(projectPath);
        const db = await readDb();
        if (db.gitProjects) {
            const index = db.gitProjects.findIndex((p: any) => p.path === projectPath);
            if (index !== -1) {
                db.gitProjects[index] = info;
            } else {
                db.gitProjects.push(info);
            }
            await writeDb({ gitProjects: db.gitProjects });
        }
        return info;
    } catch (e) {
        console.error('Failed to update project in DB:', e);
    }
}

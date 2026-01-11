import { NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = '/root';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Check if we can access the directory
        try {
            await fs.access(ROOT_DIR);
        } catch (e) {
            return NextResponse.json({
                error: `Cannot access ${ROOT_DIR}. Please ensure the process has root privileges.`
            }, { status: 403 });
        }

        const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true });
        const directories = entries.filter(e => e.isDirectory());

        const gitProjects = [];

        for (const dir of directories) {
            const fullPath = path.join(ROOT_DIR, dir.name);
            const gitPath = path.join(fullPath, '.git');

            try {
                await fs.access(gitPath);

                // It is a git repo
                const git = simpleGit(fullPath);

                // Get basic info in parallel
                try {

                    // Check for Docker files
                    const dockerComposeYml = path.join(fullPath, 'docker-compose.yml');
                    const dockerComposeYaml = path.join(fullPath, 'docker-compose.yaml');
                    const dockerfile = path.join(fullPath, 'Dockerfile');
                    const pomXml = path.join(fullPath, 'pom.xml');

                    const [status, remotes, hasComposeYml, hasComposeYaml, hasDockerfile, hasPomXml] = await Promise.all([
                        git.status(),
                        git.getRemotes(true),
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

                    gitProjects.push({
                        name: dir.name,
                        path: fullPath,
                        branch: status.current,
                        isClean: status.isClean(),
                        ahead: status.ahead,
                        behind: status.behind,
                        filesChanged: status.files.length,
                        files: status.files, // List of dirty files
                        dockerType, // compose | file | null
                        remote: remotes[0]?.refs?.fetch || '',
                        lastCommit: lastCommit?.latest ? {
                            message: lastCommit.latest.message,
                            date: lastCommit.latest.date,
                            author_name: lastCommit.latest.author_name
                        } : null
                    });
                } catch (err) {
                    console.error(`Error reading git info for ${dir.name}:`, err);
                    gitProjects.push({
                        name: dir.name,
                        path: fullPath,
                        error: 'Failed to read git info'
                    });
                }

            } catch (e) {
                // Not a git repo, skip
            }
        }

        return NextResponse.json(gitProjects);
    } catch (err: any) {
        console.error('Error listing git projects:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { repoUrl, folderName } = await req.json();

        if (!repoUrl) {
            return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
        }

        let targetName = folderName;
        if (!targetName) {
            // Extract name from URL (e.g., https://github.com/user/repo.git -> repo)
            const parts = repoUrl.split('/');
            targetName = parts[parts.length - 1].replace('.git', '');
        }

        // Basic sanitization
        targetName = targetName.replace(/[^a-zA-Z0-9-_]/g, '');

        if (!targetName) {
            return NextResponse.json({ error: 'Invalid target folder name' }, { status: 400 });
        }

        const targetPath = path.join(ROOT_DIR, targetName);

        // Check if directory already exists
        try {
            await fs.access(targetPath);
            return NextResponse.json({ error: `Directory ${targetName} already exists in /root/` }, { status: 400 });
        } catch (e) {
            // Good, directory doesn't exist
        }

        const git = simpleGit();
        await git.clone(repoUrl, targetPath);

        return NextResponse.json({ success: true, message: 'Repository cloned successfully' });
    } catch (err: any) {
        console.error('Clone error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

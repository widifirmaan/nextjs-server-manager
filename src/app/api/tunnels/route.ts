import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import os from 'os';

// Try common locations
const CONFIG_PATHS = [
    path.join(os.homedir(), '.cloudflared', 'config.yml'),
    '/etc/cloudflared/config.yml'
];

function getConfigPath() {
    for (const p of CONFIG_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

export const dynamic = 'force-dynamic';

export async function GET() {
    const configPath = getConfigPath();
    if (!configPath) {
        return NextResponse.json({
            error: 'Config file not found. Checked: ' + CONFIG_PATHS.join(', '),
            found: false
        }, { status: 404 });
    }
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const doc = yaml.load(content);
        return NextResponse.json({ config: doc, path: configPath, found: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const configPath = getConfigPath();
    if (!configPath) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    try {
        const body = await req.json();
        const content = fs.readFileSync(configPath, 'utf8');
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const doc: any = yaml.load(content);

        if (!doc.ingress) doc.ingress = [];

        if (body.action === 'add') {
            if (!body.hostname || !body.service) {
                return NextResponse.json({ error: 'Missing hostname or service' }, { status: 400 });
            }
            const newRule = { hostname: body.hostname, service: body.service };

            // Heuristic: Insert before the catch-all service (the one without hostname)
            // Or just append if no catch-all found
            const catchAllIndex = doc.ingress.findIndex((r: any) => !r.hostname);

            if (catchAllIndex !== -1) {
                doc.ingress.splice(catchAllIndex, 0, newRule);
            } else {
                doc.ingress.push(newRule);
            }
        } else if (body.action === 'delete') {
            doc.ingress = doc.ingress.filter((r: any) => r.hostname !== body.hostname);
        }

        const newYaml = yaml.dump(doc);
        fs.writeFileSync(configPath, newYaml);

        return NextResponse.json({ success: true, config: doc });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

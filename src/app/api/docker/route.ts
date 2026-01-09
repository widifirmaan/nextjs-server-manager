import { NextResponse } from 'next/server';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const containers = await docker.listContainers({ all: true });
        return NextResponse.json(containers);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return NextResponse.json({ error: 'Docker socket not found. Is Docker running?' }, { status: 500 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

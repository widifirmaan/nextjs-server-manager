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

export async function POST(req: Request) {
    try {
        const { image, name } = await req.json();
        if (!image) return NextResponse.json({ error: 'Image is required' }, { status: 400 });

        const container = await docker.createContainer({
            Image: image,
            name: name || `container-${Math.random().toString(36).substring(7)}`,
            Tty: true,
        });

        await container.start();
        return NextResponse.json({ success: true, id: container.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

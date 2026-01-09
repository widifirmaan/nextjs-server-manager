import { NextResponse } from 'next/server';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function POST(req: Request, props: { params: Promise<{ id: string, action: string }> }) {
    const params = await props.params;
    const { id, action } = params;

    console.log(`[Docker API] Received request to ${action} container ${id}`);

    try {
        const container = docker.getContainer(id);

        // Inspect first to ensure container exists
        await container.inspect();

        if (action === 'start') {
            await container.start();
        } else if (action === 'stop') {
            await container.stop();
        } else if (action === 'restart') {
            // Restart can be slow, so we might want to just fire and forget or wait
            await container.restart();
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        console.log(`[Docker API] Success: ${action} ${id}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error(`[Docker API] Error:`, err);
        return NextResponse.json({ error: err.message || 'Docker operation failed' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { command } = body;

        if (!command) {
            return NextResponse.json(
                { error: 'Command is required' },
                { status: 400 }
            );
        }

        // Security warning: executing arbitrary commands is dangerous.
        // Ensure this endpoint is protected by authentication middleware.

        // Execute the command
        const { stdout, stderr } = await execAsync(command);

        return NextResponse.json({
            output: stdout,
            error: stderr,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to execute command' },
            { status: 500 }
        );
    }
}

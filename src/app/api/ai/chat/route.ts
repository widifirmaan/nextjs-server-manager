import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        return new Promise((resolve) => {
            // Call system-installed gemini cli with headless prompt and text format
            const child = spawn('gemini', ['-p', message, '-o', 'text'], {
                shell: true // required on some systems to resolve the global bin natively
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                // If it fails or outputs error, we resolve gracefully to show in chat
                if (code !== 0) {
                    resolve(NextResponse.json(
                        { error: errorOutput || `Process exited with code ${code}` }, 
                        { status: 500 }
                    ));
                } else {
                    resolve(NextResponse.json({ reply: output.trim() }));
                }
            });
            
            // Handle spawn errors (e.g., gemini CLI not found)
            child.on('error', (err) => {
                resolve(NextResponse.json({ error: `Failed to start gemini CLI: ${err.message}` }, { status: 500 }));
            });
        });

    } catch (error: any) {
        console.error("AI API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

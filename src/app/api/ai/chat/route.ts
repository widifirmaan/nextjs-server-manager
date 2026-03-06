import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
    try {
        const { message, fileContent, fileName } = await req.json();
        
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        let fullPrompt = message;
        if (fileContent && fileName) {
            fullPrompt = `CONTEXT (File: ${fileName}):\n\n${fileContent}\n\n---\n\nUSER REQUEST:\n${message}`;
        }

        return new Promise((resolve) => {
            // Call system-installed gemini cli with headless prompt and text format
            // Use '-' following '-p' to read from stdin (assuming gemini CLI supports this pattern)
            // If it doesn't support '-', we can just use prompt with a stdin pipe
            const child = spawn('gemini', ['-p', '-', '-o', 'text'], {
                shell: true 
            });

            // Write the prompt to stdin
            child.stdin.write(fullPrompt);
            child.stdin.end();

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

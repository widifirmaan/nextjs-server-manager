import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: NextRequest) {
    try {
        const { message, fileContent, fileName } = await req.json();
        
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const SYSTEM_PROMPT = `You are an AI Coding Assistant integrated into a web IDE.
Your goal is to help users browse, edit, and manage their filesystem.

GUIDELINES:
1. When proposing code changes for the active file, wrap the ENTIRE NEW CONTENT in these tags:
   <CODE_CHANGE>
   [FILE CONTENT]
   </CODE_CHANGE>
2. When proposing to create a new file, use:
   <CREATE_FILE path="/absolute/path/to/file">
   [CONTENT]
   </CREATE_FILE>
3. When proposing to create a directory, use:
   <CREATE_DIR path="/absolute/path/to/dir" />
4. Always provide the full content for <CODE_CHANGE> so it can be applied directly.
5. Keep descriptions outside the tags brief.`;

        let fullPrompt = `${SYSTEM_PROMPT}\n\n`;
        if (fileContent && fileName) {
            fullPrompt += `CONTEXT (Active File: ${fileName}):\n\n${fileContent}\n\n---\n\n`;
        }
        fullPrompt += `USER REQUEST:\n${message}`;

        return new Promise<Response>((resolve) => {
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

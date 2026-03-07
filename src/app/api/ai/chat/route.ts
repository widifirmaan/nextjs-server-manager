import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic'; // Ensure dynamic execution

export async function POST(req: NextRequest) {
    try {
        const { message, fileContent, fileName, currentPath, projectStructure } = await req.json();
        
        if (!message) {
            return new Response("Message is required", { status: 400 });
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

        if (currentPath) {
            fullPrompt += `CURRENT PROJECT PATH: ${currentPath}\n\n`;
        }

        if (projectStructure) {
            fullPrompt += `PROJECT STRUCTURE:\n${projectStructure}\n\n`;
        }

        if (fileContent && fileName) {
            fullPrompt += `ACTIVE FILE CONTENT (Name: ${fileName}):\n\n${fileContent}\n\n---\n\n`;
        }
        fullPrompt += `USER REQUEST:\n${message}`;

        const stream = new ReadableStream({
            start(controller) {
                const child = spawn('gemini', ['-p', '-', '-o', 'text'], {
                    shell: true 
                });

                child.stdin.write(fullPrompt);
                child.stdin.end();

                child.stdout.on('data', (data) => {
                    controller.enqueue(data);
                });

                child.stderr.on('data', (data) => {
                    // We can optionally prefix stderr to differentiate on the client
                    controller.enqueue(data);
                });

                child.on('close', (code) => {
                    if (code !== 0) {
                        controller.enqueue(`\n[PROCESS EXITED WITH CODE ${code}]`);
                    }
                    controller.close();
                });
                
                child.on('error', (err) => {
                    controller.enqueue(`\n[ERROR: ${err.message}]`);
                    controller.close();
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });

    } catch (error: any) {
        console.error("AI API Error:", error);
        return new Response(error.message, { status: 500 });
    }
}

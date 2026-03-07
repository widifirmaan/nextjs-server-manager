'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

export default function TerminalComponent({ cwd, command }: { cwd?: string, command?: string }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const initialized = useRef(false);
    const socketRef = useRef<Socket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        // We'll allow re-initialization if cwd or command changes
        if (initialized.current) {
            // ... (cleanup)
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            if (termRef.current) {
                termRef.current.dispose();
                termRef.current = null;
            }
            initialized.current = false;
        }
        
        initialized.current = true;

        // Use a small timeout to ensure container is rendered
        const initTimer = setTimeout(() => {
            if (!terminalRef.current) return;

            // ... (setup terminal)
            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#0a0a0a',
                    foreground: '#ededed',
                    cursor: '#00f0ff',
                    selectionBackground: 'rgba(0, 240, 255, 0.3)',
                },
                fontFamily: '"Fira Code", monospace',
                fontSize: 13,
                allowProposedApi: true,
            });
            termRef.current = term;

            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;
            term.loadAddon(fitAddon);

            term.open(terminalRef.current);

            const safeFit = () => {
                if (!termRef.current || !fitAddonRef.current || !terminalRef.current) return;
                try {
                    const width = terminalRef.current.clientWidth;
                    const height = terminalRef.current.clientHeight;

                    if (width > 0 && height > 0) {
                        fitAddonRef.current.fit();
                        if (socketRef.current?.connected) {
                            socketRef.current.emit('terminal:resize', { cols: term.cols, rows: term.rows });
                        }
                    }
                } catch (e) { }
            };

            // Initialize Socket.io with cwd and command
            const query: any = {};
            if (cwd) query.cwd = cwd;
            if (command) query.command = command;

            const socket = io({
                path: '/socket.io',
                transports: ['websocket'],
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                query
            });
            socketRef.current = socket;

            socket.on('connect_error', (err) => {
                term.write(`\r\n\x1b[1;31mCONNECTION ERROR: ${err.message}\x1b[0m\r\n`);
            });

            socket.on('disconnect', (reason) => {
                term.write(`\r\n\x1b[1;31mDISCONNECTED: ${reason}\x1b[0m\r\n`);
            });

            term.onData((data) => {
                if (socket.connected) {
                    socket.emit('terminal:input', data);
                }
            });

            socket.on('terminal:output', (data) => {
                term.write(data);
            });

            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(safeFit);
            });
            resizeObserver.observe(terminalRef.current);

            // Handle Paste
            const handlePaste = (e: ClipboardEvent) => {
                const text = e.clipboardData?.getData('text');
                if (text && socket.connected) {
                    socket.emit('terminal:input', text);
                }
            };
            terminalRef.current.addEventListener('paste', handlePaste);

            // Handle Right Click to Paste (if no selection)
            const handleContextMenu = (e: MouseEvent) => {
                // If there's a selection, let the default behavior (copy on select) or browser menu handle it
                // But usually, terminal users want right-click to PASTE.
                if (!term.hasSelection()) {
                    e.preventDefault();
                    navigator.clipboard.readText().then(text => {
                        if (text && socket.connected) {
                            socket.emit('terminal:input', text);
                        }
                    }).catch(() => {
                        // Fallback: just show browser menu if clipboard access is denied
                    });
                }
            };
            terminalRef.current.addEventListener('contextmenu', handleContextMenu);

            window.addEventListener('resize', safeFit);

            return () => {
                terminalRef.current?.removeEventListener('paste', handlePaste);
                terminalRef.current?.removeEventListener('contextmenu', handleContextMenu);
                resizeObserver.disconnect();
                window.removeEventListener('resize', safeFit);
            };
        }, 100);

        return () => {
            clearTimeout(initTimer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            if (termRef.current) {
                termRef.current.dispose();
                termRef.current = null;
            }
            initialized.current = false;
        };
    }, [cwd, command]);

    return <div ref={terminalRef} className="w-full h-full bg-[#0a0a0a] overflow-hidden" style={{ display: 'block' }} />;
}

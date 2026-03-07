'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

export default function TerminalComponent({ cwd }: { cwd?: string }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const initialized = useRef(false);
    const socketRef = useRef<Socket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        // We'll allow re-initialization if cwd changes
        if (initialized.current) {
            // If already initialized and cwd changed, we might want to kill old one
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

            // Initialize xterm
            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#0a0a0a', // Match the project background
                    foreground: '#ededed',
                    cursor: '#00f0ff',
                    selectionBackground: 'rgba(0, 240, 255, 0.3)',
                },
                fontFamily: '"Fira Code", monospace',
                fontSize: 13, // Slightly smaller for integrated feel
                allowProposedApi: true,
            });
            termRef.current = term;

            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;
            term.loadAddon(fitAddon);

            // Open terminal in container
            term.open(terminalRef.current);

            // Safe fit function
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

            // Initialize Socket.io with cwd
            const socket = io({
                path: '/socket.io',
                transports: ['websocket'],
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                query: cwd ? { cwd } : {}
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                term.write('\r\n\x1b[1;36mTERMINAL CONNECTED\x1b[0m\r\n');
                requestAnimationFrame(safeFit);
            });

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

            requestAnimationFrame(safeFit);

            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(safeFit);
            });
            resizeObserver.observe(terminalRef.current);

            window.addEventListener('resize', safeFit);

            return () => {
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
    }, [cwd]);

    return <div ref={terminalRef} className="w-full h-full bg-[#0a0a0a] overflow-hidden" style={{ display: 'block' }} />;
}

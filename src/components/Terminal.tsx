'use client';
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const initialized = useRef(false);
    const socketRef = useRef<Socket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Use a small timeout to ensure container is rendered
        const initTimer = setTimeout(() => {
            if (!terminalRef.current) return;

            // Initialize xterm
            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#111111',
                    foreground: '#ededed',
                    cursor: '#00f0ff',
                    selectionBackground: 'rgba(0, 240, 255, 0.3)',
                },
                fontFamily: '"Fira Code", monospace',
                fontSize: 14,
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
                    // Ensure dimensions exist
                    const width = terminalRef.current.clientWidth;
                    const height = terminalRef.current.clientHeight;

                    if (width > 0 && height > 0) {
                        fitAddonRef.current.fit();
                        if (socketRef.current?.connected) {
                            socketRef.current.emit('terminal:resize', { cols: term.cols, rows: term.rows });
                        }
                    }
                } catch (e) {
                    // Suppress fit errors
                }
            };

            // Initialize Socket.io
            const socket = io({
                path: '/socket.io',
                transports: ['websocket'],
                reconnectionDelay: 1000,
                reconnectionAttempts: 10
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                term.write('\r\n\x1b[1;36mCONNECTED TO SERVER\x1b[0m\r\n');
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

            // Initial fit
            requestAnimationFrame(safeFit);

            // Resize handler using ResizeObserver for better accuracy
            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(safeFit);
            });
            resizeObserver.observe(terminalRef.current);

            // Fallback window resize
            window.addEventListener('resize', safeFit);

            // Cleanup function for this effect's closure
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
    }, []);

    return <div ref={terminalRef} className="w-full h-full bg-[#111] overflow-hidden rounded-lg" style={{ minHeight: '600px', display: 'block' }} />;
}

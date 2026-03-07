'use client';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { Copy, Clipboard, X } from 'lucide-react';

export default function TerminalComponent({ cwd, command }: { cwd?: string, command?: string }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const initialized = useRef(false);
    const socketRef = useRef<Socket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    
    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const handleAction = async (action: 'copy' | 'paste') => {
        if (!termRef.current) return;

        if (action === 'copy') {
            const selection = termRef.current.getSelection();
            if (selection) {
                await navigator.clipboard.writeText(selection);
            }
        } else if (action === 'paste') {
            try {
                const text = await navigator.clipboard.readText();
                if (text && socketRef.current?.connected) {
                    socketRef.current.emit('terminal:input', text);
                }
            } catch (err) {
                console.error('Failed to read clipboard:', err);
            }
        }
        setContextMenu(null);
    };

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        // We'll allow re-initialization if cwd or command changes
        if (initialized.current) {
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

            window.addEventListener('resize', safeFit);

            return () => {
                terminalRef.current?.removeEventListener('paste', handlePaste);
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

    return (
        <div 
            className="relative w-full h-full bg-[#0a0a0a] overflow-hidden"
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenu({ 
                    x: e.clientX - rect.left, 
                    y: e.clientY - rect.top 
                });
            }}
        >
            <div 
                className="absolute top-3 right-4 flex gap-2 z-[9998] opacity-60 hover:opacity-100 transition-all duration-500 ease-in-out transform hover:translate-y-0.5"
                onContextMenu={(e) => e.stopPropagation()}
            >
                <button 
                    className="group relative flex items-center justify-center p-2.5 bg-transparent border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-white/20 shadow-lg transition-all duration-300"
                    onClick={() => handleAction('copy')}
                    title="Copy Selection"
                >
                    <div className="flex items-center gap-2 relative z-10">
                        <Copy size={16} className="group-hover:scale-110 transition-transform duration-300 text-white" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] pointer-events-none">Copy</span>
                    </div>
                </button>
                
                <button 
                    className="group relative flex items-center justify-center p-2.5 bg-transparent border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-white/20 shadow-lg transition-all duration-300"
                    onClick={() => handleAction('paste')}
                    title="Paste from Clipboard"
                >
                    <div className="flex items-center gap-2 relative z-10">
                        <Clipboard size={16} className="group-hover:scale-110 transition-transform duration-300 text-white" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] pointer-events-none">Paste</span>
                    </div>
                </button>
            </div>
            <div ref={terminalRef} className="w-full h-full" style={{ display: 'block' }} />
            
            {contextMenu && (
                <div 
                    className="absolute z-[9999] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1.5 min-w-[160px] animate-in fade-in zoom-in duration-200"
                    style={{ 
                        left: Math.min(contextMenu.x, (terminalRef.current?.clientWidth || 0) - 160), 
                        top: Math.min(contextMenu.y, (terminalRef.current?.clientHeight || 0) - 100) 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] transition-all text-left group"
                        onClick={() => handleAction('copy')}
                    >
                        <Copy size={15} className="text-[#00f0ff] group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Copy Selection</span>
                    </button>
                    <button 
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] transition-all text-left group"
                        onClick={() => handleAction('paste')}
                    >
                        <Clipboard size={15} className="text-[#00f0ff] group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Paste from Clipboard</span>
                    </button>
                </div>
            )}
        </div>
    );
}


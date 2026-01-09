'use client';
import dynamic from 'next/dynamic';

const TerminalComponent = dynamic(() => import('@/components/Terminal'), {
    ssr: false,
    loading: () => <div className="p-8 text-muted">Initializing terminal session...</div>
});

export default function TerminalPage() {
    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <h1 className="text-2xl font-bold mb-4 neon-text">Terminal Access</h1>
            <div className="flex-1 overflow-hidden bg-[#111] rounded-lg border border-[#333] p-2 glass-panel">
                <TerminalComponent />
            </div>
        </div>
    )
}

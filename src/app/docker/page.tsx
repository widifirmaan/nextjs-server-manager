'use client';
import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, AlertTriangle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
// import { toast } from 'sonner';

export default function DockerPage() {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const [containers, setContainers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchContainers = async () => {
        try {
            const res = await fetch('/api/docker');
            const data = await res.json();
            if (res.ok) {
                setContainers(data);
                setError('');
            } else {
                setError(data.error || 'Failed to fetch containers');
            }
        } catch (e) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id: string, action: string) => {
        setProcessing(`${id}-${action}`);
        try {
            const res = await fetch(`/api/docker/${id}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                // Refresh immediately
                fetchContainers();
            }
        } catch (e) {
            alert('Failed to send command');
        } finally {
            setProcessing(null);
        }
    };

    if (loading && containers.length === 0) return <div className="p-8">Loading Docker stats...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 neon-text">Docker Management</h1>

            {error && (
                <div className="mb-4 p-4 border border-red-500 bg-red-900/20 text-red-200 rounded flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Image</th>
                                <th>State</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {containers.map((c) => {
                                const isProcessing = processing?.startsWith(c.Id);
                                return (
                                    <tr key={c.Id} className="hover:bg-white/5 transition-colors">
                                        <td className="font-mono text-sm font-semibold">{c.Names[0]?.replace('/', '') || c.Id.substring(0, 12)}</td>
                                        <td className="text-sm text-muted">{c.Image}</td>
                                        <td>
                                            <span className={clsx('badge', c.State === 'running' ? 'badge-success' : 'badge-error')}>
                                                {c.State}
                                            </span>
                                        </td>
                                        <td className="text-sm text-muted truncate max-w-[150px]">{c.Status}</td>
                                        <td className="flex gap-2">
                                            {c.State !== 'running' && (
                                                <button
                                                    className="btn btn-primary p-2"
                                                    title="Start"
                                                    disabled={!!processing}
                                                    onClick={() => handleAction(c.Id, 'start')}
                                                >
                                                    {processing === `${c.Id}-start` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                </button>
                                            )}
                                            {c.State === 'running' && (
                                                <button
                                                    className="btn btn-danger p-2"
                                                    title="Stop"
                                                    disabled={!!processing}
                                                    onClick={() => handleAction(c.Id, 'stop')}
                                                >
                                                    {processing === `${c.Id}-stop` ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                                </button>
                                            )}
                                            <button
                                                className="btn p-2"
                                                title="Restart"
                                                disabled={!!processing}
                                                onClick={() => handleAction(c.Id, 'restart')}
                                            >
                                                {processing === `${c.Id}-restart` ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {containers.length === 0 && !loading && !error && (
                    <div className="p-8 text-center text-muted">No containers found.</div>
                )}
            </div>
        </div>
    );
}

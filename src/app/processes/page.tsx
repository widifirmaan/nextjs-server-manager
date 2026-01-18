'use client';
import { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Activity, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ProcessMonitor() {
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const fetchProcesses = async () => {
        try {
            const res = await fetch('/api/processes');
            if (res.ok) {
                const data = await res.json();
                setProcesses(data.processes);
                setError('');
            } else {
                setError('Failed to fetch processes');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
        const interval = setInterval(fetchProcesses, 6000); // 6s refresh
        return () => clearInterval(interval);
    }, []);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProcesses = [...processes].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const killProcess = async (pid: string) => {
        if (!confirm(`Are you sure you want to kill process ${pid}?`)) return;

        try {
            const res = await fetch('/api/processes/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'kill', pid })
            });
            if (res.ok) {
                fetchProcesses();
            } else {
                alert('Failed to kill process');
            }
        } catch (e) {
            alert('Error killing process');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/" className="btn btn-primary rounded-full p-2">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl font-bold neon-text flex items-center gap-2">
                        <Activity className="text-primary" /> Process Monitor
                    </h1>
                </div>
                <button
                    onClick={fetchProcesses}
                    className="btn btn-secondary"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="overflow-x-auto glass-panel">
                <table className="table">
                    <thead>
                        <tr>
                            <th>PID</th>
                            <th>Name</th>
                            <th>
                                <button onClick={() => handleSort('cpu')} className="flex items-center gap-1 hover:text-white transition-colors">
                                    CPU % {sortConfig?.key === 'cpu' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </button>
                            </th>
                            <th>
                                <button onClick={() => handleSort('mem')} className="flex items-center gap-1 hover:text-white transition-colors">
                                    MEM % {sortConfig?.key === 'mem' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </button>
                            </th>
                            <th className="hidden md:table-cell">Args</th>
                            <th className="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {sortedProcesses.map((proc) => (
                                <motion.tr
                                    key={proc.pid}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <td className="font-mono text-sm">{proc.pid}</td>
                                    <td className="font-medium text-primary">{proc.name}</td>
                                    <td className="font-mono">{proc.cpu}%</td>
                                    <td className="font-mono">{proc.mem}%</td>
                                    <td className="hidden md:table-cell" title={proc.args}>
                                        <div className="max-w-[300px] truncate text-xs text-muted">
                                            {proc.args}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => killProcess(proc.pid)}
                                            className="btn btn-danger text-xs px-2 py-1"
                                            title="Kill Process"
                                        >
                                            <Trash2 size={14} /> Kill
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {processes.length === 0 && !loading && (
                    <div className="p-8 text-center text-muted">No processes found.</div>
                )}
            </div>
        </div>
    );
}

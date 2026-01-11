'use client';
import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Download, RefreshCw, AlertTriangle, Loader2, GitPullRequest, Clock } from 'lucide-react';
import clsx from 'clsx';
// import { toast } from 'sonner';

interface GitProject {
    name: string;
    path: string;
    branch: string;
    isClean: boolean;
    ahead: number;
    behind: number;
    filesChanged: number;
    remote: string;
    lastCommit: {
        message: string;
        date: string;
        author_name: string;
    } | null;
    error?: string;
}

export default function GitPage() {
    const [projects, setProjects] = useState<GitProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/git');
            const data = await res.json();
            if (res.ok) {
                setProjects(data);
                setError('');
            } else {
                setError(data.error || 'Failed to fetch projects');
            }
        } catch (e) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleAction = async (path: string, action: string) => {
        setProcessing(`${path}-${action}`);
        try {
            const res = await fetch('/api/git/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectPath: path, action }),
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                if (action === 'pull') {
                    alert('Pull successful');
                } else if (action === 'fetch') {
                    alert('Fetch successful');
                } else if (action === 'force-pull') {
                    alert('Force Pull (Hard Reset) successful');
                }
                fetchProjects();
            }
        } catch (e) {
            alert('Failed to execute command');
        } finally {
            setProcessing(null);
        }
    };

    const handleFetchAll = async () => {
        if (!confirm('Fetch all projects? This might take a while.')) return;
        setLoading(true); // Re-use loading state to block UI

        try {
            // We'll just sequentially fetch all for now to keep it simple without new API
            // Or better, let's just do it client side for simplicity given the current setup
            const promises = projects.map(p =>
                fetch('/api/git/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectPath: p.path, action: 'fetch' }),
                })
            );

            await Promise.all(promises);
            alert('All projects fetched');
            fetchProjects();
        } catch (e) {
            alert('Failed to fetch all projects');
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold neon-text">Git Projects</h1>
                <div className="flex gap-2">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleFetchAll}
                        disabled={loading || projects.length === 0}
                    >
                        <RefreshCw size={18} className={clsx(loading && "animate-spin mr-2", !loading && "mr-2")} />
                        Fetch All
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={fetchProjects}
                        disabled={loading}
                        title="Refresh List"
                    >
                        <RefreshCw size={18} className={clsx(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 border border-red-500 bg-red-900/20 text-red-200 rounded flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {loading && projects.length === 0 ? (
                <div className="p-8 text-center">Loading Git projects...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {projects.map((p) => (
                        <div key={p.path} className="card p-5 hover:bg-white/5 transition-colors group">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-lg font-bold font-mono text-primary">{p.name}</h2>
                                        <span className="badge badge-outline text-xs flex items-center gap-1">
                                            <GitBranch size={12} />
                                            {p.branch}
                                        </span>
                                        {p.behind > 0 && <span className="badge badge-warning text-xs">{p.behind} behind</span>}
                                        {p.ahead > 0 && <span className="badge badge-info text-xs">{p.ahead} ahead</span>}
                                        {!p.isClean && <span className="badge badge-error text-xs">Dirty ({p.filesChanged})</span>}
                                        {p.isClean && <span className="badge badge-success text-xs">Clean</span>}
                                    </div>

                                    <div className="text-sm text-muted mb-4 font-mono break-all">
                                        {p.remote}
                                    </div>

                                    {p.lastCommit ? (
                                        <div className="bg-base-300/50 rounded p-3 text-sm">
                                            <div className="flex items-center gap-2 text-text-primary mb-1">
                                                <GitCommit size={16} className="text-primary" />
                                                <span className="font-medium">{p.lastCommit.message}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted mt-2">
                                                <span className="flex items-center gap-1">
                                                    <span className="font-semibold text-text-secondary">{p.lastCommit.author_name}</span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatDate(p.lastCommit.date)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted italic">No commits found</div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleAction(p.path, 'pull')}
                                        disabled={!!processing || !!p.error}
                                        title="Pull (Fast Forward)"
                                    >
                                        {processing === `${p.path}-pull` ? (
                                            <Loader2 size={16} className="animate-spin mr-2" />
                                        ) : (
                                            <Download size={16} className="mr-2" />
                                        )}
                                        Pull
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => {
                                            if (confirm('Force Pull will RESET all local changes and overwrite them with the remote version. Are you sure?')) {
                                                handleAction(p.path, 'force-pull');
                                            }
                                        }}
                                        disabled={!!processing || !!p.error}
                                        title="Hard Reset to Origin"
                                    >
                                        {processing === `${p.path}-force-pull` ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <AlertTriangle size={16} />
                                        )}
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handleAction(p.path, 'fetch')}
                                        disabled={!!processing || !!p.error}
                                        title="Fetch Status"
                                    >
                                        <RefreshCw size={16} className={clsx(processing === `${p.path}-fetch` && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                            {p.error && (
                                <div className="mt-3 text-sm text-error">
                                    {p.error}
                                </div>
                            )}
                        </div>
                    ))}

                    {projects.length === 0 && !loading && !error && (
                        <div className="p-12 text-center text-muted border border-white/10 rounded-lg">
                            <GitPullRequest size={48} className="mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium">No Git Projects Found</h3>
                            <p>No git repositories were found in /root/</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

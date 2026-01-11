'use client';
import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Download, RefreshCw, AlertTriangle, Loader2, GitPullRequest, Clock, Plus, X } from 'lucide-react';
import clsx from 'clsx';
// import { toast } from 'sonner';

interface GitProject {
    // ... (Keep existing interface)
    name: string;
    path: string;
    branch: string;
    isClean: boolean;
    ahead: number;
    behind: number;
    filesChanged: number;
    files: { path: string, index: string, working_dir: string }[];
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

    // Clone Modal State
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneUrl, setCloneUrl] = useState('');
    const [cloneFolder, setCloneFolder] = useState('');
    const [cloneLoading, setCloneLoading] = useState(false);

    // ... (Keep existing functions: fetchProjects, handleAction, handleFetchAll, formatDate)
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
        setLoading(true);

        try {
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

    const handleClone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cloneUrl) return;

        setCloneLoading(true);
        try {
            const res = await fetch('/api/git', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: cloneUrl, folderName: cloneFolder }),
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                alert('Repository cloned successfully!');
                setIsCloneModalOpen(false);
                setCloneUrl('');
                setCloneFolder('');
                fetchProjects();
            }
        } catch (e) {
            alert('Failed to clone repository');
        } finally {
            setCloneLoading(false);
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
                        onClick={() => setIsCloneModalOpen(true)}
                    >
                        <Plus size={18} className="mr-2" />
                        Clone New
                    </button>
                    <button
                        className="btn btn-sm btn-ghost border border-white/10"
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

            {/* Clone Modal */}
            {isCloneModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-base-100 border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsCloneModalOpen(false)}
                            className="absolute top-4 right-4 text-muted hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold mb-4">Clone Repository</h2>
                        <form onSubmit={handleClone}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Repository URL</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="https://github.com/username/repo.git"
                                        value={cloneUrl}
                                        onChange={(e) => setCloneUrl(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Folder Name (Optional)</label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        placeholder="Defaults to repo name"
                                        value={cloneFolder}
                                        onChange={(e) => setCloneFolder(e.target.value)}
                                    />
                                    <p className="text-xs text-muted mt-1">Will be cloned into /root/{cloneFolder || 'repo-name'}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setIsCloneModalOpen(false)}
                                    disabled={cloneLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={cloneLoading || !cloneUrl}
                                >
                                    {cloneLoading && <Loader2 size={16} className="animate-spin mr-2" />}
                                    Clone Repository
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

                                    {!p.isClean && (
                                        <div className="mt-3 bg-base-200/50 rounded p-3 text-xs overflow-y-auto max-h-[300px]">
                                            <p className="font-semibold text-warning mb-1">Modified Files:</p>
                                            <ul className="list-disc list-inside space-y-1 text-muted">
                                                {p.files?.slice(0, 100).map((f, i) => (
                                                    <li key={i} className="font-mono">
                                                        <span className={clsx(
                                                            f.index === '?' ? 'text-blue-400' : // Untracked
                                                                f.working_dir === 'M' ? 'text-yellow-400' : // Modified
                                                                    f.working_dir === 'D' ? 'text-red-400' : '' // Deleted
                                                        )}>
                                                            {f.index === '?' ? '??' : f.working_dir}
                                                        </span>{' '}
                                                        {f.path}
                                                    </li>
                                                ))}
                                                {p.files && p.files.length > 100 && (
                                                    <li className="list-none text-muted italic ml-4">
                                                        ...and {p.files.length - 100} more
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {p.lastCommit ? (
                                        <div className="bg-base-300/50 rounded p-3 text-sm mt-3">
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

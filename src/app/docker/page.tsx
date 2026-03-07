'use client';
import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, AlertTriangle, Loader2, Trash2, Download, Layers, Box, Wand2 } from 'lucide-react';
import clsx from 'clsx';
// import { toast } from 'sonner';

export default function DockerPage() {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const [activeTab, setActiveTab] = useState<'containers' | 'images'>('containers');

    // Container State
    const [containers, setContainers] = useState<any[]>([]);
    const [containersLoading, setContainersLoading] = useState(true);

    // Image State
    const [images, setImages] = useState<any[]>([]);
    const [imagesLoading, setImagesLoading] = useState(false);
    const [pullImageName, setPullImageName] = useState('');

    // Shared State
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
            setContainersLoading(false);
        }
    };

    const fetchImages = async () => {
        setImagesLoading(true);
        try {
            const res = await fetch('/api/docker/images');
            const data = await res.json();
            if (res.ok) {
                setImages(data);
                setError('');
            } else {
                setError(data.error || 'Failed to fetch images');
            }
        } catch (e) {
            setError('Failed to connect to API');
        } finally {
            setImagesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'containers') {
            fetchContainers();
            const interval = setInterval(fetchContainers, 3000);
            return () => clearInterval(interval);
        } else {
            fetchImages();
        }
    }, [activeTab]);

    const handleOpenInAI = async (container: any) => {
        const projectDir = container.Labels?.['com.docker.compose.project.working_dir'];
        if (!projectDir) {
            alert('This container does not appear to be part of a Docker Compose project with a known working directory.');
            return;
        }

        setProcessing(`${container.Id}-open-ai`);
        try {
            // Fetch current session first to avoid losing data
            const sessionRes = await fetch('/api/ai/session');
            const currentSession = await sessionRes.json();
            
            // Update only the currentPath
            await fetch('/api/ai/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...currentSession,
                    currentPath: projectDir 
                }),
            });
            
            // Redirect to AI page
            window.location.href = '/ai';
        } catch (e) {
            alert('Failed to open project in AI IDE');
        } finally {
            setProcessing(null);
        }
    };

    const handleContainerAction = async (id: string, action: string) => {
        setProcessing(`${id}-${action}`);
        try {
            const res = await fetch(`/api/docker/${id}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                fetchContainers();
            }
        } catch (e) {
            alert('Failed to send command');
        } finally {
            setProcessing(null);
        }
    };

    const handlePullImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pullImageName) return;

        setProcessing('pull-image');
        try {
            const res = await fetch('/api/docker/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: pullImageName }),
            });
            const data = await res.json();

            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                setPullImageName('');
                fetchImages();
                alert('Image pulled successfully');
            }
        } catch (e) {
            alert('Failed to pull image');
        } finally {
            setProcessing(null);
        }
    };

    const handleDeleteImage = async (id: string) => {
        if (!confirm('Are you sure you want to remove this image?')) return;

        setProcessing(`delete-${id}`);
        try {
            const res = await fetch(`/api/docker/images?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                fetchImages();
            }
        } catch (e) {
            alert('Failed to delete image');
        } finally {
            setProcessing(null);
        }
    };

    const handleRunImage = async (image: string) => {
        const name = prompt('Enter container name (optional):');
        setProcessing(`run-${image}`);
        try {
            const res = await fetch('/api/docker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image, name: name || undefined }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(`Error: ${data.error}`);
            } else {
                setActiveTab('containers');
                fetchContainers();
            }
        } catch (e) {
            alert('Failed to run image');
        } finally {
            setProcessing(null);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    if (containersLoading && activeTab === 'containers' && containers.length === 0) {
        return <div className="p-8">Loading Docker stats...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold neon-text">Docker Management</h1>

                <div className="join">
                    <button
                        className={clsx('join-item btn btn-sm', activeTab === 'containers' ? 'btn-primary' : 'btn-ghost')}
                        onClick={() => setActiveTab('containers')}
                    >
                        <Box size={16} className="mr-2" />
                        Containers
                    </button>
                    <button
                        className={clsx('join-item btn btn-sm', activeTab === 'images' ? 'btn-primary' : 'btn-ghost')}
                        onClick={() => setActiveTab('images')}
                    >
                        <Layers size={16} className="mr-2" />
                        Images
                    </button>
                </div>
                {activeTab === 'images' && (
                    <button className="btn btn-sm btn-ghost" onClick={fetchImages} disabled={imagesLoading}>
                        <RotateCw size={14} className={clsx(imagesLoading && 'animate-spin')} />
                        Refresh
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-4 border border-red-500 bg-red-900/20 text-red-200 rounded flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {activeTab === 'containers' && (
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
                                                        onClick={() => handleContainerAction(c.Id, 'start')}
                                                    >
                                                        {processing === `${c.Id}-start` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                    </button>
                                                )}
                                                {c.State === 'running' && (
                                                    <button
                                                        className="btn btn-danger p-2"
                                                        title="Stop"
                                                        disabled={!!processing}
                                                        onClick={() => handleContainerAction(c.Id, 'stop')}
                                                    >
                                                        {processing === `${c.Id}-stop` ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                                    </button>
                                                )}
                                                <button
                                                    className="btn p-2"
                                                    title="Restart"
                                                    disabled={!!processing}
                                                    onClick={() => handleContainerAction(c.Id, 'restart')}
                                                >
                                                    {processing === `${c.Id}-restart` ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                                                </button>
                                                {c.Labels?.['com.docker.compose.project.working_dir'] && (
                                                    <button
                                                        className="btn btn-ghost p-2 text-primary"
                                                        title="Open Project in AI IDE"
                                                        disabled={!!processing}
                                                        onClick={() => handleOpenInAI(c)}
                                                    >
                                                        {processing === `${c.Id}-open-ai` ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {containers.length === 0 && !containersLoading && !error && (
                        <div className="p-8 text-center text-muted">No containers found.</div>
                    )}
                </div>
            )}

            {activeTab === 'images' && (
                <div className="space-y-6">
                    <div className="card p-4">
                        <form onSubmit={handlePullImage} className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Image name (e.g., nginx:latest)"
                                className="input flex-1"
                                value={pullImageName}
                                onChange={(e) => setPullImageName(e.target.value)}
                                disabled={processing === 'pull-image'}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={!pullImageName || processing === 'pull-image'}
                            >
                                {processing === 'pull-image' ? (
                                    <Loader2 size={18} className="animate-spin mr-2" />
                                ) : (
                                    <Download size={18} className="mr-2" />
                                )}
                                Pull Image
                            </button>
                        </form>
                    </div>

                    <div className="card overflow-hidden">
                        {imagesLoading ? (
                            <div className="p-8 text-center">Loading images...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Tags</th>
                                            <th>Size</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {images.map((img) => (
                                            <tr key={img.Id} className="hover:bg-white/5 transition-colors">
                                                <td className="font-mono text-sm text-muted" title={img.Id}>
                                                    {img.Id.substring(7, 19)}
                                                </td>
                                                <td className="text-sm font-semibold">
                                                    {img.RepoTags ? (
                                                        img.RepoTags.map((tag: string) => (
                                                            <div key={tag} className="badge badge-outline mr-1 mb-1">{tag}</div>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted italic">&lt;none&gt;</span>
                                                    )}
                                                </td>
                                                <td className="text-sm font-mono">{formatBytes(img.Size)}</td>
                                                 <td className="text-sm text-muted">{formatTime(img.Created)}</td>
                                                 <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-primary p-2"
                                                            title="Run Container"
                                                            disabled={!!processing}
                                                            onClick={() => handleRunImage(img.RepoTags?.[0] || img.Id)}
                                                        >
                                                            {processing === `run-${img.RepoTags?.[0] || img.Id}` ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Play size={14} />
                                                            )}
                                                        </button>
                                                        <button
                                                            className="btn btn-danger p-2"
                                                            title="Delete Image"
                                                            disabled={!!processing}
                                                            onClick={() => handleDeleteImage(img.Id)}
                                                        >
                                                            {processing === `delete-${img.Id}` ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Trash2 size={14} />
                                                            )}
                                                        </button>
                                                    </div>
                                                 </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!imagesLoading && images.length === 0 && (
                            <div className="p-8 text-center text-muted">No images found.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

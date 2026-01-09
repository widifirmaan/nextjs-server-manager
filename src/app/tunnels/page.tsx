'use client';
import { useState, useEffect } from 'react';
import { Globe, Trash2, Plus, Save, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TunnelsPage() {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const [config, setConfig] = useState<any>(null);
    const [path, setPath] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Form state
    const [hostname, setHostname] = useState('');
    const [service, setService] = useState('http://localhost:');

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tunnels');
            const data = await res.json();
            if (res.ok) {
                setConfig(data.config);
                setPath(data.path);
                setError('');
            } else {
                setError(data.error || 'Failed to load configuration');
            }
        } catch (e) {
            setError('Failed to fetch config from API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tunnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', hostname, service })
            });
            if (res.ok) {
                setHostname('');
                setService('http://localhost:');
                fetchConfig();
            } else {
                alert('Failed to add rule');
            }
        } catch (e) { alert('Error sending request'); }
    };

    const handleDelete = async (hostname: string) => {
        if (!confirm(`Delete rule for ${hostname}?`)) return;
        try {
            const res = await fetch('/api/tunnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', hostname })
            });
            if (res.ok) fetchConfig();
        } catch (e) { }
    };

    if (loading) return <div className="p-8">Loading Tunnel Config...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 neon-text">Cloudflare Tunnels</h1>

            {error && (
                <div className="mb-6 p-4 border border-yellow-500 bg-yellow-900/10 text-yellow-200 rounded">
                    <h3 className="flex items-center gap-2 font-bold mb-2">
                        <AlertTriangle size={20} />
                        Managed Tunnel Detected
                    </h3>
                    <p className="mb-2">
                        It seems your Cloudflare Tunnel is running in <strong>Process Mode with Token</strong> (Remote Managed).
                    </p>
                    <p className="text-sm opacity-80 mb-4">
                        This means the configuration is managed centrally from the <a href="https://one.dash.cloudflare.com/" target="_blank" className="underline text-primary">Cloudflare Zero Trust Dashboard</a>, not from a local <code>config.yml</code> file.
                    </p>
                    <div className="bg-black/30 p-3 rounded font-mono text-xs">
                        To add new hostnames, please go to: <br />
                        Zero Trust Dashboard &gt; Access &gt; Tunnels &gt; Configure &gt; Public Hostname
                    </div>
                </div>
            )}

            {config && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="card">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Globe size={20} className="text-primary" />
                                    Ingress Rules
                                </h2>
                                <span className="text-xs text-muted font-mono">{path}</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Hostname</th>
                                            <th>Service</th>
                                            <th className="w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {config.ingress?.map((rule: any, i: number) => (
                                            <tr key={i} className="group">
                                                <td className="font-mono text-sm text-green-400">
                                                    {rule.hostname || <span className="text-muted italic">Catch-all</span>}
                                                </td>
                                                <td className="font-mono text-sm">{rule.service}</td>
                                                <td>
                                                    {rule.hostname && (
                                                        <button
                                                            onClick={() => handleDelete(rule.hostname)}
                                                            className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card bg-surface sticky top-6"
                        >
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Plus size={18} />
                                Add Ingress Rule
                            </h3>
                            <form onSubmit={handleAdd} className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs text-muted mb-1 block">Subdomain (Hostname)</label>
                                    <input
                                        className="input font-mono text-sm"
                                        placeholder="app.example.com"
                                        value={hostname}
                                        onChange={e => setHostname(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted mb-1 block">Local Service</label>
                                    <input
                                        className="input font-mono text-sm"
                                        placeholder="http://localhost:3000"
                                        value={service}
                                        onChange={e => setService(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary justify-center mt-2">
                                    <Save size={16} />
                                    Save Rule
                                </button>
                                <p className="text-xs text-muted mt-2">
                                    Note: You may need to restart the 'cloudflared' service for changes to take effect.
                                </p>
                            </form>
                        </motion.div>
                    </div>
                </div>
            )}
        </div>
    );
}

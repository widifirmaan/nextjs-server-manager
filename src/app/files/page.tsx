'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Folder, FileText, Trash2, Edit, Save,
    ChevronRight, Home, ArrowUp, Plus, RefreshCw,
    X, Copy, Scissors, Clipboard, FilePenLine,
    FileCode, AlertTriangle, Search, Loader2
} from 'lucide-react';
import clsx from 'clsx';

interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    mtime: string;
}

interface EditorTab {
    file: FileEntry;
    content: string;
    originalContent: string;
    modified: boolean;
    loading: boolean;
}

function getFileIcon(name: string, size = 16) {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'sh', 'bash', 'css', 'scss', 'html'].includes(ext))
        return <FileCode size={size} className="text-primary" />;
    if (['json', 'yaml', 'yml', 'toml', 'xml'].includes(ext))
        return <FileCode size={size} className="text-yellow-400" />;
    return <FileText size={size} className="text-muted" />;
}

function getLanguage(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript', jsx: 'JavaScript React',
        py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', rb: 'Ruby', php: 'PHP',
        css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON', yaml: 'YAML', yml: 'YAML',
        md: 'Markdown', txt: 'Plain Text', sh: 'Shell', bash: 'Bash',
        xml: 'XML', sql: 'SQL', toml: 'TOML', env: 'Environment',
    };
    return map[ext] || 'Plain Text';
}

export default function FileManagerPage() {
    const [currentPath, setCurrentPath] = useState('/root');
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Tab state
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState(-1);

    // Modal State
    const [modalOpen, setModalOpen] = useState<'create-folder' | 'create-file' | 'rename' | null>(null);
    const [modalInput, setModalInput] = useState('');
    const [activeItem, setActiveItem] = useState<FileEntry | null>(null);

    // Clipboard State
    const [clipboard, setClipboard] = useState<{ path: string, op: 'copy' | 'move' } | null>(null);

    const fetchFiles = async (path: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (res.ok) {
                setFiles(data.files);
                setCurrentPath(data.path);
                setError('');
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to fetch files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFiles(currentPath); }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (activeTabIndex >= 0 && tabs[activeTabIndex]?.modified) {
                    saveTab(activeTabIndex);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (activeTabIndex >= 0) closeTab(activeTabIndex);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [activeTabIndex, tabs]);

    const handleNavigate = (path: string) => fetchFiles(path);

    const handleUp = () => {
        if (currentPath === '/') return;
        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
        handleNavigate(parentPath);
    };

    const openFile = async (file: FileEntry) => {
        const existingIndex = tabs.findIndex(t => t.file.path === file.path);
        if (existingIndex >= 0) {
            setActiveTabIndex(existingIndex);
            return;
        }

        const newTab: EditorTab = { file, content: '', originalContent: '', modified: false, loading: true };
        const newTabs = [...tabs, newTab];
        setTabs(newTabs);
        setActiveTabIndex(newTabs.length - 1);

        try {
            const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
            const data = await res.json();
            if (res.ok) {
                setTabs(prev => prev.map(t =>
                    t.file.path === file.path
                        ? { ...t, content: data.content, originalContent: data.content, loading: false }
                        : t
                ));
            } else {
                setTabs(prev => prev.filter(t => t.file.path !== file.path));
                setActiveTabIndex(prev => Math.max(prev - 1, tabs.length > 1 ? 0 : -1));
                alert('Cannot read file');
            }
        } catch (e) {
            setTabs(prev => prev.filter(t => t.file.path !== file.path));
            alert('Error reading file');
        }
    };

    const closeTab = (index: number) => {
        const tab = tabs[index];
        if (tab.modified && !confirm(`"${tab.file.name}" has unsaved changes. Close anyway?`)) return;
        const newTabs = tabs.filter((_, i) => i !== index);
        setTabs(newTabs);
        if (newTabs.length === 0) setActiveTabIndex(-1);
        else if (activeTabIndex >= newTabs.length) setActiveTabIndex(newTabs.length - 1);
        else if (activeTabIndex === index) setActiveTabIndex(Math.min(index, newTabs.length - 1));
        else if (activeTabIndex > index) setActiveTabIndex(activeTabIndex - 1);
    };

    const updateTabContent = (index: number, content: string) => {
        setTabs(prev => prev.map((t, i) =>
            i === index ? { ...t, content, modified: content !== t.originalContent } : t
        ));
    };

    const saveTab = async (index: number) => {
        const tab = tabs[index];
        if (!tab) return;
        setTabs(prev => prev.map((t, i) => i === index ? { ...t, loading: true } : t));
        try {
            const res = await fetch('/api/files/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: tab.file.path, content: tab.content }),
            });
            if (res.ok) {
                setTabs(prev => prev.map((t, i) =>
                    i === index ? { ...t, modified: false, originalContent: t.content, loading: false } : t
                ));
                fetchFiles(currentPath);
            } else {
                const data = await res.json();
                alert('Error saving: ' + data.error);
                setTabs(prev => prev.map((t, i) => i === index ? { ...t, loading: false } : t));
            }
        } catch (e) {
            alert('Failed to save');
            setTabs(prev => prev.map((t, i) => i === index ? { ...t, loading: false } : t));
        }
    };

    const handleItemClick = (file: FileEntry) => {
        if (file.isDirectory) handleNavigate(file.path);
        else openFile(file);
    };

    const performAction = async (action: string, path: string, newPath?: string) => {
        try {
            const res = await fetch('/api/files/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, path, newPath }),
            });
            if (res.ok) { fetchFiles(currentPath); return true; }
            else { const data = await res.json(); alert(data.error); return false; }
        } catch (e) { alert('Action failed'); return false; }
    };

    const handleDelete = async (file: FileEntry) => {
        if (!confirm(`Delete "${file.name}"?`)) return;
        const success = await performAction('delete', file.path);
        if (success) {
            const tabIndex = tabs.findIndex(t => t.file.path === file.path);
            if (tabIndex >= 0) {
                const newTabs = tabs.filter((_, i) => i !== tabIndex);
                setTabs(newTabs);
                if (activeTabIndex >= newTabs.length) setActiveTabIndex(newTabs.length - 1);
            }
        }
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        const fileName = clipboard.path.split('/').pop();
        if (!fileName) return;
        const targetPath = currentPath.endsWith('/') ? currentPath + fileName : currentPath + '/' + fileName;
        const success = await performAction(clipboard.op, clipboard.path, targetPath);
        if (success && clipboard.op === 'move') setClipboard(null);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalInput) return;
        if (modalOpen === 'create-folder') await performAction('create-dir', currentPath + '/' + modalInput);
        else if (modalOpen === 'create-file') await performAction('create-file', currentPath + '/' + modalInput);
        else if (modalOpen === 'rename' && activeItem) await performAction('rename', activeItem.path, currentPath + '/' + modalInput);
        setModalOpen(null);
        setModalInput('');
        setActiveItem(null);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const sortedFiles = [...files]
        .sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

    const activeTab = activeTabIndex >= 0 ? tabs[activeTabIndex] : null;

    return (
        <div>
            {/* Header - same style as Docker */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h1 className="text-2xl font-bold neon-text">File Manager</h1>

                <div className="flex gap-2 flex-wrap">
                    {clipboard && (
                        <button className="btn btn-sm" onClick={handlePaste} title={`Paste ${clipboard.op}: ${clipboard.path.split('/').pop()}`}>
                            <Clipboard size={16} className="mr-2" /> Paste ({clipboard.op})
                        </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => { setModalOpen('create-file'); setModalInput(''); }}>
                        <Plus size={16} className="mr-2" /> New File
                    </button>
                    <button className="btn btn-sm" onClick={() => { setModalOpen('create-folder'); setModalInput(''); }}>
                        <Plus size={16} className="mr-2" /> New Folder
                    </button>
                    <button className="btn btn-sm" onClick={() => fetchFiles(currentPath)}>
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
                <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <button onClick={() => handleNavigate('/root')} className="btn btn-sm p-1" title="Home">
                        <Home size={16} />
                    </button>
                    {currentPath !== '/' && (
                        <button onClick={handleUp} className="btn btn-sm p-1" title="Go Up">
                            <ArrowUp size={16} />
                        </button>
                    )}
                    <div className="flex items-center font-mono text-sm text-muted whitespace-nowrap ml-2">
                        {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                            <span key={i} className="flex items-center">
                                <ChevronRight size={14} className="mx-1 opacity-50" />
                                <span
                                    className="hover:text-primary cursor-pointer transition-colors"
                                    onClick={() => handleNavigate('/' + arr.slice(0, i + 1).join('/'))}
                                >
                                    {part}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-4 border border-red-500 bg-red-900/20 text-red-200 rounded flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {/* File Table - same card+table style as Docker */}
            <div className="card overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Name</th>
                                <th className="text-right" style={{ width: '100px' }}>Size</th>
                                <th className="text-right" style={{ width: '180px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentPath !== '/' && (
                                <tr className="hover:bg-white/5 transition-colors cursor-pointer" onClick={handleUp}>
                                    <td><ArrowUp size={16} className="text-muted" /></td>
                                    <td className="text-muted">..</td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            )}
                            {loading && files.length === 0 ? (
                                <tr><td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>Loading...</td></tr>
                            ) : (
                                sortedFiles.map((file) => (
                                    <tr key={file.path} className="hover:bg-white/5 transition-colors group">
                                        <td className="text-center">
                                            {file.isDirectory
                                                ? <Folder size={18} className="text-yellow-400" />
                                                : getFileIcon(file.name, 18)
                                            }
                                        </td>
                                        <td
                                            className="cursor-pointer font-medium"
                                            onClick={() => handleItemClick(file)}
                                        >
                                            {file.name}
                                        </td>
                                        <td className="text-right font-mono text-sm text-muted">
                                            {file.isDirectory ? '-' : formatSize(file.size)}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!file.isDirectory && (
                                                    <button className="btn p-1" title="Edit" onClick={(e) => { e.stopPropagation(); openFile(file); }}>
                                                        <FilePenLine size={14} />
                                                    </button>
                                                )}
                                                <button className="btn p-1" title="Rename" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveItem(file); setModalInput(file.name); setModalOpen('rename');
                                                }}>
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn p-1" title="Copy" onClick={(e) => { e.stopPropagation(); setClipboard({ path: file.path, op: 'copy' }); }}>
                                                    <Copy size={14} />
                                                </button>
                                                <button className="btn p-1" title="Cut" onClick={(e) => { e.stopPropagation(); setClipboard({ path: file.path, op: 'move' }); }}>
                                                    <Scissors size={14} />
                                                </button>
                                                <button className="btn btn-danger p-1" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(file); }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && files.length === 0 && (
                    <div className="p-8 text-center text-muted">
                        <Folder size={48} className="mx-auto mb-2 opacity-20" />
                        Empty directory
                    </div>
                )}
            </div>

            {/* Editor Section - Tabs + Editor */}
            {tabs.length > 0 && (
                <div className="card overflow-hidden">
                    {/* Tab Bar */}
                    <div className="flex items-center border-b border-[var(--border)] overflow-x-auto" style={{ scrollbarWidth: 'none', background: 'rgba(255,255,255,0.02)' }}>
                        {tabs.map((tab, i) => (
                            <div
                                key={tab.file.path}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r border-[var(--border)] transition-colors text-sm whitespace-nowrap",
                                    i === activeTabIndex
                                        ? "bg-[var(--surface)] text-[var(--text-primary)] border-b-2 border-b-[var(--primary)]"
                                        : "text-muted hover:bg-white/5"
                                )}
                                onClick={() => setActiveTabIndex(i)}
                            >
                                {getFileIcon(tab.file.name, 14)}
                                <span>{tab.file.name}</span>
                                {tab.modified && (
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0" title="Unsaved" />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeTab(i); }}
                                    className="ml-1 p-0.5 rounded hover:bg-white/10 opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Editor toolbar */}
                    {activeTab && (
                        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2 text-sm text-muted font-mono truncate">
                                {activeTab.file.path}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="badge badge-success text-xs">{getLanguage(activeTab.file.name)}</span>
                                {activeTab.modified && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => saveTab(activeTabIndex)}
                                        disabled={activeTab.loading}
                                    >
                                        {activeTab.loading
                                            ? <Loader2 size={14} className="animate-spin mr-1" />
                                            : <Save size={14} className="mr-1" />
                                        }
                                        Save
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Editor Content */}
                    {activeTab && (
                        activeTab.loading && !activeTab.content ? (
                            <div className="p-8 text-center text-muted">
                                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                Loading file...
                            </div>
                        ) : (
                            <div className="flex" style={{ maxHeight: '60vh' }}>
                                {/* Line numbers */}
                                <div
                                    className="text-right text-muted font-mono text-xs select-none border-r border-[var(--border)] overflow-hidden py-4 px-2 flex-shrink-0"
                                    style={{ minWidth: '48px', background: 'rgba(0,0,0,0.2)', lineHeight: '1.65' }}
                                >
                                    {(activeTab.content || '').split('\n').map((_, i) => (
                                        <div key={i}>{i + 1}</div>
                                    ))}
                                </div>

                                {/* Textarea */}
                                <textarea
                                    className="flex-1 bg-transparent text-[var(--text-primary)] p-4 font-mono text-sm resize-none focus:outline-none overflow-auto"
                                    value={activeTab.content}
                                    onChange={e => updateTabContent(activeTabIndex, e.target.value)}
                                    spellCheck={false}
                                    style={{ lineHeight: '1.65', tabSize: 4, minHeight: '300px' }}
                                />
                            </div>
                        )
                    )}

                    {/* Status bar */}
                    {activeTab && !activeTab.loading && (
                        <div className="flex items-center justify-between px-4 py-1.5 border-t border-[var(--border)] text-xs text-muted" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <span>{(activeTab.content || '').split('\n').length} lines</span>
                            <div className="flex items-center gap-4">
                                <span>{formatSize(activeTab.file.size)}</span>
                                <span>Ctrl+S to save</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Input Modal (Create/Rename) */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                        <button
                            onClick={() => { setModalOpen(null); setModalInput(''); setActiveItem(null); }}
                            className="absolute top-4 right-4 text-muted hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold mb-4 capitalize">
                            {modalOpen.replace('-', ' ')}
                        </h3>

                        <form onSubmit={handleModalSubmit}>
                            <input
                                type="text"
                                className="input w-full mb-4"
                                placeholder="Enter name..."
                                value={modalInput}
                                onChange={(e) => setModalInput(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" className="btn btn-sm" onClick={() => { setModalOpen(null); setModalInput(''); setActiveItem(null); }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm">
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

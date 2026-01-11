'use client';
import { useState, useEffect } from 'react';
import {
    Folder, File, FileText, MoreVertical, Trash, Edit, Save,
    Move, ChevronRight, Home, ArrowUp, Plus, RefreshCw,
    Loader2, AlertTriangle, X, Check, Code, Scissors, Copy, Clipboard, FilePenLine
} from 'lucide-react';
import clsx from 'clsx';
// import { toast } from 'sonner';

interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    mtime: string;
}

export default function FileManagerPage() {
    const [currentPath, setCurrentPath] = useState('/root');
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [currentFile, setCurrentFile] = useState<FileEntry | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState<'create-folder' | 'create-file' | 'rename' | null>(null);
    const [modalInput, setModalInput] = useState('');
    const [activeItem, setActiveItem] = useState<FileEntry | null>(null);

    // Clipboard State
    const [clipboard, setClipboard] = useState<{ path: string, op: 'copy' | 'move' } | null>(null);

    const fetchFiles = async (path: string) => {
        setLoading(true);
        try {
            // Encode path properly
            const encodedPath = encodeURIComponent(path);
            const res = await fetch(`/api/files/list?path=${encodedPath}`);
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

    useEffect(() => {
        fetchFiles(currentPath);
    }, []);

    const handleNavigate = (path: string) => {
        fetchFiles(path);
    };

    const handleUp = () => {
        if (currentPath === '/') return;
        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
        handleNavigate(parentPath);
    };

    const handleItemClick = (file: FileEntry) => {
        if (file.isDirectory) {
            handleNavigate(file.path);
        } else {
            // Open editor
            openEditor(file);
        }
    };

    const openEditor = async (file: FileEntry) => {
        setCurrentFile(file);
        setEditorOpen(true);
        setLoading(true);
        try {
            const res = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
            const data = await res.json();
            if (res.ok) {
                setFileContent(data.content);
            } else {
                alert('Cannot read file');
                setEditorOpen(false);
            }
        } catch (e) {
            alert('Error reading file');
            setEditorOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const saveFile = async () => {
        if (!currentFile) return;
        setSaving(true);
        try {
            const res = await fetch('/api/files/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFile.path, content: fileContent }),
            });
            if (res.ok) {
                alert('File Saved');
                setEditorOpen(false);
                fetchFiles(currentPath);
            } else {
                const data = await res.json();
                alert('Error saving:' + data.error);
            }
        } catch (e) {
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const performAction = async (action: string, path: string, newPath?: string) => {
        try {
            const res = await fetch('/api/files/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, path, newPath }),
            });
            if (res.ok) {
                fetchFiles(currentPath);
                return true;
            } else {
                const data = await res.json();
                alert(data.error);
                return false;
            }
        } catch (e) {
            alert('Action failed');
            return false;
        }
    };

    const handleDelete = async (file: FileEntry) => {
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
            await performAction('delete', file.path);
        }
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        const fileName = clipboard.path.split('/').pop();
        if (!fileName) return;

        const targetPath = currentPath.endsWith('/')
            ? currentPath + fileName
            : currentPath + '/' + fileName;

        const success = await performAction(clipboard.op, clipboard.path, targetPath);
        if (success) {
            if (clipboard.op === 'move') setClipboard(null);
            alert('Paste successful');
        }
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalInput) return;

        // Handle logic
        if (modalOpen === 'create-folder') {
            const fullPath = currentPath + '/' + modalInput;
            await performAction('create-dir', fullPath);
        } else if (modalOpen === 'create-file') {
            const fullPath = currentPath + '/' + modalInput;
            await performAction('create-file', fullPath);
        } else if (modalOpen === 'rename' && activeItem) {
            const newPath = currentPath + '/' + modalInput;
            await performAction('rename', activeItem.path, newPath);
        }

        setModalOpen(null);
        setModalInput('');
        setActiveItem(null);
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 overflow-hidden">
                    <button onClick={() => handleNavigate('/root')} className="btn btn-ghost btn-sm btn-square">
                        <Home size={18} />
                    </button>
                    <div className="flex items-center text-sm font-mono text-muted/80 whitespace-nowrap overflow-x-auto no-scrollbar">
                        {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                            <div key={i} className="flex items-center">
                                <ChevronRight size={14} className="mx-1 opacity-50" />
                                <span
                                    className="hover:text-primary cursor-pointer"
                                    onClick={() => {
                                        const p = '/' + arr.slice(0, i + 1).join('/');
                                        handleNavigate(p);
                                    }}
                                >
                                    {part}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    {clipboard && (
                        <button
                            className="btn btn-warning btn-sm animate-pulse"
                            onClick={handlePaste}
                            title={`Paste ${clipboard.op}: ${clipboard.path.split('/').pop()}`}
                        >
                            <Clipboard size={16} className="mr-2" /> Paste
                        </button>
                    )}
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setModalOpen('create-file'); setModalInput(''); }}
                    >
                        <Plus size={16} className="mr-2" /> File
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setModalOpen('create-folder'); setModalInput(''); }}
                    >
                        <Plus size={16} className="mr-2" /> Folder
                    </button>
                    <button onClick={() => fetchFiles(currentPath)} className="btn btn-ghost btn-sm btn-square">
                        <RefreshCw size={18} className={clsx(loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {error ? (
                <div className="alert alert-error">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            ) : (
                <div className="bg-base-200/30 rounded-lg border border-white/5 flex-1 overflow-auto">
                    {/* Up Button */}
                    {currentPath !== '/' && (
                        <div
                            className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 text-muted"
                            onClick={handleUp}
                        >
                            <ArrowUp size={20} />
                            <span>..</span>
                        </div>
                    )}

                    {/* Files List */}
                    {loading && files.length === 0 ? (
                        <div className="p-8 text-center text-muted">Loading...</div>
                    ) : (
                        <div>
                            {files.map((file) => (
                                <div
                                    key={file.path}
                                    className="group flex items-center justify-between p-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                                >
                                    <div
                                        className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                                        onClick={() => handleItemClick(file)}
                                    >
                                        {file.isDirectory ? (
                                            <Folder size={20} className="text-yellow-400 shrink-0" />
                                        ) : (
                                            <FileText size={20} className="text-blue-400 shrink-0" />
                                        )}
                                        <span className="truncate">{file.name}</span>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm text-muted">
                                        <span className="w-20 text-right font-mono text-xs hidden sm:block">
                                            {file.isDirectory ? '-' : formatSize(file.size)}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!file.isDirectory && (
                                                <button
                                                    className="btn btn-ghost btn-xs btn-square"
                                                    title="Edit Content"
                                                    onClick={(e) => { e.stopPropagation(); openEditor(file); }}
                                                >
                                                    <FilePenLine size={14} />
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Rename"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveItem(file);
                                                    setModalInput(file.name);
                                                    setModalOpen('rename');
                                                }}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Copy"
                                                onClick={(e) => { e.stopPropagation(); setClipboard({ path: file.path, op: 'copy' }); }}
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="Cut (Move)"
                                                onClick={(e) => { e.stopPropagation(); setClipboard({ path: file.path, op: 'move' }); }}
                                            >
                                                <Scissors size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs btn-square text-error"
                                                title="Delete"
                                                onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {files.length === 0 && (
                                <div className="p-8 text-center text-muted italic">Empty directory</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* File Editor Modal */}
            {editorOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-base-100 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-base-200">
                        <div className="flex items-center gap-2">
                            <FileText size={20} className="text-primary" />
                            <span className="font-mono font-bold">{currentFile?.name}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={saveFile}
                                disabled={saving}
                            >
                                <Save size={16} className="mr-2" />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setEditorOpen(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="flex-1 w-full bg-[#1e1e1e] text-white p-4 font-mono text-sm resize-none focus:outline-none"
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        autoFocus
                        spellCheck={false}
                    />
                </div>
            )}

            {/* Input Modal (Create/Rename) */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-base-100 border border-white/10 rounded-lg shadow-xl w-full max-w-sm p-6 relative">
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
                                <button type="submit" className="btn btn-primary">
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

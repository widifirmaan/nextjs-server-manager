'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, Send, Loader2, Trash2, ChevronRight, ChevronDown, Folder, File, FolderOpen, PanelLeftClose, PanelLeft, X, Save, FileCode, Copy, Scissors, Clipboard, Edit, Wand2, FilePlus, FolderPlus, FileJson, Files, FileImage, FileText, Braces, FileTerminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─── */
interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
}

interface TreeNode extends FileEntry {
    children?: TreeNode[];
    isLoading?: boolean;
    isOpen?: boolean;
}

interface EditorTab {
    id: string;
    name: string;
    path: string;
    content: string;
    isModified: boolean;
}

const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
        case 'jsx':
            return <FileCode size={16} />;
        case 'ts':
        case 'tsx':
            return <FileCode size={16} />;
        case 'json':
            return <FileJson size={16} />;
        case 'css':
        case 'scss':
            return <Files size={16} />;
        case 'md':
            return <FileText size={16} />;
        case 'html':
            return <FileCode size={16} />;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
            return <FileImage size={16} />;
        case 'py':
            return <Braces size={16} />;
        case 'sh':
            return <FileTerminal size={16} />;
        default:
            return <File size={16} />;
    }
};

/* ─── File Tree Item ─── */
function FileTreeItem({ node, depth, onToggle, onSelect, activePath, onContextMenu, renamingNode, setRenamingNode, handleAction }: {
    node: TreeNode;
    depth: number;
    onToggle: (node: TreeNode) => void;
    onSelect: (node: TreeNode) => void;
    activePath: string;
    onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
    renamingNode: TreeNode | null;
    setRenamingNode: (node: TreeNode | null) => void;
    handleAction: (action: string, node: TreeNode, extra?: any) => void;
}) {
    const isActive = node.path === activePath;

    return (
        <>
            <div
                className={`file-tree-item ${isActive ? 'selected' : ''}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => {
                    if (node.isDirectory) {
                        onToggle(node);
                    } else {
                        onSelect(node);
                    }
                }}
                onContextMenu={(e) => onContextMenu(e, node)}
            >
                <span className="file-tree-arrow">
                    {node.isDirectory ? (
                        node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : null}
                </span>
                <span className="file-tree-icon">
                    {node.isDirectory
                        ? (node.isOpen ? <FolderOpen size={16} /> : <Folder size={16} />)
                        : getFileIcon(node.name)
                    }
                </span>
                <span className="file-tree-name">
                    {renamingNode?.path === node.path ? (
                        <input
                            autoFocus
                            className="rename-input"
                            defaultValue={node.name}
                            onBlur={(e) => {
                                if (e.target.value !== node.name) handleAction('rename', node, e.target.value);
                                else setRenamingNode(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAction('rename', node, e.currentTarget.value);
                                if (e.key === 'Escape') setRenamingNode(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : node.name}
                </span>
                {node.isLoading && <Loader2 size={12} className="animate-spin" style={{ marginLeft: 'auto', color: 'var(--primary)', flexShrink: 0 }} />}
            </div>
            {node.isDirectory && node.isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            activePath={activePath}
                            onContextMenu={onContextMenu}
                            renamingNode={renamingNode}
                            setRenamingNode={setRenamingNode}
                            handleAction={handleAction}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

/* ─── Main Page ─── */
export default function AIPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fileTree, setFileTree] = useState<TreeNode[]>([]);
    const [showPanel, setShowPanel] = useState(true);
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [explorerWidth, setExplorerWidth] = useState(260);
    const [chatWidth, setChatWidth] = useState(320);
    const [isResizing, setIsResizing] = useState<null | 'explorer' | 'chat'>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);
    const [clipboard, setClipboard] = useState<{ type: 'copy' | 'cut'; node: TreeNode } | null>(null);
    const [renamingNode, setRenamingNode] = useState<TreeNode | null>(null);
    const [newName, setNewName] = useState('');
    const [currentPath, setCurrentPath] = useState<string>('');
    const [modalType, setModalType] = useState<'open' | 'create' | null>(null);
    const [modalInput, setModalInput] = useState('');
    const [modalSuggestions, setModalSuggestions] = useState<string[]>([]);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);
    const [isSessionLoaded, setIsSessionLoaded] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const activeTab = tabs.find(t => t.id === activeTabId) || null;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            if (isResizing === 'explorer') {
                setExplorerWidth(Math.max(150, Math.min(500, e.clientX)));
            } else if (isResizing === 'chat') {
                setChatWidth(Math.max(200, Math.min(600, window.innerWidth - e.clientX)));
            }
        };
        const handleMouseUp = () => setIsResizing(null);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.cursor = 'default';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    /* close context menu on click outside */
    useEffect(() => {
        const hide = () => setContextMenu(null);
        window.addEventListener('click', hide);
        return () => window.removeEventListener('click', hide);
    }, []);

    /* scroll chat */
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    /* load root */
    const fetchDir = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
        try {
            const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`);
            const data = await res.json();
            if (!res.ok) return [];
            return (data.files || []).map((f: FileEntry) => ({
                ...f,
                children: f.isDirectory ? undefined : undefined,
                isOpen: false,
                isLoading: false,
            }));
        } catch {
            return [];
        }
    }, []);

    // Load session from DB on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const res = await fetch('/api/ai/session');
                const data = await res.json();
                if (data && !data.error) {
                    if (data.currentPath) setCurrentPath(data.currentPath);
                    if (data.tabs && Array.isArray(data.tabs)) setTabs(data.tabs);
                    if (data.activeTabId) setActiveTabId(data.activeTabId);
                }
            } catch (e) {
                console.error("Failed to load session:", e);
                setCurrentPath('/home');
            } finally {
                setIsSessionLoaded(true);
            }
        };
        loadSession();
    }, []);

    // Save session to DB whenever it changes (debounced)
    useEffect(() => {
        if (!isSessionLoaded) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await fetch('/api/ai/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tabs, activeTabId, currentPath }),
                });
            } catch (e) {
                console.error("Failed to save session:", e);
            }
        }, 1000); // 1s debounce

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [tabs, activeTabId, currentPath, isSessionLoaded]);

    useEffect(() => {
        if (currentPath) {
            fetchDir(currentPath).then(setFileTree);
        } else {
            setFileTree([]);
        }
    }, [fetchDir, currentPath]);

    /* toggle folder */
    const toggleFolder = useCallback(async (target: TreeNode) => {
        const updateTree = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((n) => {
                if (n.path === target.path) {
                    if (n.isOpen) return { ...n, isOpen: false };
                    return { ...n, isOpen: true, isLoading: true };
                }
                if (n.children) return { ...n, children: updateTree(n.children) };
                return n;
            });

        setFileTree((prev) => updateTree(prev));

        if (!target.isOpen) {
            const children = await fetchDir(target.path);
            setFileTree((prev) => {
                const fill = (nodes: TreeNode[]): TreeNode[] =>
                    nodes.map((n) => {
                        if (n.path === target.path) return { ...n, children, isLoading: false };
                        if (n.children) return { ...n, children: fill(n.children) };
                        return n;
                    });
                return fill(prev);
            });
        }
    }, [fetchDir]);

    const handleEditorScroll = () => {
        if (editorRef.current && gutterRef.current) {
            gutterRef.current.scrollTop = editorRef.current.scrollTop;
        }
    };

    useEffect(() => {
        if (!modalType) return;
        
        let isCancelled = false;
        const fetchSuggestions = async () => {
            if (!modalInput.startsWith('/')) {
                setModalSuggestions([]);
                return;
            }

            const lastSlash = modalInput.lastIndexOf('/');
            const dir = modalInput.substring(0, lastSlash) || '/';
            const search = modalInput.substring(lastSlash + 1).toLowerCase();

            try {
                const res = await fetch(`/api/files/list?path=${encodeURIComponent(dir)}`);
                if (!res.ok || isCancelled) {
                    if (!isCancelled) setModalSuggestions([]);
                    return;
                }
                const data = await res.json();
                const directories = (data.files || [])
                    .filter((f: any) => f.isDirectory)
                    .map((f: any) => f.name)
                    .filter((name: string) => name.toLowerCase().startsWith(search))
                    .sort();
                
                if (!isCancelled) {
                    setModalSuggestions(directories);
                    setActiveSuggestionIndex(0);
                }
            } catch {
                if (!isCancelled) setModalSuggestions([]);
            }
        };

        const timeout = setTimeout(fetchSuggestions, 150);
        return () => {
            isCancelled = true;
            clearTimeout(timeout);
        };
    }, [modalInput, modalType]);

    const openModal = (type: 'open' | 'create') => {
        setModalType(type);
        setModalInput(currentPath || '/home');
        setModalSuggestions([]);
        setActiveSuggestionIndex(0);
    };

    const handleOpenFolder = () => openModal('open');
    const handleCreateProject = () => openModal('create');

    const submitModal = async () => {
        if (!modalInput) return;
        
        if (modalType === 'open') {
            setCurrentPath(modalInput);
            setTabs([]);
            setActiveTabId(null);
            setModalType(null);
        } else if (modalType === 'create') {
            try {
                const res = await fetch('/api/files/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create-dir', path: modalInput }),
                });
                if (res.ok) {
                    setCurrentPath(modalInput);
                    setTabs([]);
                    setActiveTabId(null);
                    setModalType(null);
                } else {
                    const data = await res.json();
                    alert(`Error: ${data.error}`);
                }
            } catch (e: any) {
                alert(`Error: ${e.message}`);
            }
        }
    };

    const handleModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => Math.min(prev + 1, Math.max(0, modalSuggestions.length - 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (modalSuggestions.length > 0 && modalSuggestions[activeSuggestionIndex]) {
                const lastSlash = modalInput.lastIndexOf('/');
                const dir = modalInput.substring(0, lastSlash) || '/';
                const newPath = (dir === '/' ? '/' : dir + '/') + modalSuggestions[activeSuggestionIndex] + '/';
                setModalInput(newPath);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (modalSuggestions.length > 0 && modalSuggestions[activeSuggestionIndex]) {
                const search = modalInput.substring(modalInput.lastIndexOf('/') + 1).toLowerCase();
                const suggestion = modalSuggestions[activeSuggestionIndex].toLowerCase();
                if (suggestion !== search && !modalInput.endsWith('/')) {
                    const lastSlash = modalInput.lastIndexOf('/');
                    const dir = modalInput.substring(0, lastSlash) || '/';
                    const newPath = (dir === '/' ? '/' : dir + '/') + modalSuggestions[activeSuggestionIndex] + '/';
                    setModalInput(newPath);
                    return;
                }
            }
            submitModal();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setModalType(null);
        }
    };

    /* open tab */
    const openFile = useCallback(async (node: TreeNode) => {
        const existingTab = tabs.find(t => t.path === node.path);
        if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
        }

        try {
            const res = await fetch(`/api/files/content?path=${encodeURIComponent(node.path)}`);
            const data = await res.json();
            if (res.ok) {
                const newTab: EditorTab = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: node.name,
                    path: node.path,
                    content: data.content || '',
                    isModified: false
                };
                setTabs(prev => [...prev, newTab]);
                setActiveTabId(newTab.id);
            }
        } catch (e: any) {
            console.error('Failed to open file:', e);
        }
    }, [tabs]);

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== id);
        setTabs(newTabs);
        if (activeTabId === id) {
            setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
    };

    const updateActiveTabContent = (content: string) => {
        if (!activeTabId) return;
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content, isModified: true } : t));
    };

    const saveActiveTab = async () => {
        if (!activeTab) return;
        try {
            const res = await fetch('/api/files/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
            });
            if (res.ok) {
                setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isModified: false } : t));
            }
        } catch (e) {
            console.error('Failed to save file:', e);
        }
    };

    /* chat submit */
    const handleSubmit = async (e: React.FormEvent, overrideMsg?: string) => {
        e.preventDefault();
        const userMsg = overrideMsg || input.trim();
        if (!userMsg) return;

        if (!overrideMsg) setInput('');
        setIsLoading(true);
        const newMessages: { role: 'user' | 'assistant', content: string }[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);

        // Add a placeholder for the assistant's response
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        const fileContent = activeTab ? activeTab.content : undefined;
        const fileName = activeTab ? activeTab.name : undefined;

        // Generate project structure context
        const getProjectStructureText = (nodes: TreeNode[], depth = 0): string => {
            return nodes.map(node => {
                const indent = '  '.repeat(depth);
                const prefix = node.isDirectory ? '📁 ' : '📄 ';
                let line = `${indent}${prefix}${node.name}`;
                if (node.isDirectory && node.children) {
                    line += '\n' + getProjectStructureText(node.children, depth + 1);
                }
                return line;
            }).join('\n');
        };

        const projectStructure = getProjectStructureText(fileTree);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    fileContent,
                    fileName,
                    currentPath,
                    projectStructure
                }),
            });

            if (!res.body) {
                throw new Error("No response body");
            }
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: true });
                
                setMessages(prev => 
                    prev.map((msg, i) => 
                        i === prev.length - 1 ? { ...msg, content: msg.content + chunk } : msg
                    )
                );
            }

        } catch (error: any) {
            setMessages(prev => 
                prev.map((msg, i) => 
                    i === prev.length - 1 ? { ...msg, content: `Error: ${error.message}` } : msg
                )
            );
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
        e.preventDefault();
        setContextMenu({ x: e.pageX, y: e.pageY, node });
    };

    const handleAction = async (action: string, node: TreeNode, extra?: any) => {
        setContextMenu(null);
        try {
            let body: any = { action, path: node.path };
            
            if (action === 'rename') {
                const newPath = node.path.split('/').slice(0, -1).join('/') + '/' + extra;
                body.newPath = newPath;
            } else if (action === 'paste' && clipboard) {
                const destPath = node.isDirectory ? node.path : node.path.split('/').slice(0, -1).join('/');
                const fileName = clipboard.node.path.split('/').pop();
                const newPath = `${destPath}/${fileName}`;
                
                body = { 
                    action: clipboard.type === 'cut' ? 'move' : 'copy', 
                    path: clipboard.node.path, 
                    newPath 
                };
            } else if (action === 'create-file' || action === 'create-dir') {
                body.path = node.path.endsWith('/') ? `${node.path}${extra}` : `${node.path}/${extra}`;
                if (action === 'create-file') {
                    // We'll use the API's create-file logic
                }
            }

            const res = await fetch('/api/files/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                // Refresh parent or entire tree
                fetchDir(currentPath).then(setFileTree);
                if (action === 'rename') setRenamingNode(null);
                if (action === 'paste') setClipboard(null);
                return true;
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
                return false;
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
            return false;
        }
    };

    const applyCodeChange = (newContent: string) => {
        if (!activeTabId) return;
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newContent, isModified: true } : t));
    };

    const handleClear = () => setMessages([]);

    const handleAICreate = async (type: 'file' | 'dir', path: string, content?: string) => {
        try {
            const action = type === 'file' ? 'create-file' : 'create-dir';
            const res = await fetch('/api/files/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, path }),
            });

            if (res.ok) {
                if (type === 'file' && content) {
                    await fetch('/api/files/content', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, content }),
                    });
                }
                fetchDir(currentPath).then(setFileTree);
                alert(`${type === 'file' ? 'File' : 'Directory'} created at ${path}`);
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const triggerAIAction = (prompt: string) => {
        setInput(prompt);
        // We use a small timeout to let state update, or just use a helper
        setTimeout(() => {
            inputRef.current?.focus();
            // Trigger submit manually by creating a fake event or calling logic
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmit(fakeEvent, prompt);
        }, 50);
    };

    /* Parser for AI responses */
    const renderAIMessage = (content: string) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        // Tags to look for
        const regex = /<(CODE_CHANGE|CREATE_FILE|CREATE_DIR)(?:\s+path="([^"]+)")?>\n?([\s\S]*?)\n?<\/\1>|(<CREATE_DIR\s+path="([^"]+)"\s*\/>)/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            // Add preceding text
            if (match.index > lastIndex) {
                parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
            }

            const tag = match[1] || 'CREATE_DIR';
            const path = match[2] || match[5];
            const body = match[3] || '';

            if (tag === 'CODE_CHANGE') {
                parts.push(
                    <div key={match.index} className="ai-action-box">
                        <div className="ai-action-header">
                            <Wand2 size={14} /> <span>Proposed Code Change</span>
                        </div>
                        <pre className="ai-action-preview">{body.length > 100 ? body.slice(0, 100) + '...' : body}</pre>
                        <button className="ai-apply-btn" onClick={() => applyCodeChange(body)}>
                            Apply Change
                        </button>
                    </div>
                );
            } else if (tag === 'CREATE_FILE') {
                parts.push(
                    <div key={match.index} className="ai-action-box">
                        <div className="ai-action-header">
                            <FilePlus size={14} /> <span>Create File: {path}</span>
                        </div>
                        <button className="ai-apply-btn" onClick={() => handleAICreate('file', path, body)}>
                            Create File
                        </button>
                    </div>
                );
            } else if (tag === 'CREATE_DIR') {
                parts.push(
                    <div key={match.index} className="ai-action-box">
                        <div className="ai-action-header">
                            <FolderPlus size={14} /> <span>Create Directory: {path}</span>
                        </div>
                        <button className="ai-apply-btn" onClick={() => handleAICreate('dir', path)}>
                            Create Directory
                        </button>
                    </div>
                );
            }

            lastIndex = regex.lastIndex;
        }

        if (lastIndex < content.length) {
            parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
        }

        return parts;
    };

    return (
        <>
            <style>{`
                .ai-layout {
                    display: flex;
                    height: calc(100vh - 4rem);
                    overflow: hidden;
                    background: #0a0a0a;
                }

                /* ── Explorer Panel ── */
                .ai-explorer {
                    background: var(--surface);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transition: opacity 0.2s ease;
                }
                .ai-explorer.collapsed {
                    width: 0 !important;
                    min-width: 0 !important;
                    opacity: 0;
                    border-right: none;
                }
                .resizer {
                    width: 4px;
                    cursor: col-resize;
                    background: transparent;
                    transition: background 0.2s;
                    z-index: 10;
                    flex-shrink: 0;
                }
                .resizer:hover, .resizer.active {
                    background: var(--primary);
                }

                .panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(255,255,255,0.02);
                }
                .panel-header h3 {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-secondary);
                }
                .icon-button {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    transition: all 0.15s;
                }
                .icon-button:hover {
                    color: var(--primary);
                    background: rgba(0,240,255,0.08);
                }
                .ai-file-tree {
                    flex: 1;
                    overflow: auto;
                    padding: 0.375rem 0;
                    display: block; /* Ensure it can scroll horizontally */
                }
                .file-tree-item {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    margin: 0 4px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    transition: all 0.15s;
                    white-space: nowrap; /* Prevent text from wrapping */
                    width: max-content; /* Allow it to expand beyond parent width */
                    min-width: calc(100% - 8px); /* But at least fill the container */
                }
                .file-tree-item:hover {
                    background: rgba(255,255,255,0.04);
                    color: var(--text-primary);
                }
                .file-tree-item.selected {
                    background: rgba(0,240,255,0.08);
                    color: var(--primary);
                }
                .file-tree-arrow {
                    width: 20px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                }
                .file-tree-icon {
                    width: 20px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 4px;
                    color: var(--text-secondary);
                }
                .file-tree-item:hover .file-tree-icon,
                .file-tree-item.selected .file-tree-icon {
                    color: var(--primary);
                }
                .file-tree-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .rename-input {
                    background: #1e1e1e;
                    border: 1px solid var(--primary);
                    color: white;
                    font-size: 0.8rem;
                    padding: 0 4px;
                    outline: none;
                    width: 100%;
                    border-radius: 2px;
                }

                /* ── Context Menu ── */
                .context-menu {
                    position: fixed;
                    background: #1e1e1e;
                    border: 1px solid var(--border);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    border-radius: 6px;
                    padding: 4px 0;
                    z-index: 1000;
                    min-width: 160px;
                }
                .context-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    font-size: 0.8rem;
                    color: #d4d4d4;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .context-menu-item:hover {
                    background: var(--primary);
                    color: black;
                }
                .context-menu-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 4px 0;
                }

                /* ── Editor Panel ── */
                .ai-editor {
                    flex: 1.2;
                    background: #111;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    min-width: 0;
                }
                .tab-bar {
                    display: flex;
                    background: #0d0d0d;
                    overflow-x: auto;
                    border-bottom: 1px solid var(--border);
                    height: 35px;
                }
                .tab-bar::-webkit-scrollbar { height: 2px; }
                .tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0 0.75rem;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-right: 1px solid var(--border);
                    background: #0d0d0d;
                    white-space: nowrap;
                    transition: background 0.15s;
                }
                .tab.active {
                    background: #111;
                    color: var(--primary);
                    border-bottom: 1px solid var(--primary);
                }
                .tab:hover { background: #1a1a1a; }
                .tab-close {
                    padding: 2px;
                    border-radius: 4px;
                }
                .tab-close:hover { background: rgba(255,255,255,0.1); }
                
                .editor-container {
                    flex: 1;
                    display: flex;
                    position: relative;
                    overflow: hidden;
                }
                .line-numbers {
                    width: 45px;
                    background: #0d0d0d;
                    color: #5a5a5a;
                    font-family: var(--font-mono);
                    font-size: 0.85rem;
                    line-height: 1.6;
                    text-align: right;
                    padding: 1.5rem 0.75rem;
                    user-select: none;
                    overflow: hidden;
                    border-right: 1px solid rgba(255,255,255,0.05);
                }
                .code-editor-wrapper {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                .code-editor {
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    color: #d4d4d4;
                    font-family: var(--font-mono);
                    font-size: 0.85rem;
                    line-height: 1.6;
                    border: none;
                    resize: none;
                    outline: none;
                    padding: 1.5rem;
                    white-space: pre;
                    overflow: auto;
                }
                .editor-placeholder {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                    opacity: 0.4;
                    gap: 1rem;
                }

                /* ── Chat Panel ── */
                .ai-chat {
                    display: flex;
                    flex-direction: column;
                    background: #0a0a0a;
                    border-left: 1px solid var(--border);
                }
                .chat-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border);
                }
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .chat-input-area {
                    padding: 1rem;
                    border-top: 1px solid var(--border);
                }
                .chat-form {
                    display: flex;
                    gap: 0.5rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 0.375rem;
                }
                .chat-form input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    padding: 0.25rem 0.5rem;
                    font-size: 0.85rem;
                }
                .send-btn {
                    background: var(--primary);
                    color: black;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                }

                /* Messages */
                .msg-row { display: flex; gap: 0.5rem; align-items: flex-start; }
                .msg-row.user { flex-direction: row-reverse; }
                .msg-bubble {
                    max-width: 85%;
                    padding: 0.5rem 0.75rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    line-height: 1.5;
                }
                .msg-bubble.bot { background: var(--surface); border: 1px solid var(--border); border-bottom-left-radius: 2px; }
                .msg-bubble.user { background: var(--primary); color: black; border-bottom-right-radius: 2px; }

                .modified-dot {
                    width: 6px;
                    height: 6px;
                    background: var(--primary);
                    border-radius: 50%;
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .blinking-cursor {
                    display: inline-block;
                    width: 8px;
                    height: 1rem;
                    background: var(--primary);
                    animation: blink 1s step-end infinite;
                    margin-left: 4px;
                }

                /* ── Path Modal ── */
                .path-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 9999;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 15vh;
                    backdrop-filter: blur(2px);
                }
                .path-modal {
                    background: #1e1e1e;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    width: 600px;
                    max-width: 90vw;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .path-modal-input-wrapper {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--border);
                    background: #252526;
                }
                .path-modal-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: white;
                    font-family: var(--font-mono);
                    font-size: 0.9rem;
                    padding: 4px 8px;
                }
                .path-modal-suggestions {
                    max-height: 300px;
                    overflow-y: auto;
                }
                .path-modal-suggestion-item {
                    padding: 8px 16px;
                    font-family: var(--font-mono);
                    font-size: 0.85rem;
                    color: #d4d4d4;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .path-modal-suggestion-item.active {
                    background: var(--primary);
                    color: black;
                }
                .path-modal-suggestion-item:hover:not(.active) {
                    background: rgba(255,255,255,0.05);
                }

                /* ── AI Actions in Chat ── */
                .ai-action-box {
                    background: rgba(0,240,255,0.05);
                    border: 1px solid rgba(0,240,255,0.2);
                    border-radius: 8px;
                    margin-top: 0.75rem;
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .ai-action-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .ai-action-preview {
                    background: rgba(0,0,0,0.3);
                    padding: 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-family: var(--font-mono);
                    color: var(--text-secondary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: pre;
                    max-height: 60px;
                }
                .ai-apply-btn {
                    background: var(--primary);
                    color: black;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    align-self: flex-start;
                }
                .ai-apply-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,240,255,0.3);
                }
                .ai-apply-btn:active {
                    transform: translateY(0);
                }
            `}</style>

            <div className="ai-layout">
                {/* ── Explorer ── */}
                <aside 
                    className={`ai-explorer ${showPanel ? '' : 'collapsed'}`}
                    style={{ width: showPanel ? explorerWidth : 0 }}
                >
                    <div className="panel-header">
                        <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }} title={currentPath}>
                            {currentPath ? currentPath.split('/').pop()?.toUpperCase() || 'EXPLORER' : 'EXPLORER'}
                        </h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="icon-button" onClick={handleCreateProject} title="New Project">
                                <FolderPlus size={14} />
                            </button>
                            <button className="icon-button" onClick={handleOpenFolder} title="Open Folder">
                                <FolderOpen size={14} />
                            </button>
                            <button className="icon-button" onClick={() => setShowPanel(false)} title="Close Panel">
                                <PanelLeftClose size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="ai-file-tree">
                        {!currentPath ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                <p style={{ marginBottom: '1rem' }}>You have not yet opened a folder.</p>
                                <button className="ai-apply-btn" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'center', display: 'flex' }} onClick={handleOpenFolder}>Open Folder</button>
                                <button className="ai-apply-btn" style={{ width: '100%', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', justifyContent: 'center', display: 'flex' }} onClick={handleCreateProject}>Create Project</button>
                            </div>
                        ) : fileTree.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                Folder is empty
                            </div>
                        ) : (
                            fileTree.map((node) => (
                                <FileTreeItem
                                    key={node.path}
                                    node={node}
                                    depth={0}
                                    onToggle={toggleFolder}
                                    onSelect={openFile}
                                    onContextMenu={handleContextMenu}
                                    renamingNode={renamingNode}
                                    setRenamingNode={setRenamingNode}
                                    handleAction={handleAction}
                                    activePath={activeTab?.path || ''}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {showPanel && (
                    <div 
                        className={`resizer ${isResizing === 'explorer' ? 'active' : ''}`} 
                        onMouseDown={() => setIsResizing('explorer')} 
                    />
                )}

                {/* ── Context Menu ── */}
                {contextMenu && (
                    <div 
                        className="context-menu" 
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="context-menu-item" onClick={() => { setClipboard({ type: 'copy', node: contextMenu.node }); setContextMenu(null); }}>
                            <Copy size={14} /> Copy
                        </div>
                        <div className="context-menu-item" onClick={() => { setClipboard({ type: 'cut', node: contextMenu.node }); setContextMenu(null); }}>
                            <Scissors size={14} /> Cut
                        </div>
                        <div 
                            className={`context-menu-item ${!clipboard ? 'opacity-30 pointer-events-none' : ''}`} 
                            onClick={() => handleAction('paste', contextMenu.node)}
                        >
                            <Clipboard size={14} /> Paste
                        </div>
                        <div className="context-menu-divider" />
                        <div className="context-menu-item" onClick={() => {
                            triggerAIAction(`Refactor this file: ${contextMenu.node.path}`);
                            setContextMenu(null);
                        }}>
                            <Wand2 size={14} /> Refactor with AI
                        </div>
                        <div className="context-menu-item" onClick={() => {
                            triggerAIAction(`Explain this file: ${contextMenu.node.path}`);
                            setContextMenu(null);
                        }}>
                            <Bot size={14} /> Explain with AI
                        </div>
                        <div className="context-menu-divider" />
                        <div className="context-menu-item" onClick={() => { setRenamingNode(contextMenu.node); setContextMenu(null); }}>
                            <Edit size={14} /> Rename
                        </div>
                        <div className="context-menu-item" style={{ color: 'var(--error)' }} onClick={() => { if(confirm('Delete?')) handleAction('delete', contextMenu.node); }}>
                            <Trash2 size={14} /> Delete
                        </div>
                    </div>
                )}

                {/* ── Editor ── */}
                <main className="ai-editor">
                    <div className="tab-bar">
                        {!showPanel && (
                            <button className="icon-button" style={{ margin: '0 0.5rem' }} onClick={() => setShowPanel(true)}>
                                <PanelLeft size={16} />
                            </button>
                        )}
                        {tabs.map(tab => (
                            <div 
                                key={tab.id} 
                                className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTabId(tab.id)}
                            >
                                <FileCode size={14} />
                                <span>{tab.name}</span>
                                {tab.isModified && <div className="modified-dot" />}
                                <X size={12} className="tab-close" onClick={(e) => closeTab(tab.id, e)} />
                            </div>
                        ))}
                    </div>

                    <div className="editor-container">
                        {activeTab ? (
                            <>
                                <div className="line-numbers" ref={gutterRef}>
                                    {activeTab.content.split('\n').map((_, i) => (
                                        <div key={i}>{i + 1}</div>
                                    ))}
                                </div>
                                <div className="code-editor-wrapper">
                                    <textarea
                                        ref={editorRef}
                                        className="code-editor"
                                        value={activeTab.content}
                                        onScroll={handleEditorScroll}
                                        onChange={(e) => updateActiveTabContent(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                                                e.preventDefault();
                                                saveActiveTab();
                                            }
                                        }}
                                        spellCheck={false}
                                    />
                                    <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                            onClick={saveActiveTab}
                                            disabled={!activeTab.isModified}
                                        >
                                            <Save size={12} style={{ marginRight: 4 }} /> 
                                            {activeTab.isModified ? 'Save' : 'Saved'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="editor-placeholder" style={{ alignItems: 'flex-start', padding: '10%', opacity: 1, backgroundColor: '#111' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                    <Bot size={48} color="var(--primary)" />
                                    <h2 style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>AI Assistant Studio</h2>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '4rem', width: '100%' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>Start</h3>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <li>
                                                <button 
                                                    onClick={() => triggerAIAction('Create a new file')} 
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', padding: '0.5rem 0' }}
                                                >
                                                    <FilePlus size={18} /> New File...
                                                </button>
                                            </li>
                                            <li>
                                                <button 
                                                    onClick={handleOpenFolder} 
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', padding: '0.5rem 0' }}
                                                >
                                                    <FolderOpen size={18} /> Open Folder...
                                                </button>
                                            </li>
                                            <li>
                                                <button 
                                                    onClick={handleCreateProject} 
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', padding: '0.5rem 0' }}
                                                >
                                                    <FolderPlus size={18} /> Create New Project...
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 500 }}>AI Actions</h3>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <li>
                                                <button 
                                                    onClick={() => triggerAIAction('Explain the codebase architecture')} 
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', padding: '0.5rem 0' }}
                                                >
                                                    <Bot size={18} /> Explain Codebase
                                                </button>
                                            </li>
                                            <li>
                                                <button 
                                                    onClick={() => triggerAIAction('Help me refactor a component')} 
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', padding: '0.5rem 0' }}
                                                >
                                                    <Wand2 size={18} /> Refactor Code
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <div 
                    className={`resizer ${isResizing === 'chat' ? 'active' : ''}`} 
                    onMouseDown={() => setIsResizing('chat')} 
                />

                {/* ── Chatbot ── */}
                <section className="ai-chat" style={{ width: chatWidth }}>
                    <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bot size={18} color="var(--primary)" />
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>AI Assistant</span>
                        </div>
                        <button className="icon-button" onClick={handleClear} title="Clear Chat">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.4 }}>
                                <Bot size={24} style={{ margin: '0 auto 0.5rem' }} />
                                <p style={{ fontSize: '0.8rem' }}>Ask anything about the project</p>
                            </div>
                        )}
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`msg-row ${msg.role === 'user' ? 'user' : ''}`}
                                >
                                    <div className={`msg-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                                        {msg.role === 'user' ? msg.content : renderAIMessage(msg.content)}
                                        {isLoading && i === messages.length - 1 && <span className="blinking-cursor" />}
                                    </div>
                                </motion.div>
                            ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <form onSubmit={handleSubmit} className="chat-form">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={activeTab ? `Chat about ${activeTab.name}...` : "Type a message..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                            <button type="submit" className="send-btn" disabled={!input.trim() || isLoading}>
                                <Send size={14} />
                            </button>
                        </form>
                    </div>
                </section>
                {/* ── Path Selection Modal ── */}
                {modalType && (
                    <div className="path-modal-overlay" onMouseDown={() => setModalType(null)}>
                        <div className="path-modal" onMouseDown={e => e.stopPropagation()}>
                            <div className="path-modal-input-wrapper">
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginRight: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                                    {modalType === 'open' ? 'Open Folder' : 'Create Project'}
                                </span>
                                <input
                                    autoFocus
                                    className="path-modal-input"
                                    value={modalInput}
                                    onChange={e => setModalInput(e.target.value)}
                                    // Make sure hitting enter handles the action
                                    onKeyDown={handleModalKeyDown}
                                    placeholder={modalType === 'open' ? "Type path to open e.g. /home/user/my-project" : "Type path for new project e.g. /home/new-app"}
                                />
                                <button className="ai-apply-btn" style={{ marginLeft: '8px', padding: '4px 12px' }} onClick={submitModal}>
                                    {modalType === 'open' ? 'Open' : 'Create'}
                                </button>
                            </div>
                            <div className="path-modal-suggestions">
                                {modalSuggestions.map((sug, i) => (
                                    <div 
                                        key={sug} 
                                        className={`path-modal-suggestion-item ${i === activeSuggestionIndex ? 'active' : ''}`}
                                        onClick={() => {
                                            const lastSlash = modalInput.lastIndexOf('/');
                                            const dir = modalInput.substring(0, lastSlash) || '/';
                                            const newPath = (dir === '/' ? '/' : dir + '/') + sug + '/';
                                            setModalInput(newPath);
                                            // Focus input after auto-complete click
                                            document.querySelector<HTMLInputElement>('.path-modal-input')?.focus();
                                        }}
                                    >
                                        <Folder color={i === activeSuggestionIndex ? 'black' : 'var(--text-secondary)'} size={14} /> 
                                        {sug}
                                    </div>
                                ))}
                                {modalSuggestions.length === 0 && modalInput && modalInput.endsWith('/') && (
                                    <div style={{ padding: '8px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        No matching directories found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

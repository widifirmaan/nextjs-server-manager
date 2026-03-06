'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await res.json();
            
            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };
    
    const handleClear = () => {
        setMessages([]);
    };

    return (
        <>
            <style>{`
                .ai-chat-page {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 4rem);
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 1.25rem 1.5rem;
                    gap: 0;
                }
                .ai-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                    margin-bottom: 0;
                    flex-shrink: 0;
                }
                .ai-header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .ai-header-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(0,240,255,0.15), rgba(112,0,255,0.15));
                    border: 1px solid rgba(0,240,255,0.2);
                    color: var(--primary);
                }
                .ai-header-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    letter-spacing: 0.5px;
                }
                .ai-header-sub {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    margin-top: 2px;
                }
                .ai-messages-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .ai-empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    opacity: 0.5;
                }
                .ai-empty-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, rgba(0,240,255,0.08), rgba(112,0,255,0.08));
                    border: 1px solid rgba(0,240,255,0.1);
                }
                .ai-msg-row {
                    display: flex;
                    gap: 0.625rem;
                    align-items: flex-start;
                }
                .ai-msg-row.user {
                    flex-direction: row-reverse;
                }
                .ai-avatar {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 4px;
                }
                .ai-avatar.bot {
                    background: rgba(0,240,255,0.1);
                    border: 1px solid rgba(0,240,255,0.2);
                    color: var(--primary);
                }
                .ai-avatar.human {
                    background: rgba(112,0,255,0.15);
                    border: 1px solid rgba(112,0,255,0.3);
                    color: #b388ff;
                }
                .ai-bubble {
                    max-width: 75%;
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    word-break: break-word;
                    white-space: pre-wrap;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                }
                .ai-bubble.bot {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 4px 16px 16px 16px;
                    color: var(--text-primary);
                }
                .ai-bubble.user {
                    background: linear-gradient(135deg, rgba(0,240,255,0.18), rgba(0,240,255,0.08));
                    border: 1px solid rgba(0,240,255,0.25);
                    border-radius: 16px 4px 16px 16px;
                    color: var(--text-primary);
                }
                .ai-loading-dots {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .ai-loading-dots span {
                    font-size: 0.85rem;
                    color: var(--primary);
                    font-weight: 500;
                }
                .ai-input-bar {
                    flex-shrink: 0;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }
                .ai-input-form {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 0.5rem 0.5rem 0.5rem 1.25rem;
                    transition: border-color 0.2s;
                }
                .ai-input-form:focus-within {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px rgba(0,240,255,0.08);
                }
                .ai-input-form input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    font-family: inherit;
                }
                .ai-input-form input::placeholder {
                    color: var(--text-secondary);
                }
                .ai-send-btn {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    border: none;
                    background: var(--primary);
                    color: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .ai-send-btn:hover:not(:disabled) {
                    box-shadow: 0 0 16px rgba(0,240,255,0.4);
                    transform: scale(1.05);
                }
                .ai-send-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }
                @media (max-width: 768px) {
                    .ai-chat-page {
                        padding: 1rem;
                        height: calc(100vh - 6rem);
                    }
                    .ai-bubble {
                        max-width: 88%;
                    }
                }
            `}</style>

            <div className="ai-chat-page">
                {/* Header */}
                <div className="ai-header">
                    <div className="ai-header-left">
                        <div className="ai-header-icon">
                            <Bot size={24} />
                        </div>
                        <div>
                            <div className="ai-header-title">AI Assistant</div>
                            <div className="ai-header-sub">Powered by Gemini CLI v0.32</div>
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={handleClear} className="btn btn-danger text-sm" title="Clear Chat">
                            <Trash2 size={14} /> Clear
                        </button>
                    )}
                </div>

                {/* Messages Area */}
                <div className="ai-messages-area">
                    {messages.length === 0 && (
                        <div className="ai-empty-state">
                            <div className="ai-empty-icon">
                                <Bot size={36} className="text-primary" style={{ opacity: 0.6 }} />
                            </div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>How can I help you today?</h2>
                            <p style={{ fontSize: '0.8rem', maxWidth: '360px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Connected to your system&apos;s Gemini CLI. Ask me anything.
                            </p>
                        </div>
                    )}
                    
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`ai-msg-row ${msg.role === 'user' ? 'user' : ''}`}
                            >
                                <div className={`ai-avatar ${msg.role === 'user' ? 'human' : 'bot'}`}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`ai-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                                    {msg.content}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="ai-msg-row"
                        >
                            <div className="ai-avatar bot">
                                <Bot size={16} />
                            </div>
                            <div className="ai-bubble bot ai-loading-dots">
                                <Loader2 size={16} className="animate-spin text-primary" />
                                <span>Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="ai-input-bar">
                    <form onSubmit={handleSubmit} className="ai-input-form">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message Gemini..."
                            disabled={isLoading}
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading} 
                            className="ai-send-btn"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

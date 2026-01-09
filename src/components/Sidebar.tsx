'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Server, Globe, Activity, Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close sidebar when navigating
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileOpen]);

    const links = [
        { href: '/', label: 'Overview', icon: Activity },
        { href: '/docker', label: 'Docker', icon: Server },
        { href: '/tunnels', label: 'Tunnels', icon: Globe },
        { href: '/terminal', label: 'Terminal', icon: Terminal },
    ];

    return (
        <>
            {/* Mobile Header */}
            <div className="mobile-header">
                <h1 className="text-xl neon-text font-bold" style={{ letterSpacing: '1px' }}>
                    SERVER<span style={{ color: 'var(--primary)' }}>MGR</span>
                </h1>
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 text-text-primary hover:text-primary transition-colors"
                    aria-label="Open Menu"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile Overlay */}
            <div
                className={`overlay ${isMobileOpen ? 'visible' : ''}`}
                onClick={() => setIsMobileOpen(false)}
                aria-hidden="true"
            />

            <motion.aside
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`sidebar ${isMobileOpen ? 'open' : ''}`}
            >
                <button
                    className="close-btn hover:text-primary transition-colors"
                    onClick={() => setIsMobileOpen(false)}
                    aria-label="Close Menu"
                >
                    <X size={24} />
                </button>

                <div className="mb-8 px-2 mt-8 md:mt-0">
                    <h1 className="text-xl neon-text font-bold desktop-only" style={{ letterSpacing: '1px' }}>
                        SERVER<span style={{ color: 'var(--primary)' }}>MGR</span>
                    </h1>
                    <p className="text-sm text-muted mt-1 desktop-only">v1.0.0 Alpha</p>

                    {/* Mobile version of title inside sidebar (optional, but good for context) */}
                    <div className="md:hidden">
                        <p className="text-sm text-muted">Navigation</p>
                    </div>
                </div>

                <nav className="flex flex-col gap-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href} className={clsx('nav-item', isActive && 'active')}>
                                <Icon size={20} />
                                <span>{link.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto p-4 glass-panel text-xs text-muted flex items-center justify-between">
                    <span>Status</span>
                    <span className="badge badge-success">ONLINE</span>
                </div>
            </motion.aside>
        </>
    );
}

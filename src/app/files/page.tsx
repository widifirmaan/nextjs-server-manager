'use client';

import { useEffect, useState } from 'react';

export default function CodeServerPage() {
    const [url, setUrl] = useState('');

    useEffect(() => {
        setUrl(`https://ai.widifirmaan.web.id`);
    }, []);

    return (
        <>
            <style>{`
                /* Hide global scrollbar for File Manager page only */
                body {
                   overflow: hidden !important;
                }
                .content {
                    padding: 0 !important;
                    overflow: hidden !important;
                    height: 100vh !important;
                    display: flex;
                    flex-direction: column;
                }
                .iframe-container {
                    flex: 1;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                }
                @media (max-width: 768px) {
                    .content {
                        padding-top: 4.5rem !important;
                        height: 100vh !important;
                    }
                }
            `}</style>
            <div className="iframe-container">
                {url ? (
                    <iframe
                        src={url}
                        className="flex-1 w-full border-0 h-full block"
                        title="Code Server"
                        allow="clipboard-read; clipboard-write; fullscreen"
                    />
                ) : (
                    <div className="flex items-center justify-center flex-1">
                        <p>Loading Code Server...</p>
                    </div>
                )}
            </div>
        </>
    );
}

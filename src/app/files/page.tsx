'use client';

import { useEffect, useState } from 'react';

export default function CodeServerPage() {
    const [url, setUrl] = useState('');

    useEffect(() => {
        setUrl(`https://ai.widifirmaan.web.id`);
    }, []);

    return (
        <div className="absolute inset-0">
            {url ? (
                <iframe
                    src={url}
                    className="w-full h-full border-0"
                    title="Code Server"
                    allow="clipboard-read; clipboard-write"
                />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p>Loading Code Server...</p>
                </div>
            )}
        </div>
    );
}

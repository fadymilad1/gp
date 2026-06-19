import React from 'react';

interface ImageBlockProps {
    settings: {
        url?: string;
        alt_text?: string;
    };
}

export default function ImageBlock({ settings }: ImageBlockProps) {
    if (!settings.url) return null;

    return (
        <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={settings.url} 
                alt={settings.alt_text || 'Hospital Image'} 
                className="h-auto max-h-[560px] w-full max-w-5xl rounded-3xl border border-slate-200 object-cover shadow-sm"
            />
        </section>
    );
}

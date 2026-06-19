import React from 'react';

interface TextBlockProps {
    settings: {
        content?: string;
    };
}

export default function TextBlock({ settings }: TextBlockProps) {
    if (!settings.content) return null;

    return (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div 
                className="prose prose-lg mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-800 shadow-sm"
                dangerouslySetInnerHTML={{ __html: settings.content }} 
            />
        </section>
    );
}

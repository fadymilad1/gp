import React from 'react';
import { notFound } from 'next/navigation';
import { getHospitalPages } from '@/lib/hospitalApi';
import BlockRenderer from '@/components/hospital/BlockRenderer';

interface PageProps {
    params: {
        subdomain: string;
    };
}

// Ensure dynamic rendering because we rely on API fetching
export const dynamic = 'force-dynamic';

export default async function HospitalBookingPage({ params }: PageProps) {
    const resolvedParams = await params;
    const pages = await getHospitalPages(resolvedParams.subdomain);
    
    // Find the page with slug 'booking'
    const bookingPage = pages.find(p => p.slug === 'booking' && p.is_published);

    if (!bookingPage) {
        notFound();
    }

    return (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--hospital-bg)' }}>
            <BlockRenderer blocks={bookingPage.blocks} subdomain={resolvedParams.subdomain} />
        </main>
    );
}

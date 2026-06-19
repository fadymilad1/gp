import React from 'react';
import { notFound } from 'next/navigation';
import { getHospitalPages } from '@/lib/hospitalApi';
import BlockRenderer from '@/components/hospital/BlockRenderer';
import DoctorsListBlock from '@/components/hospital/blocks/DoctorsListBlock';
import PublicHospitalHighlights from '@/components/hospital/PublicHospitalHighlights';
import EmergencyDepartmentsSection from '@/components/hospital/EmergencyDepartmentsSection';

interface PageProps {
    params: {
        subdomain: string;
    };
}

// Ensure dynamic rendering because we rely on API fetching
export const dynamic = 'force-dynamic';

export default async function HospitalHomePage({ params }: PageProps) {
    const resolvedParams = await params;
    const pages = await getHospitalPages(resolvedParams.subdomain);
    
    const homePage = pages.find(p => p.is_home && p.is_published);

    if (!homePage) {
        notFound();
    }

    const hasDoctorsBlock = homePage.blocks?.some(block => block.type === 'DOCTORS_LIST_BLOCK');

    return (
        <main className="min-h-screen" style={{ backgroundColor: 'var(--hospital-bg)' }}>
            <BlockRenderer blocks={homePage.blocks} subdomain={resolvedParams.subdomain} />
            <EmergencyDepartmentsSection subdomain={resolvedParams.subdomain} />
            {!hasDoctorsBlock ? (
                <DoctorsListBlock
                    settings={{ title: 'Meet Our Doctors', show_count: 4 }}
                    subdomain={resolvedParams.subdomain}
                />
            ) : null}
            <PublicHospitalHighlights subdomain={resolvedParams.subdomain} />
        </main>
    );
}

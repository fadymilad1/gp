import React from 'react';
import { notFound } from 'next/navigation';
import { getHospitalPages } from '@/lib/hospitalApi';
import { getSubdomainPublicInfo } from '@/lib/subdomainApi';
import BlockRenderer from '@/components/hospital/BlockRenderer';
import DoctorsListBlock from '@/components/hospital/blocks/DoctorsListBlock';
import PublicHospitalHighlights from '@/components/hospital/PublicHospitalHighlights';
import EmergencyDepartmentsSection from '@/components/hospital/EmergencyDepartmentsSection';
import PharmacySubdomainWrapper from './PharmacySubdomainWrapper';

interface PageProps {
    params: {
        subdomain: string;
    };
}

// Ensure dynamic rendering because we rely on API fetching
export const dynamic = 'force-dynamic';

export default async function SubdomainHomePage({ params }: PageProps) {
    const resolvedParams = await params;
    
    // 1. Fetch public info to determine business type
    const subdomainInfo = await getSubdomainPublicInfo(resolvedParams.subdomain);
    
    if (!subdomainInfo) {
        notFound();
    }
    
    if (!subdomainInfo.is_published) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-3xl font-bold">Coming Soon</h1>
                <p className="text-neutral-500">This website is currently under construction.</p>
            </div>
        )
    }

    // 2. Handle Pharmacy
    if (subdomainInfo.business_type === 'pharmacy') {
        return <PharmacySubdomainWrapper subdomainInfo={subdomainInfo} />
    }

    // 3. Handle Hospital
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

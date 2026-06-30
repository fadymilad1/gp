import React, { Suspense } from 'react';
import { getHospitalDoctors } from '@/lib/hospitalApi';
import type { Doctor } from '@/types/hospital';
import DoctorsListClient from './DoctorsListClient';

interface DoctorsListBlockProps {
    settings: {
        title?: string;
        show_count?: number;
    };
    subdomain: string;
}

export default async function DoctorsListBlock({ settings, subdomain }: DoctorsListBlockProps) {
    const rawTitle = typeof settings.title === 'string' ? settings.title.trim() : '';
    const title = !rawTitle || rawTitle.toLowerCase() === 'meet our specialists'
        ? 'Meet Our Doctors'
        : rawTitle;
    const subtitle = 'Our highly qualified doctors are dedicated to providing exceptional medical care with compassion and expertise.';

    let doctors: Doctor[] = [];
    let fetchError: string | null = null;
    try {
        doctors = await getHospitalDoctors(subdomain);
    } catch (e) {
        console.error('Failed to fetch doctors:', e);
        fetchError = 'We could not load doctors right now. Please try again later.';
    }

    return (
        <Suspense fallback={<div className="py-16 text-center text-gray-500">Loading doctors...</div>}>
            <DoctorsListClient
                title={title}
                subtitle={subtitle}
                doctors={doctors}
                fetchError={fetchError}
            />
        </Suspense>
    );
}

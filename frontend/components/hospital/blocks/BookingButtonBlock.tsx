import React from 'react';
import Link from 'next/link';

interface BookingButtonBlockProps {
    settings: {
        text?: string;
        doctor_id?: string;
    };
}

export default function BookingButtonBlock({ settings }: BookingButtonBlockProps) {
    const btnText = settings.text || 'Book Now';
    const href = settings.doctor_id 
        ? `/booking?doctor_id=${settings.doctor_id}` 
        : '/booking';

    return (
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6">
            <Link
                href={href}
                className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 px-10 py-4 text-lg font-bold text-white shadow transition hover:from-blue-700 hover:to-teal-600"
            >
                {btnText}
            </Link>
        </div>
    );
}

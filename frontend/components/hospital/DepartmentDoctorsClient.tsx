'use client';

import React from 'react';
import Link from 'next/link';
import { FiChevronLeft, FiCalendar, FiBriefcase } from 'react-icons/fi';
import type { Doctor, Department } from '@/types/hospital';
import { normalizeLogoUrl } from '@/lib/storage';

interface Props {
  department: Department;
  doctors: Doctor[];
}

export default function DepartmentDoctorsClient({ department, doctors }: Props) {
  const getDoctorSummary = (doc: Doctor) => {
    if (doc.title || doc.experience) {
      return {
        title: doc.title || '',
        experience: doc.experience || '',
        summary: (doc.bio || '').trim() || 'Dedicated to patient-first care and clinical excellence.',
      };
    }
    const bullet = '\u2022';
    const separator = ` ${bullet} `;
    const rawBio = (doc.bio || '').trim();
    const parts = rawBio.split(separator).map(part => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const extraBio = parts.slice(2).join(separator).trim();
      return {
        title: parts[0] || '',
        experience: parts[1] || '',
        summary: extraBio || 'Dedicated to patient-first care and clinical excellence.',
      };
    }
    return { title: '', experience: '', summary: rawBio };
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--hospital-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-8 hover:underline"
          style={{ color: 'var(--hospital-link)' }}
        >
          <FiChevronLeft size={16} />
          Back to Homepage
        </Link>

        {/* Header Section */}
        <div className="mb-12 border-b pb-8" style={{ borderColor: 'var(--hospital-border)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="flex items-center justify-center w-16 h-16 text-3xl font-bold flex-shrink-0"
              style={{
                background: 'var(--hospital-primary-soft)',
                color: 'var(--hospital-primary-strong)',
                borderRadius: 'var(--hospital-radius)',
              }}
            >
              {department.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: 'var(--hospital-text)' }}>
                {department.name} Department
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {doctors.length} Specialist{doctors.length !== 1 ? 's' : ''} Available
              </p>
            </div>
          </div>
          <p className="text-base sm:text-lg max-w-3xl leading-relaxed" style={{ color: 'var(--hospital-text-muted)' }}>
            {department.description || 'Welcome to our department. We provide specialized, premium medical services with our team of professional specialists.'}
          </p>
        </div>

        {/* Doctors Grid */}
        {doctors.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl border text-center"
            style={{
              background: 'var(--hospital-surface)',
              borderColor: 'var(--hospital-border)',
              borderRadius: 'var(--hospital-radius)',
            }}
          >
            <span className="text-5xl mb-4">🩺</span>
            <h3 className="text-lg font-bold" style={{ color: 'var(--hospital-text)' }}>No Doctors Available</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--hospital-text-muted)' }}>
              There are currently no active doctors assigned to this department.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doc => {
              const { title, experience, summary } = getDoctorSummary(doc);
              const imageUrl = normalizeLogoUrl(doc.image_url_resolved || doc.image_url) || '';

              return (
                <div
                  key={doc.id}
                  className="flex flex-col overflow-hidden border shadow-sm transition-shadow duration-300 hover:shadow-md"
                  style={{
                    background: 'var(--hospital-surface)',
                    borderColor: 'var(--hospital-border)',
                    borderRadius: 'var(--hospital-radius)',
                  }}
                >
                  {/* Doctor Info */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Photo */}
                      <div className="w-20 h-24 rounded-xl overflow-hidden bg-neutral-light border border-neutral-border flex-shrink-0">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt={doc.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-3xl font-bold"
                            style={{ backgroundColor: 'var(--hospital-primary-soft)', color: 'var(--hospital-primary-strong)' }}
                          >
                            {doc.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Name & Specialty */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate" style={{ color: 'var(--hospital-text)' }}>
                          {doc.name}
                        </h3>
                        {title && (
                          <p className="text-xs font-semibold uppercase tracking-wider mt-0.5 truncate" style={{ color: 'var(--hospital-text-muted)' }}>
                            {title}
                          </p>
                        )}
                        <p className="text-xs font-medium mt-2 inline-block px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hospital-primary-soft)', color: 'var(--hospital-primary-strong)' }}>
                          {doc.specialty}
                        </p>
                      </div>
                    </div>

                    {/* Bio Summary */}
                    <p className="text-sm leading-relaxed line-clamp-3 text-gray-500 mb-5 flex-1" style={{ color: 'var(--hospital-text-muted)' }}>
                      {summary}
                    </p>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between border-t pt-4 mt-auto" style={{ borderColor: 'var(--hospital-border)' }}>
                      {experience ? (
                        <span className="text-xs text-gray-500 flex items-center gap-1" style={{ color: 'var(--hospital-text-muted)' }}>
                          <FiBriefcase size={13} /> {experience}
                        </span>
                      ) : (
                        <span />
                      )}
                      
                      <Link
                        href={`/booking?doctor_id=${doc.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shadow-sm"
                        style={{
                          backgroundColor: 'var(--hospital-btn-primary)',
                          color: 'var(--hospital-btn-primary-text)',
                          borderRadius: 'var(--hospital-radius)',
                        }}
                      >
                        <FiCalendar size={13} />
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

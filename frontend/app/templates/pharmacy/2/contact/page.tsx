'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiArrowLeft, FiClock, FiMapPin, FiPhoneCall } from 'react-icons/fi'
import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { getSiteItem, setSiteOwnerId } from '@/lib/storage'
import { resolveOpenHours } from '@/lib/pharmacyTemplateRuntime'

type PharmacySetup = { phone?: string; address?: string }
type BusinessInfo = { name?: string; logo?: string; contactPhone?: string; address?: string; workingHours?: Record<string, { open?: string; close?: string; closed?: boolean }> }

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function ContactContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams?.get('demo') === '1' || searchParams?.get('demo') === 'true'
  const ownerId = searchParams?.get('owner') || ''

  const withDemo = (path: string) => {
    const [base, hash] = path.split('#')
    const [pathname, query = ''] = base.split('?')
    const params = new URLSearchParams(query)
    if (isDemo) params.set('demo', '1')
    if (ownerId) params.set('owner', ownerId)
    const nextQuery = params.toString()
    return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash ? `#${hash}` : ''}`
  }

  const [brand, setBrand] = useState<{ name: string; logo: string | null; phone: string; address: string; openHours: string }>({
    name: isDemo ? 'Classic Pharmacy' : '',
    logo: isDemo ? '/mod logo.png' : null,
    phone: isDemo ? '+1 (555) 234-5678' : '',
    address: isDemo ? '45 Health Avenue, City' : '',
    openHours: isDemo ? 'Mon–Sat 09:00–19:00' : '',
  })

  useEffect(() => {
    if (ownerId) {
      setSiteOwnerId(ownerId)
    }
  }, [ownerId])

  useEffect(() => {
    if (isDemo) return
    const businessInfo = safeJsonParse<BusinessInfo>(getSiteItem('businessInfo'))
    const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
    const openHours = businessInfo ? resolveOpenHours(businessInfo) || '' : ''
    setBrand({
      name: businessInfo?.name?.trim() || '',
      logo: businessInfo?.logo || null,
      phone: businessInfo?.contactPhone || setup?.phone || '',
      address: businessInfo?.address || setup?.address || '',
      openHours,
    })
  }, [isDemo])

  return (
    <div className="min-h-screen font-serif bg-[radial-gradient(circle_at_20%_20%,rgba(250,242,222,0.9),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.9),rgba(250,246,240,1))]">
      <div className="bg-[#2b2118] text-white">
        <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm">
          <div className="flex items-center gap-2">
            <FiClock className="text-amber-200" />
            <span>{brand.openHours || (isDemo ? 'Mon–Sat 09:00–19:00' : '')}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {brand.phone && (
              <>
                <a className="inline-flex items-center gap-2 hover:text-amber-200 transition-colors" href={`tel:${brand.phone}`}>
                  <FiPhoneCall />
                  <span>{brand.phone}</span>
                </a>
                {brand.address && <span className="hidden sm:inline opacity-60">•</span>}
              </>
            )}
            {brand.address && (
              <div className="inline-flex items-center gap-2">
                <FiMapPin className="text-amber-200" />
                <span className="truncate max-w-[28rem]">{brand.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <header className="bg-white/80 backdrop-blur border-b border-neutral-border">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <Link href={withDemo('/templates/pharmacy/2')} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden border border-amber-300 shadow-sm">
              {isDemo ? (
                <Image src="/mod logo.png" alt="Logo" width={44} height={44} className="object-cover" />
              ) : (
                <BrandLogo
                  src={brand.logo}
                  alt={`${brand.name || 'Pharmacy'} logo`}
                  fallbackText={brand.name || 'P'}
                  imageClassName="w-full h-full object-cover"
                  fallbackClassName="w-full h-full bg-[#7a5c2e] flex items-center justify-center text-white font-bold text-xs"
                />
              )}
            </div>
            <div className="leading-tight">
              <div className="font-bold text-neutral-dark">{brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')}</div>
              <div className="text-xs text-neutral-gray tracking-wide">Contact Page</div>
            </div>
          </Link>

          <Link
            href={withDemo('/templates/pharmacy/2')}
            className="text-sm text-neutral-gray hover:text-[#7a5c2e] transition-colors flex items-center gap-2 font-semibold"
          >
            <FiArrowLeft />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-dark text-center">Contact Us</h1>
          <p className="mt-3 text-neutral-gray text-center">
            Reach out for availability questions and general pharmacy support.
          </p>

          <div className="mt-8 space-y-4 border-t border-neutral-border pt-6 max-w-md mx-auto text-base">
            {brand.phone && (
              <div className="flex items-center gap-3 text-neutral-dark justify-center">
                <FiPhoneCall className="text-[#7a5c2e]" size={18} />
                <a href={`tel:${brand.phone}`} className="hover:underline">{brand.phone}</a>
              </div>
            )}
            {brand.address && (
              <div className="flex items-center gap-3 text-neutral-dark justify-center">
                <FiMapPin className="text-[#7a5c2e]" size={18} />
                <span>{brand.address}</span>
              </div>
            )}
            {brand.openHours && (
              <div className="flex items-center gap-3 text-neutral-dark justify-center">
                <FiClock className="text-[#7a5c2e]" size={18} />
                <span>{brand.openHours}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <AIChatbot pharmacyName={brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function Template2ContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ContactContent />
    </Suspense>
  )
}


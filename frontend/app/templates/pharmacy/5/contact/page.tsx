'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiClock,
} from 'react-icons/fi'

import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import {
  buildTemplatePath,
  getDemoState,
  loadBrandInfo,
  syncSiteOwner,
  type TemplateBrand,
} from '@/lib/pharmacyTemplateRuntime'

const DEMO_BRAND: TemplateBrand = {
  name: 'HarborLine Pharmacy',
  logo: '/template-2.jpg',
  about: 'Editorial storefront for concierge pharmacy commerce.',
  phone: '+1 (555) 278-3092',
  address: '11 Harbor Street, Boston',
  openHours: 'Mon-Sat 09:00-20:00',
}

function TemplateFiveContactContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState<TemplateBrand>(DEMO_BRAND)

  useEffect(() => {
    syncSiteOwner(demoState.ownerId)
  }, [demoState.ownerId])

  useEffect(() => {
    setBrand(loadBrandInfo(demoState.isDemo, DEMO_BRAND))
  }, [demoState.isDemo])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#fff_30%,#f8f5ff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/5')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-rose-600">
            <FiArrowLeft /> Back to template
          </Link>
          <span className="text-sm font-semibold text-slate-700">Contact {brand.name || 'HarborLine Pharmacy'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <section className="animate-soft-rise rounded-[2rem] border border-rose-100 bg-white p-7 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Direct support</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Talk to a pharmacy specialist.</h1>

          <div className="mt-8 space-y-4 border-t border-rose-100 pt-6 max-w-md mx-auto text-base">
            {brand.phone && (
              <div className="flex items-center gap-3 text-slate-700 justify-center">
                <FiPhone className="text-rose-500" size={18} />
                <a href={`tel:${brand.phone}`} className="hover:underline">{brand.phone}</a>
              </div>
            )}
            {brand.address && (
              <div className="flex items-center gap-3 text-slate-700 justify-center">
                <FiMapPin className="text-rose-500" size={18} />
                <span>{brand.address}</span>
              </div>
            )}
            {brand.openHours && (
              <div className="flex items-center gap-3 text-slate-700 justify-center">
                <FiClock className="text-rose-500" size={18} />
                <span>{brand.openHours}</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <Link href={withDemo('/templates/pharmacy/5/services')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              View services
            </Link>
            <Link href={withDemo('/templates/pharmacy/5/medications')} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">
              Browse products
            </Link>
          </div>
        </section>
      </main>

      <AIChatbot pharmacyName={brand.name || 'HarborLine Pharmacy'} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function TemplateFiveContactPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFiveContactContent />
    </Suspense>
  )
}

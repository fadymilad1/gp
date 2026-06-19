'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiActivity,
  FiArrowLeft,
  FiClock,
  FiPackage,
  FiShield,
  FiTruck,
  FiUsers,
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

const SERVICE_ITEMS = [
  {
    icon: FiShield,
    title: 'Medication Safety Review',
    description:
      'Get pharmacist-reviewed usage guidance, interaction awareness, and clear dosage reminders.',
  },
  {
    icon: FiTruck,
    title: 'Scheduled Delivery Slots',
    description:
      'Choose preferred delivery windows with same-day options across supported zones.',
  },
  {
    icon: FiUsers,
    title: 'Family Profile Management',
    description:
      'Handle recurring orders and refill requests for multiple household members in one account.',
  },
  {
    icon: FiPackage,
    title: 'Refill Ready Queue',
    description:
      'Submit refill intent and receive status updates as your order progresses.',
  },
  {
    icon: FiActivity,
    title: 'Wellness Pathways',
    description:
      'Browse structured product pathways tailored to energy, immunity, sleep, and daily care.',
  },
  {
    icon: FiClock,
    title: 'Live Service Hours',
    description:
      'Support channels show availability in real time to speed up urgent requests.',
  },
]

function TemplateFiveServicesContent() {
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
          <div className="text-sm font-semibold text-slate-700">{brand.name || 'HarborLine Pharmacy'}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <section className="animate-soft-rise rounded-[2rem] border border-rose-100 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Service architecture</p>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900">Care workflows designed for confidence.</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
            HarborLine combines pharmacist support, dependable logistics, and structured wellness paths for modern pharmacy operations.
          </p>
          <div className="mt-5 inline-flex items-center rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
            Current hours: {brand.openHours || 'Not set yet'}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SERVICE_ITEMS.map((item, index) => (
            <article key={item.title} className="animate-soft-rise rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
                <item.icon />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Need direct support?</h3>
            <p className="mt-2 text-sm text-slate-600">Use the contact page to send a message directly to the pharmacy owner dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href={withDemo('/templates/pharmacy/5/contact')} className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">Open contact form</Link>
            <Link href={withDemo('/templates/pharmacy/5/medications')} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Browse products</Link>
          </div>
        </section>
      </main>

      <AIChatbot pharmacyName={brand.name || 'HarborLine Pharmacy'} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function TemplateFiveServicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFiveServicesContent />
    </Suspense>
  )
}

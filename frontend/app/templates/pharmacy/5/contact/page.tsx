'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowLeft,
  FiCheckCircle,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSend,
} from 'react-icons/fi'

import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { addPharmacyInboxMessage } from '@/lib/pharmacyInbox'
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

type ContactForm = {
  name: string
  email: string
  message: string
}

function TemplateFiveContactContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState<TemplateBrand>(DEMO_BRAND)
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    syncSiteOwner(demoState.ownerId)
  }, [demoState.ownerId])

  useEffect(() => {
    setBrand(loadBrandInfo(demoState.isDemo, DEMO_BRAND))
  }, [demoState.isDemo])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return

    addPharmacyInboxMessage(
      {
        type: 'contact',
        name: form.name,
        contact: form.email,
        message: form.message,
        source: 'template5-contact',
      },
      demoState.ownerId || undefined,
    )

    setForm({ name: '', email: '', message: '' })
    setSent(true)
    window.setTimeout(() => setSent(false), 2600)
  }

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

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="animate-soft-rise rounded-[2rem] border border-rose-100 bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Direct support</p>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900">Talk to a pharmacy specialist.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Send a message and the pharmacy owner dashboard receives it instantly in the customer inbox panel.
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="inline-flex items-center gap-2"><FiPhone className="text-rose-500" /> {brand.phone || 'Phone not configured'}</p>
            <p className="inline-flex items-center gap-2"><FiMapPin className="text-rose-500" /> {brand.address || 'Address not configured'}</p>
            <p className="inline-flex items-center gap-2"><FiMail className="text-rose-500" /> Response time: under 1 business day</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={withDemo('/templates/pharmacy/5/services')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              View services
            </Link>
            <Link href={withDemo('/templates/pharmacy/5/medications')} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">
              Browse products
            </Link>
          </div>
        </section>

        <section className="animate-soft-rise [animation-delay:120ms] rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Send a message</h2>
          <p className="mt-2 text-sm text-slate-500">Include request details for faster follow-up.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="Jamie Carter"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="jamie@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                placeholder="Please share refill ID, preferred pickup time, or symptoms you need guidance for."
              />
            </label>

            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">
              <FiSend /> Send message
            </button>

            {sent ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                <FiCheckCircle /> Message sent to the owner inbox.
              </p>
            ) : null}
          </form>
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

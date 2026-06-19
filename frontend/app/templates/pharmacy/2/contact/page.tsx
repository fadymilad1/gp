'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiArrowLeft, FiClock, FiMapPin, FiPhoneCall, FiSend } from 'react-icons/fi'
import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { getSiteItem, setSiteOwnerId } from '@/lib/storage'
import { addPharmacyInboxMessage } from '@/lib/pharmacyInbox'

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

  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (isDemo) return
    const businessInfo = safeJsonParse<BusinessInfo>(getSiteItem('businessInfo'))
    const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
    const hours = businessInfo?.workingHours
    let openHours = ''
    if (hours?.monday?.closed) openHours = 'Hours vary'
    else if (hours?.monday?.open && hours?.monday?.close) openHours = `Mon ${hours.monday.open}–${hours.monday.close}`
    setBrand({
      name: businessInfo?.name?.trim() || '',
      logo: businessInfo?.logo || null,
      phone: businessInfo?.contactPhone || setup?.phone || '',
      address: businessInfo?.address || setup?.address || '',
      openHours,
    })
  }, [isDemo])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return

    addPharmacyInboxMessage(
      {
        type: 'contact',
        name: contactForm.name,
        contact: contactForm.email,
        message: contactForm.message,
        source: 'template2-contact',
      },
      ownerId || undefined,
    )

    setContactForm({ name: '', email: '', message: '' })
    setSent(true)
    window.setTimeout(() => setSent(false), 2500)
  }

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

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-dark">Contact Us</h1>
            <p className="mt-3 text-neutral-gray">
              Reach out for refill requests, availability questions, and pharmacy support.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              {brand.phone && (
                <div className="flex items-center gap-2 text-neutral-dark">
                  <FiPhoneCall className="text-[#7a5c2e]" />
                  <span>{brand.phone}</span>
                </div>
              )}
              {brand.address && (
                <div className="flex items-center gap-2 text-neutral-dark">
                  <FiMapPin className="text-[#7a5c2e]" />
                  <span>{brand.address}</span>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="font-bold text-neutral-dark">Tip</div>
              <div className="mt-1 text-sm text-neutral-gray">
                Messages from this form are saved in the owner dashboard under Orders {'>'} Customer Messages.
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border-2 border-amber-200 bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.06)] space-y-4"
          >
            <div className="text-sm text-neutral-gray tracking-wide">Send a message</div>
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">Name</label>
              <input
                className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                placeholder="Your name"
                value={contactForm.name}
                onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                placeholder="you@example.com"
                value={contactForm.email}
                onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">Message</label>
              <textarea
                className="w-full px-4 py-2 border border-neutral-border rounded-lg focus:ring-2 focus:ring-amber-700 focus:border-transparent"
                rows={5}
                placeholder="How can we help?"
                value={contactForm.message}
                onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors font-semibold"
            >
              <FiSend />
              Send Message
            </button>
            {sent ? <p className="text-sm text-success">Message sent to pharmacy owner inbox.</p> : null}
          </form>
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


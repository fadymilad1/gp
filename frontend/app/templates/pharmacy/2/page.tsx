'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowRight,
  FiClock,
  FiMapPin,
  FiPhoneCall,
  FiShoppingBag,
  FiShoppingCart,
  FiShield,
  FiMinus,
  FiPlus,
} from 'react-icons/fi'
import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { ProductImage } from '@/components/pharmacy/ProductImage'
import { getSiteItem, setSiteItem, removeSiteItem, getStoredUser, setSiteOwnerId } from '@/lib/storage'
import { getStoredPharmacyThemeSettings, isSectionEnabled } from '@/lib/pharmacyTheme'

type PharmacySetup = {
  phone?: string
  email?: string
  address?: string
  products?: Array<{
    name: string
    category?: string
    description?: string
    price?: string
    inStock?: boolean
    imageUrl?: string
    image_url?: string
  }>
}

type BusinessInfo = {
  name?: string
  logo?: string // base64 data url
  about?: string
  address?: string
  contactPhone?: string
  contactEmail?: string
  workingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>
}

type Product = {
  id: string
  name: string
  category: string
  description?: string
  price: string
  inStock: boolean
  imageUrl?: string
}

type CartItem = { product: Product; quantity: number }

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function Template2HomeContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams?.get('demo') === '1' || searchParams?.get('demo') === 'true'
  const ownerId = searchParams?.get('owner') || ''
  const cartKey = isDemo ? 'pharmacy2_cart_demo' : 'pharmacy2_cart'

  const withDemo = (path: string) => {
    const [base, hash] = path.split('#')
    const [pathname, query = ''] = base.split('?')
    const params = new URLSearchParams(query)
    if (isDemo) params.set('demo', '1')
    if (ownerId) params.set('owner', ownerId)
    const nextQuery = params.toString()
    return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash ? `#${hash}` : ''}`
  }

  const [pharmacySetup, setPharmacySetup] = useState<PharmacySetup | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    if (isDemo) return
    const user = getStoredUser()
    if (ownerId) setSiteOwnerId(ownerId)
    else if (user?.id) setSiteOwnerId(user.id)
    setPharmacySetup(safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup')))
    setBusinessInfo(safeJsonParse<BusinessInfo>(getSiteItem('businessInfo')))
  }, [isDemo, ownerId])

  useEffect(() => {
    const raw = isDemo ? localStorage.getItem(cartKey) : getSiteItem(cartKey)
    const saved = safeJsonParse<CartItem[]>(raw)
    setCart(saved || [])
  }, [cartKey, isDemo])

  useEffect(() => {
    if (cart.length > 0) {
      if (isDemo) localStorage.setItem(cartKey, JSON.stringify(cart))
      else setSiteItem(cartKey, JSON.stringify(cart))
    } else {
      if (isDemo) localStorage.removeItem(cartKey)
      else removeSiteItem(cartKey)
    }
  }, [cart, cartKey, isDemo])

  const brand = useMemo(() => {
    if (isDemo) {
      return {
        name: 'Classic Pharmacy',
        logo: '/mod logo.png',
        about:
          'Traditional care with a professional touch. Quality medicines, trusted advice, and reliable service.',
        phone: '+1 (555) 234-5678',
        address: '45 Health Avenue, City',
        openHours: 'Mon–Sat 09:00–19:00',
      }
    }

    const name = businessInfo?.name?.trim() || ''
    const logo = businessInfo?.logo || null
    const about = businessInfo?.about?.trim() || ''
    const phone = businessInfo?.contactPhone || pharmacySetup?.phone || ''
    const address = businessInfo?.address || pharmacySetup?.address || ''

    const hours = businessInfo?.workingHours
    let openHours = ''
    if (hours?.monday?.closed) openHours = 'Hours vary'
    else if (hours?.monday?.open && hours?.monday?.close) openHours = `Mon ${hours.monday.open}–${hours.monday.close}`

    return { name, logo, about, phone, address, openHours }
  }, [businessInfo, pharmacySetup, isDemo])

  const themeSettings = useMemo(
    () => (isDemo ? null : getStoredPharmacyThemeSettings()),
    [isDemo],
  )

  const showHero = isDemo || !themeSettings || isSectionEnabled(themeSettings, 'hero')
  const showFeaturedProducts = isDemo || !themeSettings || isSectionEnabled(themeSettings, 'featuredProducts')
  const showOffers = isDemo || !themeSettings || isSectionEnabled(themeSettings, 'offers')
  const showContactInfo = isDemo || !themeSettings || isSectionEnabled(themeSettings, 'contactInfo')
  const showMap = isDemo || !themeSettings || isSectionEnabled(themeSettings, 'map')

  const featured = useMemo<Product[]>(() => {
    if (isDemo) {
      return [
        {
          id: 'd1',
          name: 'Vitamin D3 2000IU',
          category: 'Vitamins',
          description: 'Daily support for bone health and immunity.',
          price: '$15.99',
          inStock: true,
          imageUrl: '/template-1.jpg',
        },
        {
          id: 'd2',
          name: 'Allergy Relief 24h',
          category: 'OTC',
          description: 'Non-drowsy relief for seasonal allergies.',
          price: '$13.99',
          inStock: true,
          imageUrl: '/template-2.jpg',
        },
        {
          id: 'd3',
          name: 'First Aid Kit',
          category: 'Care',
          description: 'Essentials for home and travel.',
          price: '$19.99',
          inStock: true,
          imageUrl: '/template-3.jpg',
        },
      ]
    }

    const list = pharmacySetup?.products?.filter((p) => p.name?.trim()) ?? []
    return list
      .map((p, idx) => ({
        id: `user-${idx}`,
        name: p.name,
        category: p.category || 'General',
        description: p.description,
        price: p.price || '$0.00',
        inStock: p.inStock !== false,
        imageUrl: p.imageUrl || p.image_url || '',
      }))
      .slice(0, 3)
  }, [pharmacySetup, isDemo])

  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  const updateCartQuantityFromHome = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const newQuantity = item.quantity + delta
      const updated =
        newQuantity <= 0
          ? prev.filter((i) => i.product.id !== productId)
          : prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQuantity } : i))
      if (isDemo) localStorage.setItem(cartKey, JSON.stringify(updated))
      else setSiteItem(cartKey, JSON.stringify(updated))
      return updated
    })
  }

  const addToCart = (product: Product) => {
    if (!product.inStock) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const updated = existing
        ? prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { product, quantity: 1 }]

      if (isDemo) localStorage.setItem(cartKey, JSON.stringify(updated))
      else setSiteItem(cartKey, JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="min-h-screen font-serif bg-[radial-gradient(circle_at_20%_20%,rgba(250,242,222,0.9),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(253,230,138,0.25),transparent_40%),linear-gradient(to_bottom,rgba(255,255,255,0.9),rgba(250,246,240,1))]">
      {/* Top bar */}
      {showContactInfo ? (
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
      ) : null}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-neutral-border">
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
              <div className="text-xs text-neutral-gray tracking-wide">Traditional • Professional</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={withDemo('/templates/pharmacy/2/services')} className="text-neutral-gray hover:text-neutral-dark">Services</Link>
            {showMap ? <a href="#location" className="text-neutral-gray hover:text-neutral-dark">Location</a> : null}
            {showContactInfo ? (
              <Link href={withDemo('/templates/pharmacy/2/contact')} className="text-neutral-gray hover:text-neutral-dark">Contact</Link>
            ) : null}
            <Link href={withDemo('/templates/pharmacy/2/medications')} className="text-[#7a5c2e] font-semibold">Products</Link>
          </nav>

          <Link
            href={withDemo('/templates/pharmacy/2/checkout')}
            className="relative px-4 py-2 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors text-sm flex items-center gap-2"
          >
            <FiShoppingCart />
            <span className="hidden sm:inline">Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Hero */}
      {showHero ? (
        <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm border border-amber-200">
                <FiShield className="text-[#7a5c2e]" />
                <span className="font-semibold tracking-wide text-neutral-dark">Classic care • Professional service</span>
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold leading-tight text-neutral-dark">
                {brand.name || (isDemo ? 'Classic Pharmacy' : 'Your Pharmacy')}
              </h1>
              <p className="mt-4 text-neutral-gray text-base sm:text-lg leading-relaxed">
                {brand.about || (isDemo ? 'Traditional care with a professional touch. Quality medicines, trusted advice, and reliable service.' : '')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={withDemo('/templates/pharmacy/2/medications')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors font-semibold"
                >
                  <FiShoppingBag />
                  Browse Products
                </Link>
                <Link
                  href={withDemo('/templates/pharmacy/2/services')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-white border border-amber-200 text-neutral-dark hover:bg-amber-50 transition-colors font-semibold"
                >
                  View Services
                  <FiArrowRight />
                </Link>
              </div>

              {showOffers ? (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { k: 'Years', v: '20+' },
                    { k: 'Support', v: '7 days' },
                    { k: 'Pickup', v: 'Same day' },
                  ].map((s) => (
                    <div key={s.k} className="rounded-xl bg-white border border-amber-200 px-4 py-3">
                      <div className="text-xs text-neutral-gray tracking-wide">{s.k}</div>
                      <div className="text-lg font-bold text-neutral-dark">{s.v}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <div className="rounded-3xl border-2 border-amber-200 bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                <div className="relative h-[320px] sm:h-[380px] rounded-2xl overflow-hidden bg-amber-50">
                  <Image src="/hero-pharmacy.jpg" alt="Classic pharmacy" fill className="object-cover" priority />
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(43,33,24,0.25),transparent_60%)]" />
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 hidden sm:block rounded-2xl bg-[#2b2118] text-white px-5 py-4 shadow-lg border border-white/10">
                <div className="text-xs text-white/70 tracking-wide">Open hours</div>
                <div className="font-semibold">{brand.openHours || (isDemo ? 'Mon–Sat 09:00–19:00' : '—')}</div>
              </div>
            </div>
          </div>
        </div>
        </section>
      ) : null}

      {/* Product Showcase */}
      {showFeaturedProducts ? (
        <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-dark tracking-tight">Product Showcase</h2>
            <p className="mt-2 text-neutral-gray max-w-2xl">
              Featured items picked from your Pharmacy Setup (or demo items in preview).
            </p>
          </div>
          <Link
            href={withDemo('/templates/pharmacy/2/medications')}
            className="inline-flex items-center gap-2 text-[#7a5c2e] hover:text-[#624824] font-semibold"
          >
            View all products <FiArrowRight />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((p) => {
            const cartItem = cart.find((item) => item.product.id === p.id)
            const quantity = cartItem?.quantity || 0
            return (
              <div key={p.id} className="rounded-2xl border-2 border-amber-200 bg-white p-6 hover:shadow-md transition-shadow">
                <div className="mb-4 h-36 overflow-hidden rounded-xl bg-amber-50">
                  <ProductImage
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    fallbackClassName="grid h-full w-full place-items-center bg-amber-50 text-amber-700"
                    fallbackLabel={p.category || 'No product image'}
                  />
                </div>
                <div className="text-xs text-neutral-gray">{p.category}</div>
                <div className="mt-1 font-semibold text-neutral-dark text-lg">{p.name}</div>
                {p.description && <div className="mt-2 text-sm text-neutral-gray">{p.description}</div>}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#2b2118]">{p.price}</div>
                    <div className={`text-xs ${p.inStock ? 'text-success' : 'text-error'}`}>
                      {p.inStock ? 'In stock' : 'Out of stock'}
                    </div>
                  </div>
                  {quantity > 0 ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateCartQuantityFromHome(p.id, -1)}
                        aria-label="Decrease quantity"
                        className="w-9 h-9 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors"
                      >
                        <FiMinus size={14} />
                      </button>
                      <span className="flex-1 text-center font-semibold text-neutral-dark text-base sm:text-lg">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantityFromHome(p.id, 1)}
                        disabled={!p.inStock}
                        aria-label="Increase quantity"
                        className="w-9 h-9 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiPlus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={!p.inStock}
                      className="px-4 py-2 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
      ) : null}

      {/* Services preview (full page is /services) */}
      <section className="bg-white/70 border-y border-neutral-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-dark">Services</h2>
              <p className="mt-2 text-neutral-gray max-w-2xl">
                Explore our services page for full pharmacy support details.
              </p>
            </div>
            <Link href={withDemo('/templates/pharmacy/2/services')} className="hidden sm:inline-flex text-[#7a5c2e] font-semibold hover:text-[#624824]">
              Open Services Page <FiArrowRight className="ml-2" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Prescription Support', desc: 'Refills, consultation, and pharmacist guidance.' },
              { title: 'Health & Wellness', desc: 'Vitamins, OTC products, and seasonal care.' },
              { title: 'Delivery Options', desc: 'Pickup or delivery for supported products.' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border-2 border-amber-200 bg-white p-6">
                <div className="font-semibold text-neutral-dark">{s.title}</div>
                <div className="mt-2 text-sm text-neutral-gray">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Map */}
      {showMap ? (
        <section id="location" className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-dark">Location Map</h2>
            <p className="mt-2 text-neutral-gray">
              Find us easily on the map and visit us during working hours.
            </p>
            <div className="mt-6 rounded-2xl border border-neutral-border bg-white p-5">
              <div className="text-sm text-neutral-gray">Address</div>
              <div className="mt-1 font-semibold text-neutral-dark">{brand.address || (isDemo ? '45 Health Avenue, City' : '')}</div>
              {brand.phone && (
                <a className="mt-3 inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium" href={`tel:${brand.phone}`}>
                  <FiPhoneCall /> {brand.phone}
                </a>
              )}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-neutral-border bg-white">
            <iframe
              title="Pharmacy location map"
              className="w-full h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Beirut&output=embed"
            />
          </div>
        </div>
        </section>
      ) : null}

      {/* Contact CTA (full page is /contact) */}
      {showContactInfo ? (
        <section className="bg-gradient-to-br from-white to-amber-50 border-t border-neutral-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-dark">Contact</h2>
              <p className="mt-2 text-neutral-gray">
                Use our dedicated contact page for a classic, professional form.
              </p>
              <div className="mt-6 space-y-3 text-sm">
                {brand.phone && (
                  <div className="flex items-center gap-2 text-neutral-dark">
                    <FiPhoneCall className="text-amber-700" />
                    <span>{brand.phone}</span>
                  </div>
                )}
                {brand.address && (
                  <div className="flex items-center gap-2 text-neutral-dark">
                    <FiMapPin className="text-amber-700" />
                    <span>{brand.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-amber-200 bg-white p-6">
              <div className="text-sm text-neutral-gray">Need assistance?</div>
              <div className="mt-1 text-xl font-bold text-neutral-dark">Send us a message</div>
              <p className="mt-2 text-neutral-gray">
                We’ll reply as soon as possible. Use the full contact page to submit your request.
              </p>
              <Link
                href={withDemo('/templates/pharmacy/2/contact')}
                className="mt-6 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors font-semibold"
              >
                Open Contact Page <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
        </section>
      ) : null}

      <footer className="border-t border-neutral-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-gray flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} {brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')}. All rights reserved.</div>
          <div className="opacity-80">Classic Pharmacy</div>
        </div>
      </footer>

      <AIChatbot pharmacyName={brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function Template2HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Template2HomeContent />
    </Suspense>
  )
}


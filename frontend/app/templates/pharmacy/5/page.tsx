'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowRight,
  FiCompass,
  FiMapPin,
  FiPhoneCall,
  FiPlus,
  FiShoppingCart,
  FiSun,
} from 'react-icons/fi'

import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { ProductImage } from '@/components/pharmacy/ProductImage'
import {
  buildTemplatePath,
  calculateSubtotal,
  countCartItems,
  getDemoState,
  loadBrandInfo,
  loadTemplateProducts,
  readCart,
  syncSiteOwner,
  type TemplateBrand,
  type TemplateCartItem,
  type TemplateProduct,
  writeCart,
} from '@/lib/pharmacyTemplateRuntime'

const DEMO_BRAND: TemplateBrand = {
  name: 'HarborLine Pharmacy',
  logo: '/template-2.jpg',
  about:
    'A concierge-inspired pharmacy storefront with clear pathways for families, seniors, and daily wellness shoppers.',
  phone: '+1 (555) 278-3092',
  address: '11 Harbor Street, Boston',
  openHours: 'Mon-Sat 09:00-20:00',
}

const DEMO_PRODUCTS: TemplateProduct[] = [
  { id: 'h-1', name: 'Daily Immunity Pack', category: 'Wellness', description: 'Vitamin C, zinc, and magnesium bundle.', price: '$22.40', inStock: true, stock: 19, imageUrl: '/template-2.jpg' },
  { id: 'h-2', name: 'Gentle Sleep Support', category: 'Sleep', description: 'Melatonin-free botanical night formula.', price: '$18.10', inStock: true, stock: 23, imageUrl: '/template-3.jpg' },
  { id: 'h-3', name: 'Kids Cough Comfort', category: 'Family', description: 'Berry blend syrup for children.', price: '$12.30', inStock: true, stock: 27, imageUrl: '/hero-pharmacy.jpg' },
  { id: 'h-4', name: 'Joint Mobility Capsules', category: 'Supplements', description: 'Turmeric and collagen support capsules.', price: '$24.00', inStock: true, stock: 15, imageUrl: '/logo.jpg' },
]

function TemplateFiveHomeContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const cartKey = demoState.isDemo ? 'pharmacy5_cart_demo' : 'pharmacy5_cart'

  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState<TemplateBrand>(DEMO_BRAND)
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [cart, setCart] = useState<TemplateCartItem[]>([])

  useEffect(() => {
    syncSiteOwner(demoState.ownerId)
  }, [demoState.ownerId])

  useEffect(() => {
    setBrand(loadBrandInfo(demoState.isDemo, DEMO_BRAND))

    const load = async () => {
      const loaded = await loadTemplateProducts(demoState.isDemo, DEMO_PRODUCTS)
      setProducts(loaded)
    }

    void load()
  }, [demoState.isDemo])

  useEffect(() => {
    setCart(readCart(cartKey, demoState.isDemo))
  }, [cartKey, demoState.isDemo])

  useEffect(() => {
    writeCart(cartKey, demoState.isDemo, cart)
  }, [cart, cartKey, demoState.isDemo])

  const featured = useMemo(() => products.slice(0, 3), [products])
  const cartCount = useMemo(() => countCartItems(cart), [cart])
  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])

  const addToCart = (product: TemplateProduct) => {
    if (!product.inStock || (product.stock || 0) <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if ((product.stock || 0) <= existing.quantity) return prev
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...prev, { product, quantity: 1 }]
    })
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fffaf6_0%,#fff_30%,#f8f5ff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/5')} className="inline-flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg">
              <FiSun />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{brand.name || 'HarborLine Pharmacy'}</p>
              <p className="text-xs text-slate-500">Concierge storefront</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <Link href={withDemo('/templates/pharmacy/5/medications')} className="transition hover:text-rose-600">Products</Link>
            <Link href={withDemo('/templates/pharmacy/5/services')} className="transition hover:text-rose-600">Services</Link>
            <Link href={withDemo('/templates/pharmacy/5/contact')} className="transition hover:text-rose-600">Contact</Link>
          </nav>

          <Link
            href={withDemo('/templates/pharmacy/5/checkout')}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow"
          >
            <FiShoppingCart />
            Cart
            {cartCount > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{cartCount}</span> : null}
          </Link>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 md:hidden">
          <Link href={withDemo('/templates/pharmacy/5/medications')} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Products
          </Link>
          <Link href={withDemo('/templates/pharmacy/5/services')} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Services
          </Link>
          <Link href={withDemo('/templates/pharmacy/5/contact')} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Contact
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="animate-soft-rise rounded-[2rem] border border-rose-100 bg-white p-7 shadow-lg shadow-rose-100/40">
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
              <FiCompass /> Personalized care
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Pharmacy experiences shaped around real life schedules.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {brand.about ||
                'HarborLine combines fast ordering, refill reminders, and pharmacist-first support in one modern storefront.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={withDemo('/templates/pharmacy/5/medications')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                Browse products <FiArrowRight />
              </Link>
              <Link
                href={withDemo('/templates/pharmacy/5/services')}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-1 hover:border-rose-300"
              >
                Care services
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Open window', value: brand.openHours || 'Mon-Sat' },
                { label: 'Live cart', value: `${cartCount} items` },
                { label: 'Subtotal', value: `$${subtotal.toFixed(2)}` },
              ].map((item, index) => (
                <div key={item.label} className="animate-soft-rise rounded-2xl border border-rose-100 bg-rose-50/50 p-3" style={{ animationDelay: `${index * 90}ms` }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-rose-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="animate-soft-rise [animation-delay:120ms] rounded-[2rem] border border-slate-200 bg-slate-900 p-7 text-white shadow-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Featured journey</p>
            <h2 className="mt-3 text-2xl font-bold">Family wellness lane</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Curated bundles, scheduled refill reminders, and one-click repeat ordering for high-frequency purchases.
            </p>
            <div className="mt-6 space-y-3">
              {[
                'Pharmacist handoff notes on every order',
                'Fast repeat-purchase drawer',
                'Contact and service pages built in',
              ].map((item) => (
                <div key={item} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 text-xs text-white/70 inline-flex items-center gap-2">
              <FiPhoneCall /> {brand.phone || 'Support phone pending'}
            </div>
            <div className="mt-2 text-xs text-white/70 inline-flex items-center gap-2">
              <FiMapPin /> {brand.address || 'Address pending'}
            </div>
          </article>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Top picks</h2>
              <p className="text-sm text-slate-500">Hover-rich cards and quick add interactions.</p>
            </div>
            <Link href={withDemo('/templates/pharmacy/5/medications')} className="text-sm font-semibold text-rose-600 hover:underline">
              Full catalog
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Add products from dashboard to populate this design.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {featured.map((product, index) => (
                <article key={product.id} className="animate-soft-rise group rounded-3xl border border-rose-100 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl" style={{ animationDelay: `${index * 90}ms` }}>
                  <div className="relative h-40 overflow-hidden rounded-2xl bg-rose-50">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      fallbackClassName="grid h-full place-items-center bg-rose-50 text-rose-500"
                      fallbackLabel={product.category || 'No product image'}
                    />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-rose-500">{product.category}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description || 'No description available.'}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-rose-600">{product.price}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={!product.inStock || (product.stock || 0) <= 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <AIChatbot pharmacyName={brand.name || 'HarborLine Pharmacy'} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function TemplateFiveHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFiveHomeContent />
    </Suspense>
  )
}

'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowRight,
  FiLayers,
  FiMapPin,
  FiPhoneCall,
  FiShoppingCart,
  FiSun,
  FiStar,
  FiTruck,
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
  name: 'AuroraCare Pharmacy',
  logo: '/template-1.jpg',
  about:
    'A vibrant digital pharmacy experience built around curated wellness bundles and friendly clinical support.',
  phone: '+1 (555) 413-8273',
  address: '78 Emerald Avenue, San Francisco',
  openHours: 'Mon-Sun 08:00-22:00',
}

const DEMO_PRODUCTS: TemplateProduct[] = [
  {
    id: 'ac-1',
    name: 'Night Relief Cold Pack',
    category: 'Cold & Flu',
    description: 'Fast bedtime formula for congestion and sore throat support.',
    price: '$14.90',
    inStock: true,
    stock: 24,
    imageUrl: '/template-1.jpg',
  },
  {
    id: 'ac-2',
    name: 'Vitamin D3 + K2 Complex',
    category: 'Supplements',
    description: 'Daily immunity and bone-health blend with optimized absorption.',
    price: '$19.50',
    inStock: true,
    stock: 36,
    imageUrl: '/template-2.jpg',
  },
  {
    id: 'ac-3',
    name: 'Hydra Electrolyte Tabs',
    category: 'Hydration',
    description: 'Rapid hydration tablets for workouts, travel, and hot climates.',
    price: '$11.20',
    inStock: true,
    stock: 42,
    imageUrl: '/template-3.jpg',
  },
  {
    id: 'ac-4',
    name: 'DermCalm Repair Cream',
    category: 'Skincare',
    description: 'Barrier-repair cream for dry and sensitive skin.',
    price: '$17.75',
    inStock: true,
    stock: 18,
    imageUrl: '/hero-pharmacy.jpg',
  },
  {
    id: 'ac-5',
    name: 'Pulse Check BP Monitor',
    category: 'Devices',
    description: 'Compact blood pressure monitor with smart memory sync.',
    price: '$44.90',
    inStock: true,
    stock: 9,
    imageUrl: '/logo.jpg',
  },
]

function TemplateFourHomeContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const cartKey = demoState.isDemo ? 'pharmacy4_cart_demo' : 'pharmacy4_cart'

  const withDemo = useCallback(
    (path: string) => buildTemplatePath(path, demoState),
    [demoState],
  )

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

  const featured = useMemo(() => products.slice(0, 4), [products])
  const categories = useMemo(() => {
    const unique = new Set(products.map((item) => item.category).filter(Boolean))
    return Array.from(unique).slice(0, 6)
  }, [products])

  const cartCount = useMemo(() => countCartItems(cart), [cart])
  const cartSubtotal = useMemo(() => calculateSubtotal(cart), [cart])

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

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev.find((item) => item.product.id === productId)
      if (!current) return prev

      const nextQty = current.quantity + delta
      if (nextQty <= 0) return prev.filter((item) => item.product.id !== productId)
      if ((current.product.stock || 0) < nextQty) return prev

      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: nextQty } : item,
      )
    })
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#e9fff8_0%,_#f7fbff_46%,_#ffffff_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[120px] h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-gentle-float" />
        <div className="absolute right-[-80px] top-[220px] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl animate-gentle-float [animation-delay:300ms]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/4')} className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/25">
              <FiSun />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-900">{brand.name || 'AuroraCare Pharmacy'}</p>
              <p className="text-xs text-slate-500">Express Care Platform</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <span className="inline-flex items-center gap-1.5"><FiPhoneCall className="text-primary" /> {brand.phone || 'Support line'}</span>
            <span className="inline-flex items-center gap-1.5"><FiMapPin className="text-primary" /> {brand.address || 'Address not set'}</span>
          </div>

          <Link
            href={withDemo('/templates/pharmacy/4/checkout')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow"
          >
            <FiShoppingCart />
            <span>Cart</span>
            {cartCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{cartCount}</span> : null}
          </Link>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 md:hidden">
          <Link href={withDemo('/templates/pharmacy/4/medications')} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Catalog
          </Link>
          <Link href={withDemo('/templates/pharmacy/4/checkout')} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            Checkout
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-14">
          <div className="animate-soft-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Wellness Hub
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              A brighter online pharmacy journey with speed built in.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {brand.about ||
                'Launch a high-converting storefront with dynamic categories, product availability, and transparent pricing for every product.'}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={withDemo('/templates/pharmacy/4/medications')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-1 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/35"
              >
                Explore Catalog <FiArrowRight />
              </Link>
              <Link
                href={withDemo('/templates/pharmacy/4/checkout')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-1 hover:border-primary/30 hover:text-primary hover:shadow"
              >
                Continue Checkout
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Active Products', value: String(products.length || 0), icon: FiLayers },
                { label: 'Cart Value', value: `$${cartSubtotal.toFixed(2)}`, icon: FiShoppingCart },
                { label: 'Delivery Window', value: '45 min', icon: FiTruck },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className="animate-soft-rise rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <item.icon className="text-primary" />
                  <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-soft-rise [animation-delay:160ms]">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Top Categories</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <Link
                      key={category}
                      href={withDemo(`/templates/pharmacy/4/medications?category=${encodeURIComponent(category)}`)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
                    >
                      {category}
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No categories yet. Add products from dashboard.</p>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-gradient-to-r from-primary to-cyan-500 p-5 text-white">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/80">
                  <FiStar /> Pharmacy Companion
                </p>
                <p className="mt-2 text-lg font-semibold">Need dosage guidance or alternatives?</p>
                <p className="mt-2 text-sm text-white/85">
                  Use the embedded AI assistant to get pharmacy-safe suggestions before placing an order.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured essentials</h2>
              <p className="mt-1 text-sm text-slate-500">Fast moving products with animated card interactions.</p>
            </div>
            <Link href={withDemo('/templates/pharmacy/4/medications')} className="text-sm font-semibold text-primary hover:underline">
              View full catalog
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              Add products from the dashboard to populate this template.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {featured.map((product, index) => {
                const inCart = cart.find((item) => item.product.id === product.id)
                const quantity = inCart?.quantity || 0
                const disabled = !product.inStock || (product.stock || 0) <= 0

                return (
                  <article
                    key={product.id}
                    className="animate-soft-rise group rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-100 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="relative h-36 overflow-hidden rounded-2xl bg-slate-100">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        fallbackClassName="grid h-full place-items-center bg-slate-100 text-slate-500"
                        fallbackLabel={product.category || 'No product image'}
                      />
                    </div>

                    <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">{product.category}</p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description || 'No description available yet.'}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{product.price}</span>
                      <span className={`text-xs font-semibold ${disabled ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {disabled ? 'Out of stock' : `${product.stock || 0} left`}
                      </span>
                    </div>

                    {quantity > 0 ? (
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, -1)}
                          className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                        >
                          -
                        </button>
                        <span className="text-sm font-semibold text-slate-800">{quantity} in cart</span>
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, 1)}
                          disabled={(product.stock || 0) <= quantity}
                          className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={disabled}
                        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {disabled ? 'Unavailable' : 'Add to cart'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {brand.name || 'AuroraCare Pharmacy'}. Crafted for modern pharmacy commerce.</p>
          <p>This website done by Medify</p>
        </div>
      </footer>

      <AIChatbot pharmacyName={brand.name || 'AuroraCare Pharmacy'} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function TemplateFourHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFourHomeContent />
    </Suspense>
  )
}

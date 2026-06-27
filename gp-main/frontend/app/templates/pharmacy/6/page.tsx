'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiArrowRight,
  FiClock,
  FiCheckCircle,
  FiGrid,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingCart,
  FiTrendingUp,
  FiTruck,
  FiZap,
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
  type TemplateCartItem,
  type TemplateProduct,
  writeCart,
} from '@/lib/pharmacyTemplateRuntime'
import {
  getTemplate6StockPillClasses,
  getTemplate6StockLabel,
  getTemplate6StockStatus,
  getTemplate6StockTone,
  TEMPLATE6_DEMO_BRAND,
  TEMPLATE6_DEMO_PRODUCTS,
} from '@/app/templates/pharmacy/6/data/demo'

function TemplateSixHomeContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const cartKey = demoState.isDemo ? 'pharmacy6_cart_demo' : 'pharmacy6_cart'

  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState(TEMPLATE6_DEMO_BRAND)
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [cart, setCart] = useState<TemplateCartItem[]>([])

  useEffect(() => {
    syncSiteOwner(demoState.ownerId)
  }, [demoState.ownerId])

  useEffect(() => {
    setBrand(loadBrandInfo(demoState.isDemo, TEMPLATE6_DEMO_BRAND))

    const load = async () => {
      const loaded = await loadTemplateProducts(demoState.isDemo, TEMPLATE6_DEMO_PRODUCTS)
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
  const topCategories = useMemo(() => {
    const categories = new Set(products.map((item) => item.category).filter(Boolean))
    return Array.from(categories).slice(0, 5)
  }, [products])
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/6')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-500 text-slate-950"><FiZap /></span>
            {brand.name || 'NeoMeds Studio'}
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-300 md:flex">
            <Link href={withDemo('/templates/pharmacy/6/medications')} className="transition hover:text-lime-300">Catalog</Link>
            <Link href={withDemo('/templates/pharmacy/6/checkout')} className="transition hover:text-lime-300">Checkout</Link>
          </nav>

          <Link href={withDemo('/templates/pharmacy/6/checkout')} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-lime-400">
            <FiShoppingCart /> Cart {cartCount > 0 ? `(${cartCount})` : ''}
          </Link>
        </div>

        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 md:hidden">
          <Link href={withDemo('/templates/pharmacy/6/medications')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200">
            Catalog
          </Link>
          <Link href={withDemo('/templates/pharmacy/6/checkout')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200">
            Checkout
          </Link>
        </div>
      </header>

      <div className="border-b border-lime-500/20 bg-gradient-to-r from-lime-500/10 via-lime-300/5 to-transparent">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs text-slate-300 sm:px-6">
          <p className="inline-flex items-center gap-2"><FiClock className="text-lime-300" /> Same-day dispatch window active for selected zones</p>
          <p className="hidden sm:inline">Fast lane checkout and stock-aware ordering enabled</p>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="animate-soft-rise rounded-[2rem] border border-slate-800 bg-slate-900 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-300">Neo Commerce Flow</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Product-first pharmacy UX with bento precision.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
              {brand.about ||
                'NeoMeds gives high-intent users a fast lane from product discovery to checkout confirmation.'}
            </p>

            {topCategories.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {topCategories.map((category) => (
                  <Link
                    key={category}
                    href={withDemo(`/templates/pharmacy/6/medications?category=${encodeURIComponent(category)}`)}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={withDemo('/templates/pharmacy/6/medications')} className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition duration-300 hover:-translate-y-1 hover:bg-lime-400">
                Open catalog <FiArrowRight />
              </Link>
              <Link href={withDemo('/templates/pharmacy/6/checkout')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-lime-400">
                Continue checkout
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Live products', value: String(products.length || 0), icon: FiGrid },
                { label: 'Cart subtotal', value: `$${subtotal.toFixed(2)}`, icon: FiShoppingCart },
                { label: 'Fulfillment speed', value: '40 min', icon: FiTrendingUp },
              ].map((item, index) => (
                <div key={item.label} className="animate-soft-rise rounded-2xl border border-slate-800 bg-slate-950 p-3" style={{ animationDelay: `${index * 100}ms` }}>
                  <item.icon className="text-lime-300" />
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="text-base font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="animate-soft-rise [animation-delay:120ms] rounded-[2rem] border border-lime-500/40 bg-gradient-to-br from-lime-500/10 to-slate-900 p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Status board</p>
            <h2 className="mt-3 text-2xl font-bold text-white">Rapid mode active</h2>
            <p className="mt-3 text-sm text-slate-200">
              Inventory synchronization and checkout persistence are both active in this template variant.
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-200">
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">Phone: {brand.phone || 'Not configured'}</p>
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">Address: {brand.address || 'Not configured'}</p>
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">Hours: {brand.openHours || 'Not configured'}</p>
            </div>
            <div className="mt-5 grid gap-2 text-xs">
              {[
                'Checkout locks quantity to remaining inventory',
                'Product detail deep-links preserve demo and owner context',
                'Cart state persists across pages in real time',
              ].map((item) => (
                <p key={item} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-300">
                  <FiCheckCircle className="text-lime-300" /> {item}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Verified Stock Logic',
              text: 'Low stock and out-of-stock paths are visually clear before checkout.',
              icon: FiShield,
            },
            {
              title: 'Fast Delivery Flow',
              text: 'Delivery options stay visible through shopping and order completion.',
              icon: FiTruck,
            },
            {
              title: 'Performance First',
              text: 'Dark bento layout with quick actions tuned for high-intent users.',
              icon: FiTrendingUp,
            },
          ].map((item, index) => (
            <article key={item.title} className="animate-soft-rise rounded-2xl border border-slate-800 bg-slate-900/80 p-4" style={{ animationDelay: `${index * 90}ms` }}>
              <item.icon className="text-lime-300" />
              <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Bento products</h2>
              <p className="text-sm text-slate-400">Dark UI with high-contrast interaction states.</p>
            </div>
            <Link href={withDemo('/templates/pharmacy/6/medications')} className="text-sm font-semibold text-lime-300 hover:underline">View all</Link>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center text-slate-400">No products are available right now. Please check back soon.</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {featured.map((product, index) => {
                const inCart = cart.find((item) => item.product.id === product.id)
                const quantity = inCart?.quantity || 0
                const stockStatus = getTemplate6StockStatus(product)
                const outOfStock = stockStatus === 'out'

                return (
                  <article key={product.id} className="animate-soft-rise group rounded-3xl border border-slate-800 bg-slate-900 p-4 transition duration-300 hover:-translate-y-1 hover:border-lime-500/30 hover:shadow-xl hover:shadow-lime-500/10" style={{ animationDelay: `${index * 90}ms` }}>
                    <div className="h-36 overflow-hidden rounded-2xl bg-slate-800">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        fallbackClassName="grid h-full place-items-center bg-slate-800 text-slate-300"
                        fallbackLabel={product.category || 'No product image'}
                      />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.15em] text-lime-300">{product.category}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">{product.description || 'No description available.'}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Link href={withDemo(`/templates/pharmacy/6/product/${product.id}`)} className="text-xs font-semibold text-slate-300 underline-offset-4 hover:text-lime-300 hover:underline">Details</Link>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getTemplate6StockPillClasses(stockStatus)}`}>
                        {getTemplate6StockLabel(stockStatus)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-lime-300">{product.price}</span>
                      <p className={`text-xs font-semibold ${getTemplate6StockTone(stockStatus)}`}>
                        {outOfStock ? 'Unavailable' : `${product.stock || 0} units`}
                      </p>
                    </div>

                    {quantity > 0 ? (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, -1)}
                          aria-label={`Decrease quantity for ${product.name}`}
                          title={`Decrease quantity for ${product.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full border border-slate-700 text-slate-200 transition hover:border-lime-400 hover:text-lime-300"
                        >
                          <FiMinus size={13} />
                        </button>
                        <span className="text-sm font-semibold text-white">{quantity} in cart</span>
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, 1)}
                          disabled={(product.stock || 0) <= quantity}
                          aria-label={`Increase quantity for ${product.name}`}
                          title={`Increase quantity for ${product.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full border border-slate-700 text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-50"
                        >
                          <FiPlus size={13} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => addToCart(product)} disabled={outOfStock} className="mt-3 w-full rounded-xl bg-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">
                        Add to cart
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <AIChatbot pharmacyName={brand.name || 'NeoMeds Studio'} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function TemplateSixHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">Loading...</div>}>
      <TemplateSixHomeContent />
    </Suspense>
  )
}

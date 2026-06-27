'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiFilter,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
} from 'react-icons/fi'

import {
  buildTemplatePath,
  calculateSubtotal,
  countCartItems,
  getDemoState,
  loadBrandInfo,
  loadTemplateProducts,
  parsePriceToNumber,
  readCart,
  syncSiteOwner,
  type TemplateBrand,
  type TemplateCartItem,
  type TemplateProduct,
  writeCart,
} from '@/lib/pharmacyTemplateRuntime'
import { ProductImage } from '@/components/pharmacy/ProductImage'

const DEMO_BRAND: TemplateBrand = {
  name: 'HarborLine Pharmacy',
  logo: '/template-2.jpg',
  about: 'Editorial storefront for concierge pharmacy commerce.',
  phone: '+1 (555) 278-3092',
  address: '11 Harbor Street, Boston',
  openHours: 'Mon-Sat 09:00-20:00',
}

const DEMO_PRODUCTS: TemplateProduct[] = [
  { id: 'hm-1', name: 'Daily Immunity Pack', category: 'Wellness', description: 'Vitamin C, zinc, and magnesium bundle.', price: '$22.40', inStock: true, stock: 19, imageUrl: '/template-2.jpg' },
  { id: 'hm-2', name: 'Gentle Sleep Support', category: 'Sleep', description: 'Melatonin-free botanical night formula.', price: '$18.10', inStock: true, stock: 23, imageUrl: '/template-3.jpg' },
  { id: 'hm-3', name: 'Kids Cough Comfort', category: 'Family', description: 'Berry blend syrup for children.', price: '$12.30', inStock: true, stock: 27, imageUrl: '/hero-pharmacy.jpg' },
  { id: 'hm-4', name: 'Joint Mobility Capsules', category: 'Supplements', description: 'Turmeric and collagen support capsules.', price: '$24.00', inStock: true, stock: 15, imageUrl: '/logo.jpg' },
  { id: 'hm-5', name: 'Women Multi Complete', category: 'Wellness', description: 'Balanced daily multivitamin formula.', price: '$20.00', inStock: true, stock: 13, imageUrl: '/logo.png' },
  { id: 'hm-6', name: 'Evening Calm Tea', category: 'Sleep', description: 'Caffeine-free herbal calming blend.', price: '$9.90', inStock: true, stock: 31, imageUrl: '/template-1.jpg' },
]

type SortValue = 'featured' | 'name' | 'price_low' | 'price_high'

function TemplateFiveMedicationsContent() {
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const cartKey = demoState.isDemo ? 'pharmacy5_cart_demo' : 'pharmacy5_cart'

  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState<TemplateBrand>(DEMO_BRAND)
  const [products, setProducts] = useState<TemplateProduct[]>([])
  const [cart, setCart] = useState<TemplateCartItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortValue>('featured')

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

  const categories = useMemo(() => {
    const unique = new Set(products.map((item) => item.category).filter(Boolean))
    return ['All', ...Array.from(unique).sort()]
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    let next = products.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })

    if (sortBy === 'featured') next = [...next].sort((a, b) => (b.stock || 0) - (a.stock || 0))
    if (sortBy === 'name') next = [...next].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'price_low') next = [...next].sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price))
    if (sortBy === 'price_high') next = [...next].sort((a, b) => parsePriceToNumber(b.price) - parsePriceToNumber(a.price))

    return next
  }, [category, products, search, sortBy])

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#fff_30%,#f8f5ff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/5')} className="text-sm font-semibold text-slate-700 hover:text-rose-600">
            ← Back to template
          </Link>
          <Link href={withDemo('/templates/pharmacy/5/checkout')} className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:shadow">
            <FiShoppingCart />
            Cart {cartCount > 0 ? `(${cartCount})` : ''}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="animate-soft-rise h-fit rounded-3xl border border-rose-100 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Categories</p>
          <div className="mt-3 space-y-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  category === item
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-50 text-slate-700 hover:bg-rose-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-rose-500">Storefront</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{brand.name || 'HarborLine Pharmacy'}</p>
            <p className="mt-1 text-xs text-slate-500">{brand.openHours || 'Hours available after setup'}</p>
          </div>
        </aside>

        <section>
          <div className="animate-soft-rise rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_200px]">
              <label className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search family, wellness, sleep..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pl-10 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />
              </label>

              <label className="relative">
                <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortValue)}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-2.5 pl-10 text-sm outline-none transition focus:border-rose-300"
                >
                  <option value="featured">Featured</option>
                  <option value="name">Name A-Z</option>
                  <option value="price_low">Price low</option>
                  <option value="price_high">Price high</option>
                </select>
              </label>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              No products match your search.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredProducts.map((product, index) => {
                const inCart = cart.find((item) => item.product.id === product.id)
                const quantity = inCart?.quantity || 0
                const outOfStock = !product.inStock || (product.stock || 0) <= 0

                return (
                  <article key={product.id} className="animate-soft-rise rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                      <div className="h-28 overflow-hidden rounded-2xl bg-rose-50">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          fallbackClassName="grid h-full place-items-center bg-rose-50 text-rose-500"
                          fallbackLabel={product.category || 'No product image'}
                        />
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-rose-500">{product.category}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">{product.name}</h3>
                        <p className="mt-2 text-sm text-slate-600">{product.description || 'No description available.'}</p>
                        <div className="mt-2 text-sm font-semibold text-rose-600">{product.price}</div>
                      </div>

                      <div className="sm:text-right">
                        <p className={`text-xs font-semibold ${outOfStock ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {outOfStock ? 'Out of stock' : `${product.stock || 0} available`}
                        </p>
                        {quantity > 0 ? (
                          <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                            <button type="button" onClick={() => updateQty(product.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-300 hover:text-rose-600"><FiMinus size={13} /></button>
                            <span className="min-w-[1.5rem] text-center text-sm font-semibold text-slate-900">{quantity}</span>
                            <button type="button" onClick={() => updateQty(product.id, 1)} disabled={(product.stock || 0) <= quantity} className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"><FiPlus size={13} /></button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => addToCart(product)} disabled={outOfStock} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300">
                            Add item
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {cartCount > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-rose-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{cartCount} items selected</p>
              <p className="text-xs text-slate-500">Subtotal ${subtotal.toFixed(2)}</p>
            </div>
            <Link href={withDemo('/templates/pharmacy/5/checkout')} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600">
              Checkout
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TemplateFiveMedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFiveMedicationsContent />
    </Suspense>
  )
}

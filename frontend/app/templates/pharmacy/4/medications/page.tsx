'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FiChevronRight,
  FiFilter,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiSun,
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
  name: 'AuroraCare Pharmacy',
  logo: '/template-1.jpg',
  about: 'Fast and expressive pharmacy shopping designed for high intent users.',
  phone: '+1 (555) 413-8273',
  address: '78 Emerald Avenue, San Francisco',
  openHours: 'Mon-Sun 08:00-22:00',
}

const DEMO_PRODUCTS: TemplateProduct[] = [
  { id: 'm-1', name: 'Rapid Relief Cold Combo', category: 'Cold & Flu', description: 'Dual action support for congestion and aches.', price: '$16.40', inStock: true, stock: 28, imageUrl: '/template-1.jpg' },
  { id: 'm-2', name: 'Vitamin C + Zinc Gummies', category: 'Supplements', description: 'Daily immunity support with citrus flavor.', price: '$13.20', inStock: true, stock: 34, imageUrl: '/template-2.jpg' },
  { id: 'm-3', name: 'Hydration Mineral Sachets', category: 'Hydration', description: 'Electrolyte support for active days.', price: '$9.50', inStock: true, stock: 40, imageUrl: '/template-3.jpg' },
  { id: 'm-4', name: 'Digestive Comfort Enzymes', category: 'Digestive', description: 'Plant-based digestive support capsules.', price: '$18.90', inStock: true, stock: 16, imageUrl: '/hero-pharmacy.jpg' },
  { id: 'm-5', name: 'Joint Flex Turmeric Tabs', category: 'Supplements', description: 'Turmeric and black pepper daily blend.', price: '$21.00', inStock: true, stock: 12, imageUrl: '/logo.jpg' },
  { id: 'm-6', name: 'Pulse BP Home Monitor', category: 'Devices', description: 'Compact smart monitor for home use.', price: '$46.70', inStock: true, stock: 7, imageUrl: '/logo.png' },
]

type SortValue = 'recommended' | 'price_low' | 'price_high' | 'name'

function TemplateFourMedicationsContent() {
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
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState<SortValue>('recommended')

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

    if (sortBy === 'name') {
      next = [...next].sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortBy === 'price_low') {
      next = [...next].sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price))
    }

    if (sortBy === 'price_high') {
      next = [...next].sort((a, b) => parsePriceToNumber(b.price) - parsePriceToNumber(a.price))
    }

    if (sortBy === 'recommended') {
      next = [...next].sort((a, b) => (b.stock || 0) - (a.stock || 0))
    }

    return next
  }, [category, products, search, sortBy])

  const cartCount = useMemo(() => countCartItems(cart), [cart])
  const subtotal = useMemo(() => calculateSubtotal(cart), [cart])

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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#e9fff8_0%,_#f4fbff_45%,_#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/4')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><FiSun /></span>
            {brand.name || 'AuroraCare Pharmacy'}
          </Link>

          <div className="hidden items-center gap-3 text-xs text-slate-500 sm:flex">
            <span>Catalog</span>
            <FiChevronRight />
            <span className="font-medium text-slate-700">Pharmacy Catalog</span>
          </div>

          <Link
            href={withDemo('/templates/pharmacy/4/checkout')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow"
          >
            <FiShoppingCart />
            Cart
            {cartCount > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{cartCount}</span> : null}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <section className="animate-soft-rise rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search medications, wellness, devices..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-label="Filter products by category"
                  title="Filter products by category"
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary/40"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortValue)}
                aria-label="Sort products"
                title="Sort products"
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary/40"
              >
                <option value="recommended">Recommended</option>
                <option value="name">Name A-Z</option>
                <option value="price_low">Price Low</option>
                <option value="price_high">Price High</option>
              </select>
            </div>
          </div>
        </section>

        {filteredProducts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No products match this filter. Try another search or category.
          </div>
        ) : (
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product, index) => {
              const inCart = cart.find((item) => item.product.id === product.id)
              const quantity = inCart?.quantity || 0
              const outOfStock = !product.inStock || (product.stock || 0) <= 0

              return (
                <article
                  key={product.id}
                  className="animate-soft-rise group rounded-3xl border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="relative h-44 overflow-hidden rounded-2xl bg-slate-100">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      fallbackClassName="grid h-full place-items-center bg-slate-100 text-slate-500"
                      fallbackLabel={product.category || 'No product image'}
                    />
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">{product.category}</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{product.name}</h3>
                    </div>
                    <span className="text-lg font-bold text-primary">{product.price}</span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description || 'No description yet.'}</p>

                  <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                    <span className={outOfStock ? 'text-rose-500' : 'text-emerald-600'}>
                      {outOfStock ? 'Out of stock' : `${product.stock || 0} in stock`}
                    </span>
                  </div>

                  {quantity > 0 ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, -1)}
                        aria-label={`Decrease quantity for ${product.name}`}
                        title={`Decrease quantity for ${product.name}`}
                        className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                      >
                        <FiMinus size={14} />
                      </button>
                      <span className="text-sm font-semibold text-slate-900">{quantity} added</span>
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, 1)}
                        disabled={(product.stock || 0) <= quantity}
                        aria-label={`Increase quantity for ${product.name}`}
                        title={`Increase quantity for ${product.name}`}
                        className="h-8 w-8 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
                      >
                        <FiPlus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {outOfStock ? 'Unavailable' : 'Add to cart'}
                    </button>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </main>

      {cartCount > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{cartCount} items ready</p>
              <p className="text-xs text-slate-500">Subtotal ${subtotal.toFixed(2)}</p>
            </div>
            <Link
              href={withDemo('/templates/pharmacy/4/checkout')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Checkout <FiChevronRight />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function TemplateFourMedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
      <TemplateFourMedicationsContent />
    </Suspense>
  )
}

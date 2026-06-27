'use client'

import Link from 'next/link'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  FiArrowLeft,
  FiClock,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingCart,
  FiTruck,
  FiZap,
} from 'react-icons/fi'

import {
  buildTemplatePath,
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
import { ProductImage } from '@/components/pharmacy/ProductImage'
import {
  getTemplate6StockLabel,
  getTemplate6StockPillClasses,
  getTemplate6StockStatus,
  getTemplate6StockTone,
  TEMPLATE6_DEMO_BRAND,
  TEMPLATE6_DEMO_PRODUCTS,
} from '@/app/templates/pharmacy/6/data/demo'

function TemplateSixProductContent() {
  const params = useParams()
  const productId = String(params?.id || '')
  const searchParams = useSearchParams()
  const demoState = useMemo(() => getDemoState(searchParams), [searchParams])
  const cartKey = demoState.isDemo ? 'pharmacy6_cart_demo' : 'pharmacy6_cart'

  const withDemo = useCallback((path: string) => buildTemplatePath(path, demoState), [demoState])

  const [brand, setBrand] = useState(TEMPLATE6_DEMO_BRAND)
  const [catalog, setCatalog] = useState<TemplateProduct[]>([])
  const [product, setProduct] = useState<TemplateProduct | null>(null)
  const [cart, setCart] = useState<TemplateCartItem[]>([])
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    syncSiteOwner(demoState.ownerId)
  }, [demoState.ownerId])

  useEffect(() => {
    setBrand(loadBrandInfo(demoState.isDemo, TEMPLATE6_DEMO_BRAND))

    const load = async () => {
      const loaded = await loadTemplateProducts(demoState.isDemo, TEMPLATE6_DEMO_PRODUCTS)
      setCatalog(loaded)
    }

    void load()
  }, [demoState.isDemo])

  useEffect(() => {
    setCart(readCart(cartKey, demoState.isDemo))
  }, [cartKey, demoState.isDemo])

  useEffect(() => {
    writeCart(cartKey, demoState.isDemo, cart)
  }, [cart, cartKey, demoState.isDemo])

  useEffect(() => {
    if (!productId) return
    const found = catalog.find((item) => String(item.id) === String(productId)) || null
    setProduct(found)
  }, [catalog, productId])

  const cartCount = useMemo(() => countCartItems(cart), [cart])
  const existingQuantityInCart = useMemo(() => {
    if (!product) return 0
    return cart.find((item) => item.product.id === product.id)?.quantity || 0
  }, [cart, product])
  const maxAddable = Math.max(0, (product?.stock || 0) - existingQuantityInCart)

  useEffect(() => {
    if (maxAddable <= 0) {
      setQuantity(1)
      return
    }
    setQuantity((prev) => Math.max(1, Math.min(prev, maxAddable)))
  }, [maxAddable])

  const addToCart = () => {
    if (!product) return
    if (!product.inStock || (product.stock || 0) <= 0) return
    if (maxAddable <= 0) {
      setMessage('Maximum available quantity is already in your cart.')
      return
    }

    const addQuantity = Math.max(1, Math.min(quantity, maxAddable))

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + addQuantity }
            : item,
        )
      }

      return [...prev, { product, quantity: addQuantity }]
    })

    setMessage(addQuantity === 1 ? 'Added to cart.' : `Added ${addQuantity} units to cart.`)
    setQuantity(1)
    window.setTimeout(() => setMessage(''), 1800)
  }

  if (!product) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2 text-sm text-slate-400">This item is unavailable or no longer in the catalog.</p>
          <Link href={withDemo('/templates/pharmacy/6/medications')} className="mt-5 inline-flex rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-400">
            Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  const stockStatus = getTemplate6StockStatus(product)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/6/medications')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FiArrowLeft /> Back to catalog
          </Link>
          <Link href={withDemo('/templates/pharmacy/6/checkout')} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-lime-400">
            <FiShoppingCart /> Cart {cartCount > 0 ? `(${cartCount})` : ''}
          </Link>
        </div>
      </header>

      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-slate-400 sm:px-6">
          <Link href={withDemo('/templates/pharmacy/6')} className="transition hover:text-lime-300">Home</Link>
          <span>/</span>
          <Link href={withDemo('/templates/pharmacy/6/medications')} className="transition hover:text-lime-300">Medications</Link>
          <span>/</span>
          <span className="text-slate-200">{product.name}</span>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <section className="animate-soft-rise rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="h-[360px] overflow-hidden rounded-2xl bg-slate-800 sm:h-[420px]">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              fallbackClassName="grid h-full place-items-center bg-slate-800 text-slate-300"
              fallbackLabel={product.category || 'No product image'}
              loading="eager"
            />
          </div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.16em] text-lime-300">Clinical note</p>
            <p className="mt-2">Always follow package instructions and consult your pharmacist for interactions.</p>
          </div>
        </section>

        <section className="animate-soft-rise [animation-delay:120ms] rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-lime-500/40 bg-lime-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">
            <FiZap /> {product.category}
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">{product.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{product.description || 'No description provided.'}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getTemplate6StockPillClasses(stockStatus)}`}>
              {getTemplate6StockLabel(stockStatus)}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
              Category: {product.category}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Price</span>
              <span className="text-2xl font-bold text-lime-300">{product.price}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">Stock</span>
              <span className={`text-sm font-semibold ${getTemplate6StockTone(stockStatus)}`}>
                {getTemplate6StockLabel(stockStatus)}
                {stockStatus === 'out' ? '' : ` - ${product.stock || 0} units`}
              </span>
            </div>
            {existingQuantityInCart > 0 ? (
              <p className="mt-2 text-xs text-slate-400">Already in cart: {existingQuantityInCart}</p>
            ) : null}
            {maxAddable > 0 ? (
              <p className="mt-1 text-xs text-slate-400">You can add up to {maxAddable} more units.</p>
            ) : null}
          </div>

          {(product.stock || 0) > 0 ? (
            <div className="mt-5 space-y-4">
              <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                <button type="button" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-slate-700 text-slate-200 transition hover:border-lime-400 hover:text-lime-300"><FiMinus size={13} /></button>
                <span className="min-w-[2rem] text-center text-sm font-semibold text-white">{quantity}</span>
                <button type="button" onClick={() => setQuantity((prev) => Math.min(Math.max(1, maxAddable), prev + 1))} disabled={maxAddable <= 1} className="grid h-8 w-8 place-items-center rounded-full border border-slate-700 text-slate-200 transition hover:border-lime-400 hover:text-lime-300 disabled:opacity-50"><FiPlus size={13} /></button>
              </div>

              <button type="button" onClick={addToCart} disabled={maxAddable <= 0} className="w-full rounded-xl bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">
                {maxAddable <= 0 ? 'Max quantity in cart' : 'Add to cart'}
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold text-rose-400">This product is currently out of stock.</p>
          )}

          {message ? <p className="mt-3 text-sm font-medium text-lime-300">{message}</p> : null}

          <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">{brand.name || 'NeoMeds Studio'}</p>
            <p className="mt-1">{brand.phone || 'Phone not configured'}</p>
            <p className="mt-1">{brand.address || 'Address not configured'}</p>
          </div>

          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <p className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300"><FiShield className="text-lime-300" /> Verified quality</p>
            <p className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300"><FiTruck className="text-lime-300" /> Same-day options</p>
            <p className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300"><FiClock className="text-lime-300" /> Live stock updates</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function TemplateSixProductPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100">Loading...</div>}>
      <TemplateSixProductContent />
    </Suspense>
  )
}

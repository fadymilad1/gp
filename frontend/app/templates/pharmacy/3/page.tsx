'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi'

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

function Template3HomeContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams?.get('demo') === '1' || searchParams?.get('demo') === 'true'
  const ownerId = searchParams?.get('owner') || ''
  const cartKey = isDemo ? 'pharmacy3_cart_demo' : 'pharmacy3_cart'

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
    const user = getStoredUser()
    if (ownerId) setSiteOwnerId(ownerId)
    else if (user?.id) setSiteOwnerId(user.id)
    
    const localSetup = getSiteItem('pharmacySetup')
    const localInfo = getSiteItem('businessInfo')
    if (localSetup) setPharmacySetup(safeJsonParse<PharmacySetup>(localSetup))
    if (localInfo) setBusinessInfo(safeJsonParse<BusinessInfo>(localInfo))
  }, [ownerId])

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
    const hasCustomInfo = Boolean(businessInfo?.name || pharmacySetup?.phone || pharmacySetup?.address)
    if (isDemo && !hasCustomInfo) {
      return {
        name: 'Minimal Pharmacy',
        logo: '/mod logo.png',
        about: 'Simple, fast, and focused on the products your patients need every day.',
        phone: '+1 (555) 345-6789',
        address: '12 Simple Street, City',
      }
    }

    const info = businessInfo
    const setup = pharmacySetup
    return {
      name: info?.name?.trim() || (isDemo ? 'Minimal Pharmacy' : ''),
      logo: info?.logo || (isDemo ? '/mod logo.png' : null),
      about: info?.about?.trim() || (isDemo ? 'Simple, fast, and focused on the products your patients need every day.' : ''),
      phone: info?.contactPhone || setup?.phone || (isDemo ? '+1 (555) 345-6789' : ''),
      address: info?.address || setup?.address || (isDemo ? '12 Simple Street, City' : ''),
    }
  }, [businessInfo, pharmacySetup, isDemo])

  const themeSettings = useMemo(
    () => getStoredPharmacyThemeSettings(),
    [],
  )

  const showHero = !themeSettings || isSectionEnabled(themeSettings, 'hero')
  const showFeaturedProducts = !themeSettings || isSectionEnabled(themeSettings, 'featuredProducts')
  const showContactInfo = !themeSettings || isSectionEnabled(themeSettings, 'contactInfo')

  const products = useMemo<Product[]>(() => {
    const list = pharmacySetup?.products?.filter((p) => p.name?.trim()) ?? []
    
    if (isDemo && list.length === 0) {
      return [
        {
          id: 'm1',
          name: 'Paracetamol 500mg',
          category: 'Pain Relief',
          description: 'Everyday pain and fever relief.',
          price: '$4.99',
          inStock: true,
          imageUrl: '/template-1.jpg',
        },
        {
          id: 'm2',
          name: 'Vitamin C 1000mg',
          category: 'Vitamins',
          description: 'Immune support effervescent tablets.',
          price: '$12.50',
          inStock: true,
          imageUrl: '/template-2.jpg',
        },
        {
          id: 'm3',
          name: 'Saline Nasal Spray',
          category: 'Cold & Flu',
          description: 'Gentle relief for nasal congestion.',
          price: '$3.99',
          inStock: true,
          imageUrl: '/template-3.jpg',
        },
        {
          id: 'm4',
          name: 'Hand Sanitizer 500ml',
          category: 'Personal Care',
          description: 'Alcohol-based hand sanitizer gel.',
          price: '$4.49',
          inStock: true,
          imageUrl: '/hero-pharmacy.jpg',
        },
      ].slice(0, 3)
    }

    return list
      .map((p, idx) => ({
        id: (p as any).id?.toString() || `user-${idx}`,
        name: p.name,
        category: p.category || 'General',
        description: p.description,
        price: p.price || '$0.00',
        inStock: p.inStock !== false,
        imageUrl: p.imageUrl || p.image_url || '',
      }))
      .slice(0, 3)
  }, [pharmacySetup, isDemo])

  // Estimate total products for display (we only show a few here)
  const totalProductCount = useMemo(() => {
    if (isDemo) {
      return 20
    }
    const list = pharmacySetup?.products?.filter((p) => p.name?.trim()) ?? []
    return list.length || 20
  }, [pharmacySetup, isDemo])

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )

  const addToCart = (product: Product) => {
    if (!product.inStock) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const updated = existing
        ? prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...prev, { product, quantity: 1 }]

      if (isDemo) localStorage.setItem(cartKey, JSON.stringify(updated))
      else setSiteItem(cartKey, JSON.stringify(updated))
      return updated
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const newQuantity = item.quantity + delta
      const updated =
        newQuantity <= 0
          ? prev.filter((i) => i.product.id !== productId)
          : prev.map((i) =>
              i.product.id === productId ? { ...i, quantity: newQuantity } : i,
            )
      if (isDemo) localStorage.setItem(cartKey, JSON.stringify(updated))
      else setSiteItem(cartKey, JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="min-h-screen bg-white text-neutral-dark flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <Link href={withDemo('/templates/pharmacy/3')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-light flex items-center justify-center overflow-hidden border border-neutral-border">
              {isDemo ? (
                <Image src="/mod logo.png" alt="Logo" width={40} height={40} className="object-cover" />
              ) : (
                <BrandLogo
                  src={brand.logo}
                  alt={`${brand.name || 'Pharmacy'} logo`}
                  fallbackText={brand.name || 'P'}
                  imageClassName="w-full h-full object-contain p-0.5"
                  fallbackClassName="w-full h-full bg-neutral-dark text-white flex items-center justify-center text-sm font-bold"
                />
              )}
            </div>
            <div className="leading-tight">
              <div className="font-semibold">
                {brand.name || (isDemo ? 'Minimal Pharmacy' : 'Your Pharmacy')}
              </div>
              {showContactInfo && brand.address && (
                <div className="text-xs text-neutral-gray truncate max-w-[14rem]">
                  {brand.address}
                </div>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {showContactInfo && brand.phone && (
              <a
                href={`tel:${brand.phone}`}
                className="hidden sm:inline text-sm text-neutral-gray hover:text-neutral-dark"
              >
                {brand.phone}
              </a>
            )}
            <Link
              href={withDemo('/templates/pharmacy/3/checkout')}
              className="relative inline-flex items-center gap-2 rounded-full border border-neutral-border px-4 py-2 text-sm hover:bg-neutral-light transition-colors"
            >
              <FiShoppingCart />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="ml-1 rounded-full bg-primary text-white text-xs px-2 py-0.5">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {/* Simple hero */}
        {showHero ? (
          <section className="border-b border-neutral-border bg-neutral-light/60">
          <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {brand.name || (isDemo ? 'Minimal Pharmacy' : 'Your Pharmacy')}
              </h1>
              <p className="mt-2 text-sm text-neutral-gray max-w-xl">
                {brand.about ||
                  (isDemo
                    ? 'A clean, minimal online pharmacy focused on products and fast ordering.'
                    : 'Add your short pharmacy description in Business Info.')}
              </p>
            </div>
            <Link
              href={withDemo('/templates/pharmacy/3/medications')}
              className="inline-flex items-center justify-center rounded-full border border-neutral-border px-4 py-2 text-sm hover:bg-white transition-colors"
            >
              View all products
            </Link>
          </div>
          </section>
        ) : null}

        {/* Product grid (minimal) */}
        {showFeaturedProducts ? (
          <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Products</h2>
              <p className="text-xs sm:text-sm text-neutral-gray">
                Showing {products.length} of {totalProductCount}+ items
              </p>
            </div>
            <Link
              href={withDemo('/templates/pharmacy/3/medications')}
              className="text-xs sm:text-sm text-primary hover:underline"
            >
              More products
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-border bg-white p-8 text-center text-neutral-gray text-sm">
              No products are available right now. Please check back soon.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const cartItem = cart.find((item) => item.product.id === p.id)
                const quantity = cartItem?.quantity || 0
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-neutral-border bg-white p-4 flex flex-col justify-between"
                  >
                    <div className="mb-3 h-36 overflow-hidden rounded-lg bg-neutral-light/60">
                      <ProductImage
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="grid h-full w-full place-items-center bg-neutral-light/60 text-neutral-gray"
                        fallbackLabel={p.category || 'No product image'}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-gray mb-1">{p.category}</div>
                      <div className="font-semibold text-sm sm:text-base">{p.name}</div>
                      {p.description && (
                        <div className="mt-2 text-xs text-neutral-gray line-clamp-2">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-neutral-dark text-sm">{p.price}</div>
                        <div
                          className={`text-xs ${
                            p.inStock ? 'text-success' : 'text-error'
                          }`}
                        >
                          {p.inStock ? 'In stock' : 'Out of stock'}
                        </div>
                      </div>
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, -1)}
                            aria-label="Decrease quantity"
                            className="w-8 h-8 rounded-full border border-neutral-border flex items-center justify-center text-xs hover:bg-neutral-light"
                          >
                            <FiMinus size={12} />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-medium">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, 1)}
                            disabled={!p.inStock}
                            aria-label="Increase quantity"
                            className="w-8 h-8 rounded-full border border-neutral-border flex items-center justify-center text-xs hover:bg-neutral-light disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiPlus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(p)}
                          disabled={!p.inStock}
                          className="px-4 py-2 rounded-full border border-neutral-border text-xs sm:text-sm hover:bg-neutral-light disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {p.inStock ? 'Add to cart' : 'Out of stock'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </section>
        ) : null}
      </main>

      <footer className="border-t border-neutral-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs sm:text-sm text-neutral-gray flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>
            © {new Date().getFullYear()}{' '}
            {brand.name || (isDemo ? 'Minimal Pharmacy' : 'Pharmacy')}. All rights reserved.
          </div>
          <div className="opacity-80">This website done by Medify</div>
        </div>
      </footer>


    </div>
  )
}

export default function Template3HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Template3HomeContent />
    </Suspense>
  )
}


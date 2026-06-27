'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiClock, FiMapPin, FiPhoneCall, FiPlus, FiMinus, FiSearch, FiShoppingCart } from 'react-icons/fi'
import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { ProductImage } from '@/components/pharmacy/ProductImage'
import { getSiteItem, setSiteItem, removeSiteItem, setSiteOwnerId } from '@/lib/storage'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

type Product = {
  id: string
  name: string
  category: string
  description?: string
  price: string
  inStock: boolean
  stock?: number
  imageUrl?: string
}

type CartItem = { product: Product; quantity: number }

type PharmacySetup = {
  phone?: string
  address?: string
  products?: Array<{ name: string; category?: string; description?: string; price?: string; inStock?: boolean; stock?: number; imageUrl?: string; image_url?: string }>
}

type BusinessInfo = {
  name?: string
  logo?: string
  contactPhone?: string
  address?: string
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const demoProducts: Product[] = [
  { id: 'd1', name: 'Vitamin D3 2000IU', category: 'Vitamins', description: 'Daily support for bone health and immunity.', price: '$15.99', inStock: true, stock: 24 },
  { id: 'd2', name: 'Allergy Relief 24h', category: 'OTC', description: 'Non-drowsy relief for seasonal allergies.', price: '$13.99', inStock: true, stock: 18 },
  { id: 'd3', name: 'First Aid Kit', category: 'Care', description: 'Essentials for home and travel.', price: '$19.99', inStock: true, stock: 12 },
  { id: 'd4', name: 'Ibuprofen 200mg', category: 'Pain Relief', description: 'Fast pain relief for headaches & fever.', price: '$9.99', inStock: true, stock: 30 },
  { id: 'd5', name: 'Digital Thermometer', category: 'Wellness', description: 'Accurate readings in seconds.', price: '$7.99', inStock: true, stock: 16 },
]

function Template2MedicationsContent() {
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

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [pharmacyProducts, setPharmacyProducts] = useState<Product[]>([])

  useEffect(() => {
    if (ownerId) {
      setSiteOwnerId(ownerId)
    }
  }, [ownerId])

  useEffect(() => {
    if (isDemo) return

    // Load from backend API when owner is logged in
    const fetchProducts = async () => {
      let loadedFromBackend = false
      
      try {
        const token = localStorage.getItem('access_token')   // Fixed: use access_token
        if (token) {
          const response = await fetch(`${API_URL}/pharmacy/products/`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          
          if (response.ok) {
            const data = await response.json()
            const dataList = Array.isArray(data)
              ? data
              : Array.isArray((data as any)?.results)
                ? (data as any).results
                : []
            // Only use backend data if we have products
            if (dataList.length > 0) {
              const apiProducts: Product[] = dataList.map((p: any, idx: number) => ({
                id: p.id?.toString() || `api-${idx}`,
                name: p.name,
                category: p.category || 'General',
                description: p.description,
                price: `$${parseFloat(p.price || 0).toFixed(2)}`,
                stock: typeof p.stock === 'number' ? p.stock : (p.stock ? parseInt(String(p.stock), 10) : undefined),
                inStock: p.in_stock !== false && (typeof p.stock === 'number' ? p.stock > 0 : true),
                imageUrl: p.image_url_resolved || p.image_url || '',
              }))
              setPharmacyProducts(apiProducts)
              loadedFromBackend = true
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load products from API:', err)
      }

      // If backend didn't provide products, load from localStorage
      if (!loadedFromBackend) {
        console.log('Loading products from localStorage...')
        const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
        const list = setup?.products?.filter((p) => p.name?.trim()) ?? []
        setPharmacyProducts(
          list.map((p, idx) => {
            const stock =
              typeof (p as any).stock === 'number' && !Number.isNaN((p as any).stock) && (p as any).stock >= 0
                ? Math.floor((p as any).stock)
                : undefined
            return {
              id: `user-${idx}`,
              name: p.name,
              category: p.category || 'General',
              description: p.description,
              price: p.price || '$0.00',
              stock,
              inStock: stock !== undefined ? stock > 0 : p.inStock !== false,
              imageUrl: (p as any).imageUrl || (p as any).image_url || '',
            }
          })
        )
      }
    }
    
    fetchProducts()
  }, [isDemo])

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

  const allProducts = useMemo(() => (isDemo ? demoProducts : pharmacyProducts), [isDemo, pharmacyProducts])

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category))
    return ['All', ...Array.from(cats).sort()]
  }, [allProducts])

  const filtered = useMemo(() => {
    let list = allProducts
    if (selectedCategory !== 'All') list = list.filter((p) => p.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allProducts, selectedCategory, searchQuery])

  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const maxStock = item.product.stock
      const proposed = item.quantity + delta

      if (maxStock !== undefined && proposed > maxStock) {
        return prev
      }

      const newQuantity = proposed
      const updated =
        newQuantity <= 0 ? prev.filter((i) => i.product.id !== productId) : prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQuantity } : i))
      return updated
    })
  }

  const addToCart = (product: Product) => {
    const maxStock = product.stock
    if (maxStock !== undefined && maxStock <= 0) return
    if (!product.inStock && (maxStock === undefined || maxStock <= 0)) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const currentQty = existing?.quantity ?? 0

      if (maxStock !== undefined && currentQty >= maxStock) {
        return prev
      }

      return existing
        ? prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { product, quantity: 1 }]
    })
  }

  const [brand, setBrand] = useState<{
    name: string
    logo: string | null
    phone: string
    address: string
  }>({
    name: '',
    logo: null,
    phone: '',
    address: '',
  })

  useEffect(() => {
    if (isDemo) {
      setBrand({
        name: 'Classic Pharmacy',
        logo: '/mod logo.png',
        phone: '+1 (555) 234-5678',
        address: '45 Health Avenue, City',
      })
    } else {
      const businessInfo = safeJsonParse<BusinessInfo>(getSiteItem('businessInfo'))
      const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
      setBrand({
        name: businessInfo?.name?.trim() || '',
        logo: businessInfo?.logo || null,
        phone: businessInfo?.contactPhone || setup?.phone || '',
        address: businessInfo?.address || setup?.address || '',
      })
    }
  }, [isDemo])

  return (
    <div className="min-h-screen font-serif bg-[radial-gradient(circle_at_20%_20%,rgba(250,242,222,0.9),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.9),rgba(250,246,240,1))] flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="bg-[#2b2118] text-white">
          <div className="mx-auto max-w-7xl px-4 py-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm">
            <div className="flex items-center gap-2">
              <FiClock className="text-amber-200" />
              <span>{isDemo ? 'Mon–Sat 09:00–19:00' : ''}</span>
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

        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-neutral-border">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
            <Link href={withDemo('/templates/pharmacy/2')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center overflow-hidden border border-amber-300 shadow-sm">
                {isDemo ? (
                  <Image src="/mod logo.png" alt="Logo" width={40} height={40} className="object-cover" />
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
                <div className="text-xs text-neutral-gray">Products</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href={withDemo('/templates/pharmacy/2')} className="text-neutral-gray hover:text-neutral-dark">Home</Link>
              <Link href={withDemo('/templates/pharmacy/2/medications')} className="text-[#7a5c2e] font-semibold">Products</Link>
              <Link href={withDemo('/templates/pharmacy/2/services')} className="text-neutral-gray hover:text-neutral-dark">Services</Link>
              <Link href={withDemo('/templates/pharmacy/2/contact')} className="text-neutral-gray hover:text-neutral-dark">Contact</Link>
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

        {/* Search & Filters */}
        <section className="bg-white/70 border-b border-neutral-border">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-neutral-border rounded-lg focus:ring-2 focus:ring-[#7a5c2e] focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#7a5c2e] text-white'
                        : 'bg-white border border-neutral-border text-neutral-dark hover:bg-neutral-light'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-dark">
              {selectedCategory === 'All' ? 'All Products' : selectedCategory}
            </h2>
            <p className="text-sm text-neutral-gray">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'} found
            </p>
          </div>

          {!isDemo && pharmacyProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-border bg-white p-8 text-center text-neutral-gray">
              No products are available right now. Please check back soon.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-gray text-lg">No products found.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                }}
                className="mt-4 px-6 py-2 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product) => {
                const cartItem = cart.find((item) => item.product.id === product.id)
                const quantity = cartItem?.quantity || 0
                return (
                  <div key={product.id} className="rounded-2xl bg-white border-2 border-amber-200 p-6 hover:shadow-md transition-shadow">
                    <div className="mb-4 h-36 overflow-hidden rounded-xl bg-amber-50">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="grid h-full w-full place-items-center bg-amber-50 text-amber-700"
                        fallbackLabel={product.category || 'No product image'}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="text-xs text-neutral-gray mb-1">{product.category}</div>
                        <h3 className="font-semibold text-neutral-dark text-sm leading-tight">{product.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#2b2118] text-base sm:text-lg">{product.price}</div>
                        <div
                          className={`text-xs sm:text-sm ${
                            product.stock === 0 || !product.inStock ? 'text-error' : 'text-success'
                          }`}
                        >
                          {product.stock !== undefined
                            ? `${product.stock} in stock`
                            : product.inStock
                              ? 'Available'
                              : '0 in stock'}
                        </div>
                      </div>
                    </div>

                    {product.description && <p className="text-xs text-neutral-gray mb-4 line-clamp-2">{product.description}</p>}

                    {quantity > 0 ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                          aria-label="Decrease quantity"
                          className="w-9 h-9 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors"
                        >
                          <FiMinus size={14} />
                        </button>
                        <span className="flex-1 text-center font-semibold text-neutral-dark text-base sm:text-lg">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
                          disabled={
                            !product.inStock ||
                            (product.stock !== undefined && quantity >= product.stock)
                          }
                          aria-label="Increase quantity"
                          className="w-9 h-9 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiPlus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!product.inStock || product.stock === 0}
                        className="w-full px-4 py-2 rounded-lg bg-[#7a5c2e] text-white hover:bg-[#624824] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-neutral-border mt-16 bg-white/70">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-gray flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} {brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')}. All rights reserved.</div>
          <div className="opacity-80">Classic Pharmacy</div>
        </div>
      </footer>

      <AIChatbot pharmacyName={brand.name || (isDemo ? 'Classic Pharmacy' : 'Pharmacy')} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function Template2MedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Template2MedicationsContent />
    </Suspense>
  )
}


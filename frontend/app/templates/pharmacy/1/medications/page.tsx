'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useMemo, useState, Suspense } from 'react'
import { FiSearch, FiShoppingCart, FiPlus, FiMinus, FiClock, FiMapPin, FiPhoneCall } from 'react-icons/fi'
import { AIChatbot } from '@/components/pharmacy/AIChatbot'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { useSearchParams } from 'next/navigation'
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

type CartItem = {
  product: Product
  quantity: number
}

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

type SortOption = 'featured' | 'name_asc' | 'price_low' | 'price_high' | 'stock_high'

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const defaultMedications: Product[] = [
  { id: '1', name: 'Ibuprofen 200mg', category: 'Pain Relief', description: 'Fast pain relief for headaches & fever. Non-prescription.', price: '$9.99', inStock: true, stock: 40 },
  { id: '2', name: 'Acetaminophen 500mg', category: 'Pain Relief', description: 'Effective for pain and fever reduction.', price: '$7.50', inStock: true, stock: 35 },
  { id: '3', name: 'Aspirin 81mg', category: 'Pain Relief', description: 'Low-dose aspirin for heart health.', price: '$5.99', inStock: true, stock: 50 },
  { id: '4', name: 'Naproxen 220mg', category: 'Pain Relief', description: 'Extended relief for muscle aches.', price: '$12.99', inStock: true, stock: 25 },
  { id: '5', name: 'Vitamin C 1000mg', category: 'Vitamins', description: 'Daily immune support with antioxidants.', price: '$12.50', inStock: true, stock: 30 },
  { id: '6', name: 'Vitamin D3 2000IU', category: 'Vitamins', description: 'Bone health and immune function support.', price: '$15.99', inStock: true, stock: 30 },
  { id: '7', name: 'Multivitamin Daily', category: 'Vitamins', description: 'Complete daily nutrition supplement.', price: '$18.75', inStock: true, stock: 20 },
  { id: '8', name: 'Omega-3 Fish Oil', category: 'Vitamins', description: 'Heart and brain health support.', price: '$22.50', inStock: true, stock: 18 },
  { id: '9', name: 'Allergy Relief', category: 'OTC', description: 'Non-drowsy allergy support for seasonal symptoms.', price: '$14.25', inStock: true, stock: 26 },
  { id: '10', name: 'Nasal Decongestant', category: 'OTC', description: 'Relief from nasal congestion.', price: '$8.99', inStock: true, stock: 22 },
  { id: '11', name: 'Cough Syrup', category: 'OTC', description: 'Multi-symptom cough and cold relief.', price: '$11.50', inStock: true, stock: 15 },
  { id: '12', name: 'Antihistamine Tablets', category: 'OTC', description: '24-hour allergy relief.', price: '$13.99', inStock: true, stock: 28 },
  { id: '13', name: 'Digital Thermometer', category: 'Wellness', description: 'Accurate readings in seconds.', price: '$7.99', inStock: true, stock: 12 },
  { id: '14', name: 'Blood Pressure Monitor', category: 'Wellness', description: 'Home monitoring device.', price: '$45.99', inStock: true, stock: 8 },
  { id: '15', name: 'First Aid Kit', category: 'Care', description: 'Essentials for home and travel.', price: '$19.99', inStock: true, stock: 16 },
  { id: '16', name: 'Hand Sanitizer 500ml', category: 'Care', description: 'Alcohol-based sanitizer.', price: '$4.99', inStock: true, stock: 60 },
  { id: '17', name: 'Metformin 500mg', category: 'Prescription', description: 'Requires prescription. Diabetes management.', price: '$24.99', inStock: true, stock: 14 },
  { id: '18', name: 'Lisinopril 10mg', category: 'Prescription', description: 'Requires prescription. Blood pressure control.', price: '$19.50', inStock: true, stock: 18 },
  { id: '19', name: 'Atorvastatin 20mg', category: 'Prescription', description: 'Requires prescription. Cholesterol management.', price: '$28.75', inStock: true, stock: 10 },
  { id: '20', name: 'Baby Care Bundle', category: 'Family', description: 'Gentle essentials for newborn care.', price: '$24.99', inStock: false, stock: 0 },
  { id: '21', name: 'Children\'s Tylenol', category: 'Family', description: 'Safe pain relief for children.', price: '$9.50', inStock: true, stock: 24 },
  { id: '22', name: 'Prenatal Vitamins', category: 'Family', description: 'Essential nutrients for expecting mothers.', price: '$16.99', inStock: true, stock: 20 },
]

function MedicationsPageContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams?.get('demo') === '1' || searchParams?.get('demo') === 'true'
  const ownerId = searchParams?.get('owner') || ''
  const queryCategory = searchParams?.get('category') || ''
  const cartKey = isDemo ? 'pharmacy_cart_demo' : 'pharmacy_cart'
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [pharmacyProducts, setPharmacyProducts] = useState<Product[]>([])

  useEffect(() => {
    if (ownerId) {
      setSiteOwnerId(ownerId)
    }
  }, [ownerId])

  useEffect(() => {
    if (!isDemo) {
      const fetchProducts = async () => {
        let loadedFromBackend = false
        
        try {
          const token = localStorage.getItem('access_token')
          if (token) {
            const response = await fetch(`${API_URL}/pharmacy/products/?sync=1`, {
              headers: { 'Authorization': `Bearer ${token}` },
            })
            
            if (response.ok) {
              const data = await response.json()
              const dataList = Array.isArray(data)
                ? data
                : Array.isArray((data as any)?.results)
                  ? (data as any).results
                  : []
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
        
        if (!loadedFromBackend) {
          const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
          if (setup?.products) {
            const userProducts: Product[] = setup.products
              .filter((p) => p.name?.trim())
              .map((p, idx) => ({
                id: (p as any).id?.toString() || `user-${idx}`,
                name: p.name,
                category: p.category || 'General',
                description: p.description,
                price: p.price || '$0.00',
                stock: typeof (p as any).stock === 'number' && !Number.isNaN((p as any).stock) && (p as any).stock >= 0
                  ? Math.floor((p as any).stock)
                  : undefined,
                inStock:
                  typeof (p as any).stock === 'number'
                    ? (p as any).stock > 0
                    : p.inStock !== false,
                imageUrl: (p as any).imageUrl || (p as any).image_url || '',
              }))
            setPharmacyProducts(userProducts)
          }
        }
      }
      
      void fetchProducts()

      const reloadFromCache = () => {
        const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
        if (!setup?.products?.length) return
        setPharmacyProducts(
          setup.products
            .filter((p) => p.name?.trim())
            .map((p, idx) => ({
              id: (p as any).id?.toString() || `user-${idx}`,
              name: p.name,
              category: p.category || 'General',
              description: p.description,
              price: p.price || '$0.00',
              stock: typeof (p as any).stock === 'number' ? Math.floor((p as any).stock) : undefined,
              inStock: typeof (p as any).stock === 'number' ? (p as any).stock > 0 : p.inStock !== false,
              imageUrl: (p as any).imageUrl || (p as any).image_url || '',
            })),
        )
      }

      const onSync = () => {
        void fetchProducts()
        reloadFromCache()
      }

      window.addEventListener('pharmacy-products-synced', onSync)
      return () => window.removeEventListener('pharmacy-products-synced', onSync)
    }
  }, [isDemo])

  useEffect(() => {
    const raw = isDemo ? localStorage.getItem(cartKey) : getSiteItem(cartKey)
    const savedCart = safeJsonParse<CartItem[]>(raw)
    if (savedCart) setCart(savedCart)
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

  const allProducts = useMemo(() => {
    if (isDemo) {
      return defaultMedications
    }
    return pharmacyProducts
  }, [pharmacyProducts, isDemo])

  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category))
    return ['All', ...Array.from(cats).sort()]
  }, [allProducts])

  useEffect(() => {
    if (!queryCategory) return
    const normalized = queryCategory.trim().toLowerCase()
    const matched = categories.find((c) => c.toLowerCase() === normalized)
    if (matched) {
      setSelectedCategory(matched)
    }
  }, [queryCategory, categories])

  const parsePrice = (priceText: string) => {
    const numeric = parseFloat((priceText || '').replace(/[^0-9.]/g, ''))
    return Number.isNaN(numeric) ? 0 : numeric
  }

  const filteredProducts = useMemo(() => {
    let filtered = allProducts

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    if (inStockOnly) {
      filtered = filtered.filter((p) => (p.stock !== undefined ? p.stock > 0 : p.inStock !== false))
    }

    const sorted = [...filtered]
    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price_low':
        sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
        break
      case 'price_high':
        sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price))
        break
      case 'stock_high':
        sorted.sort((a, b) => (b.stock || 0) - (a.stock || 0))
        break
      default:
        sorted.sort((a, b) => {
          const inStockA = a.stock !== undefined ? a.stock > 0 : a.inStock !== false
          const inStockB = b.stock !== undefined ? b.stock > 0 : b.inStock !== false
          if (inStockA !== inStockB) return inStockA ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        break
    }

    return sorted
  }, [allProducts, selectedCategory, searchQuery, inStockOnly, sortBy])

  const addToCart = (product: Product) => {
    const maxStock = product.stock
    if (maxStock !== undefined && maxStock <= 0) return
    if (!product.inStock && (maxStock === undefined || maxStock <= 0)) return

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      const currentQty = existing?.quantity ?? 0

      if (maxStock !== undefined && currentQty >= maxStock) {
        return prev
      }

      const updated = existing
        ? prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
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

      const maxStock = item.product.stock
      const proposed = item.quantity + delta

      if (maxStock !== undefined && proposed > maxStock) {
        return prev
      }

      const newQuantity = proposed
      const updated = newQuantity <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQuantity } : i))

      if (updated.length > 0) {
        if (isDemo) localStorage.setItem(cartKey, JSON.stringify(updated))
        else setSiteItem(cartKey, JSON.stringify(updated))
      } else {
        if (isDemo) localStorage.removeItem(cartKey)
        else removeSiteItem(cartKey)
      }
      return updated
    })
  }

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }, [cart])

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = parsePrice(item.product.price)
      return sum + itemPrice * item.quantity
    }, 0)
  }, [cart])

  const inStockCount = useMemo(() => {
    return allProducts.filter((p) => (p.stock !== undefined ? p.stock > 0 : p.inStock !== false)).length
  }, [allProducts])

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
        name: 'Modern Pharmacy',
        logo: '/mod logo.png',
        phone: '+1 (555) 123-4567',
        address: '123 Main Street, City',
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
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-neutral-dark text-white">
        <div className="mx-auto max-w-7xl px-4 py-2 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-sm">
          <div className="flex items-center gap-2">
            <FiClock />
            <span>{isDemo ? 'Mon–Fri 09:00–17:00' : ''}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {brand.phone && (
              <>
                <a className="inline-flex items-center gap-2 hover:underline" href={`tel:${brand.phone}`}>
                  <FiPhoneCall />
                  <span>{brand.phone}</span>
                </a>
                {brand.address && <span className="hidden sm:inline opacity-60">•</span>}
              </>
            )}
            {brand.address && (
              <div className="inline-flex items-center gap-2">
                <FiMapPin />
                <span className="truncate max-w-[28rem]">{brand.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-neutral-border">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <Link href={withDemo("/templates/pharmacy/1")} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center overflow-hidden">
              {isDemo ? (
                <Image src="/mod logo.png" alt="Logo" width={40} height={40} className="object-cover" />
              ) : (
                <BrandLogo
                  src={brand.logo}
                  alt={`${brand.name || 'Pharmacy'} logo`}
                  fallbackText={brand.name || 'P'}
                  imageClassName="w-full h-full object-cover"
                  fallbackClassName="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-xs"
                />
              )}
            </div>
            <div className="leading-tight">
              <div className="font-bold text-neutral-dark">{brand.name || (isDemo ? 'Modern Pharmacy' : 'Pharmacy')}</div>
              <div className="text-xs text-neutral-gray">Pharmacy & Wellness</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href={withDemo("/templates/pharmacy/1")} className="text-neutral-gray hover:text-neutral-dark">
              Home
            </Link>
            <Link href={withDemo("/templates/pharmacy/1/medications")} className="text-primary font-medium">
              Medications
            </Link>
            <Link href={withDemo("/templates/pharmacy/1#contact")} className="text-neutral-gray hover:text-neutral-dark">
              Contact
            </Link>
          </nav>
          <Link
            href={withDemo("/templates/pharmacy/1/checkout")}
            className="relative px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm flex items-center gap-2"
          >
            <FiShoppingCart />
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Search & Filters */}
      <section className="bg-neutral-light/50 border-b border-neutral-border">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Search bar: full width on its own row so you can see what you type */}
          <div className="w-full mb-4">
            <div className="relative w-full max-w-full">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" size={22} />
              <input
                type="text"
                placeholder="Search medications, vitamins, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-0 pl-12 pr-4 py-3.5 text-base border border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-white border border-neutral-border text-neutral-dark hover:bg-neutral-light'
                  }`}
                >
                  {cat}
                </button>
              ))}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-border bg-white px-4 py-3">
              <div className="text-xs text-neutral-gray">Products</div>
              <div className="text-lg font-bold text-neutral-dark">{allProducts.length}</div>
            </div>
            <div className="rounded-lg border border-neutral-border bg-white px-4 py-3">
              <div className="text-xs text-neutral-gray">In Stock</div>
              <div className="text-lg font-bold text-success">{inStockCount}</div>
            </div>
            <div className="rounded-lg border border-neutral-border bg-white px-4 py-3">
              <div className="text-xs text-neutral-gray">Categories</div>
              <div className="text-lg font-bold text-neutral-dark">{Math.max(categories.length - 1, 0)}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="sort-products" className="text-sm text-neutral-gray">Sort</label>
              <select
                id="sort-products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-neutral-border rounded-lg bg-white text-sm"
              >
                <option value="featured">Featured</option>
                <option value="name_asc">Name A-Z</option>
                <option value="price_low">Price Low to High</option>
                <option value="price_high">Price High to Low</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-dark">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4"
              />
              Show in-stock only
            </label>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        {cartItemCount > 0 && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary-light/40 px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-neutral-dark font-medium">{cartItemCount} items in cart</div>
              <div className="text-xs text-neutral-gray">Subtotal: ${cartSubtotal.toFixed(2)}</div>
            </div>
            <Link
              href={withDemo("/templates/pharmacy/1/checkout")}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-dark">
            {selectedCategory === 'All' ? 'All Medications & Products' : selectedCategory}
          </h2>
          <p className="text-sm text-neutral-gray">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} found
          </p>
        </div>

        {!isDemo && pharmacyProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-border bg-white p-8 text-center text-neutral-gray">
            No products are available right now. Please check back soon.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-gray text-lg">No products found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
              }}
              className="mt-4 px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.product.id === product.id)
              const quantity = cartItem?.quantity || 0
              const stockValue = typeof product.stock === 'number' ? product.stock : undefined
              const isOutOfStock = stockValue !== undefined ? stockValue <= 0 : !product.inStock
              const isLowStock = stockValue !== undefined && stockValue > 0 && stockValue < 5
              const stockLabel = isOutOfStock
                ? 'Out of stock'
                : isLowStock
                  ? 'Low stock'
                  : 'In stock'

              return (
                <div
                  key={product.id}
                  className="rounded-2xl bg-white border border-neutral-border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="mb-4 h-36 overflow-hidden rounded-xl bg-neutral-light/60">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      fallbackClassName="grid h-full w-full place-items-center bg-neutral-light/60 text-neutral-gray"
                      fallbackLabel={product.category || 'No product image'}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="text-xs text-neutral-gray mb-1">{product.category}</div>
                      <h3 className="font-semibold text-neutral-dark text-sm leading-tight">{product.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{product.price}</div>
                      <div
                        className={`text-xs font-medium ${
                          isOutOfStock ? 'text-error' : isLowStock ? 'text-amber-600' : 'text-success'
                        }`}
                      >
                        {stockLabel}
                      </div>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-xs text-neutral-gray mb-4 line-clamp-2">{product.description}</p>
                  )}

                  {quantity > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, -1)}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors"
                      >
                        <FiMinus size={14} />
                      </button>
                      <span className="flex-1 text-center font-medium text-neutral-dark">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, 1)}
                        disabled={
                          !product.inStock ||
                          (product.stock !== undefined && quantity >= product.stock)
                        }
                        aria-label="Increase quantity"
                        className="w-8 h-8 rounded-lg border border-neutral-border flex items-center justify-center hover:bg-neutral-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiPlus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className="w-full px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Floating Cart Button (Mobile) */}
      {cartItemCount > 0 && (
        <Link
          href={withDemo("/templates/pharmacy/1/checkout")}
          className="fixed bottom-6 right-6 md:hidden bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-dark transition-colors z-40"
        >
          <div className="relative">
            <FiShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {cartItemCount}
            </span>
          </div>
        </Link>
      )}

      <footer className="border-t border-neutral-border mt-16 bg-gradient-to-b from-white to-neutral-light/30">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-neutral-gray flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} {brand.name || (isDemo ? 'Modern Pharmacy' : 'Pharmacy')}. All rights reserved.</div>
          <div className="opacity-80">This website done by Medify</div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <AIChatbot pharmacyName={brand.name || (isDemo ? 'Modern Pharmacy' : 'Pharmacy')} pharmacyPhone={brand.phone || ''} />
    </div>
  )
}

export default function MedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <MedicationsPageContent />
    </Suspense>
  )
}

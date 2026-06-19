'use client'

import Link from 'next/link'
import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FiMinus, FiPlus, FiShoppingCart, FiSearch, FiFilter, FiPackage } from 'react-icons/fi'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { ProductImage } from '@/components/pharmacy/ProductImage'
import { normalizeRenderableProductImageUrl } from '@/lib/productImage'
import { getSiteItem, setSiteItem, removeSiteItem, setPublicSiteItem, setSiteOwnerId } from '@/lib/storage'

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
  products?: Array<{ name: string; category?: string; description?: string; price?: string; inStock?: boolean; stock?: number; imageUrl?: string; image_url?: string }>
}

type BusinessInfo = {
  name?: string
  logo?: string
  about?: string
  address?: string
  contactPhone?: string
}

type SortOption = 'name' | 'price-low' | 'price-high' | 'stock'

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const demoProducts: Product[] = [
  { id: 'd1', name: 'Paracetamol 500mg', category: 'Pain Relief', description: 'Tablets for everyday pain relief.', price: '$4.99', inStock: true, stock: 30 },
  { id: 'd2', name: 'Ibuprofen 200mg', category: 'Pain Relief', description: 'Anti-inflammatory pain reliever.', price: '$6.49', inStock: true, stock: 24 },
  { id: 'd3', name: 'Vitamin C 1000mg', category: 'Vitamins', description: 'Immune system support.', price: '$9.99', inStock: true, stock: 20 },
  { id: 'd4', name: 'Allergy Relief 24h', category: 'Allergy', description: 'Non-drowsy allergy tablets.', price: '$13.99', inStock: true, stock: 18 },
  { id: 'd5', name: 'Saline Nasal Spray', category: 'Cold & Flu', description: 'Gentle nasal spray.', price: '$3.99', inStock: true, stock: 40 },
]

function Template3MedicationsContent() {
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

  const [cart, setCart] = useState<CartItem[]>([])
  const [pharmacyProducts, setPharmacyProducts] = useState<Product[]>([])
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('name')

  useEffect(() => {
    if (ownerId) {
      setSiteOwnerId(ownerId)
    }
  }, [ownerId])

  // Load business info
  useEffect(() => {
    if (isDemo) {
      setBusinessInfo({
        name: 'Minimal Pharmacy',
        logo: '/mod logo.png'
      })
      return
    }
    
    const info = safeJsonParse<BusinessInfo>(getSiteItem('businessInfo'))
    setBusinessInfo(info)
  }, [isDemo])

  // Load products from backend API
  useEffect(() => {
    if (isDemo) return
    
    const loadProducts = async () => {
      setIsLoadingProducts(true)
      let loadedFromBackend = false
      
      try {
        // Try to load from backend API first
        const token = localStorage.getItem('access_token')
        if (token) {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
          const response = await fetch(`${API_URL}/pharmacy/products/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const products = await response.json()
            const productList = Array.isArray(products)
              ? products
              : Array.isArray((products as any)?.results)
                ? (products as any).results
                : []
            
            // Only use backend data if we actually have products
            if (productList.length > 0) {
              setPharmacyProducts(
                productList.map((p: any, idx: number) => ({
                  id: p.id || `product-${idx}`,
                  name: p.name,
                  category: p.category || 'General',
                  description: p.description || '',
                  price: `$${parseFloat(p.price || 0).toFixed(2)}`,
                  stock: typeof p.stock === 'number' ? p.stock : (p.stock ? parseInt(String(p.stock), 10) : 0),
                  inStock: p.in_stock !== false && (typeof p.stock === 'number' ? p.stock > 0 : true),
                  imageUrl: normalizeRenderableProductImageUrl(p.image_url_resolved || p.image_url || ''),
                }))
              )
              loadedFromBackend = true
            }
          }
        }
      } catch (error) {
        console.error('Failed to load products from backend:', error)
      }

      // If backend didn't provide products, load from localStorage
      if (!loadedFromBackend) {
        const setup = safeJsonParse<PharmacySetup>(getSiteItem('pharmacySetup'))
        const list = setup?.products?.filter((p) => p.name?.trim()) ?? []
        
        if (list.length > 0) {
          setPharmacyProducts(
            list.map((p, idx) => {
              // Parse stock more robustly - handle both number and string
              let stockValue: number | undefined = undefined
              if ((p as any).stock !== undefined && (p as any).stock !== null) {
                const parsed = typeof (p as any).stock === 'number' 
                  ? (p as any).stock 
                  : parseInt(String((p as any).stock), 10)
                if (!isNaN(parsed) && parsed >= 0) {
                  stockValue = Math.floor(parsed)
                }
              }

              // Ensure price is formatted
              let priceFormatted = p.price || '$0.00'
              if (!priceFormatted.startsWith('$')) {
                const priceNum = parseFloat(priceFormatted)
                priceFormatted = isNaN(priceNum) ? '$0.00' : `$${priceNum.toFixed(2)}`
              }

              return {
                id: `user-${idx}`,
                name: p.name,
                category: p.category || 'General',
                description: p.description || '',
                price: priceFormatted,
                stock: stockValue,
                inStock: stockValue !== undefined ? stockValue > 0 : (p as any).inStock !== false,
                imageUrl: normalizeRenderableProductImageUrl((p as any).imageUrl || (p as any).image_url || ''),
              }
            })
          )
        }
      }

      setIsLoadingProducts(false)
    }

    loadProducts()
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

  useEffect(() => {
    if (isDemo || allProducts.length === 0) return
    const serialized = JSON.stringify(allProducts)
    setSiteItem('template3ProductsCache', serialized)
    setPublicSiteItem('template3ProductsCache', serialized)
  }, [allProducts, isDemo])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category))
    return ['All', ...Array.from(cats).sort()]
  }, [allProducts])

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    let filtered = allProducts

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      )
    }

    // Sort products
    const sorted = [...filtered]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price-low':
        sorted.sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''))
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''))
          return priceA - priceB
        })
        break
      case 'price-high':
        sorted.sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''))
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''))
          return priceB - priceA
        })
        break
      case 'stock':
        sorted.sort((a, b) => (b.stock || 0) - (a.stock || 0))
        break
    }

    return sorted
  }, [allProducts, selectedCategory, searchQuery, sortBy])

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )

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
        newQuantity <= 0
          ? prev.filter((i) => i.product.id !== productId)
          : prev.map((i) =>
              i.product.id === productId ? { ...i, quantity: newQuantity } : i,
            )
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
        ? prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...prev, { product, quantity: 1 }]
    })
  }

  // Stock badge component helper - FIXED: Only checks stock number
  const getStockBadge = (product: Product) => {
    const stock = product.stock
    
    // Fix: ONLY check stock number, not inStock flag
    if (stock === undefined || stock === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          Out of Stock
        </span>
      )
    }
    
    if (stock < 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          Low Stock
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
        In Stock
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-border bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <Link href={withDemo('/templates/pharmacy/3')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm bg-white flex items-center justify-center">
              <BrandLogo
                src={businessInfo?.logo || null}
                alt={`${businessInfo?.name || 'Pharmacy'} Logo`}
                fallbackText={businessInfo?.name || 'P'}
                imageClassName="w-full h-full object-contain p-1"
                fallbackClassName="w-full h-full bg-neutral-dark text-white flex items-center justify-center text-lg font-bold"
              />
            </div>
            <span className="text-xl font-bold text-neutral-dark">
              {businessInfo?.name || 'Minimal Pharmacy'}
            </span>
          </Link>
          <Link
            href={withDemo('/templates/pharmacy/3/checkout')}
            className="relative inline-flex items-center gap-2 rounded-full border-2 border-neutral-border px-5 py-2.5 text-sm font-bold hover:bg-neutral-light transition-colors shadow-sm bg-white"
          >
            <FiShoppingCart size={20} />
            <span className="hidden sm:inline">Cart</span>
            {cartItemCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-white text-xs font-bold px-2.5 py-1">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Search, Filter, and Sort Section */}
        <section className="bg-white border-b border-neutral-border shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" size={18} />
                <input
                  type="text"
                  placeholder="Search products by name, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-border text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                />
              </div>
              
              {/* Category Filter */}
              <div className="relative">
                <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" size={16} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-9 pr-8 py-2.5 rounded-lg border border-neutral-border text-sm focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white cursor-pointer min-w-[160px] font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <FiPackage className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none" size={16} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="pl-9 pr-8 py-2.5 rounded-lg border border-neutral-border text-sm focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white cursor-pointer min-w-[160px] font-medium"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="stock">Stock Level</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-between gap-2 mb-6">
            <h1 className="text-2xl font-bold text-neutral-dark">
              {selectedCategory === 'All' ? 'All Products' : selectedCategory}
            </h1>
            <p className="text-sm text-neutral-gray font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </p>
          </div>

          {isLoadingProducts ? (
            <div className="rounded-xl border border-neutral-border bg-white p-12 text-center shadow-sm">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent"></div>
              <p className="mt-4 text-sm text-neutral-gray font-medium">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-neutral-border bg-white p-12 text-center text-neutral-gray shadow-sm">
              <FiPackage className="mx-auto mb-4 text-neutral-gray/50" size={48} />
              <p className="text-base font-medium mb-1">No products found</p>
              <p className="text-sm">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Check back later for updates.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((item) => item.product.id === product.id)
                const quantity = cartItem?.quantity || 0
                // FIX: Only check stock number, not inStock flag
                const isOutOfStock = product.stock === 0 || product.stock === undefined
                
                return (
                  <div
                    key={product.id}
                    className="group rounded-xl border border-neutral-border bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    <div className="bg-gradient-to-br from-gray-100 to-gray-50 h-48 flex items-center justify-center border-b border-neutral-border overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="grid h-full w-full place-items-center bg-gradient-to-br from-gray-100 to-gray-50 text-gray-400"
                        fallbackLabel={product.category || 'No product image'}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                          {product.category}
                        </span>
                        {getStockBadge(product)}
                      </div>

                      <Link 
                        href={withDemo(`/templates/pharmacy/3/product/${product.id}`)}
                        className="block mb-3"
                      >
                        <h3 className="font-bold text-lg text-neutral-dark group-hover:text-primary transition-colors line-clamp-2 cursor-pointer">
                          {product.name}
                        </h3>
                      </Link>

                      {product.description && (
                        <p className="text-sm text-neutral-gray line-clamp-2 mb-4">
                          {product.description}
                        </p>
                      )}

                      {/* Price and Stock Info with Labels */}
                      <div className="mt-auto space-y-2 mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Price:</span>
                          <span className="text-2xl font-bold text-neutral-dark">{product.price}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                          <span className="text-sm font-medium text-gray-600">Stock:</span>
                          <span className={`text-lg font-bold ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
                            {product.stock !== undefined ? `${product.stock} units` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Cart Controls */}
                      {quantity > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 justify-center bg-neutral-light rounded-lg p-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                updateQuantity(product.id, -1)
                              }}
                              aria-label="Decrease quantity"
                              className="w-9 h-9 rounded-full border-2 border-neutral-border flex items-center justify-center text-lg hover:bg-white hover:shadow-sm transition-all font-bold"
                            >
                              <FiMinus size={16} />
                            </button>
                            <span className="min-w-[3rem] text-center text-xl font-bold text-neutral-dark">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                updateQuantity(product.id, 1)
                              }}
                              disabled={
                                isOutOfStock ||
                                (product.stock !== undefined && quantity >= product.stock)
                              }
                              aria-label="Increase quantity"
                              className="w-9 h-9 rounded-full border-2 border-neutral-border flex items-center justify-center text-lg hover:bg-white hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                            >
                              <FiPlus size={16} />
                            </button>
                          </div>
                          <Link
                            href={withDemo(`/templates/pharmacy/3/product/${product.id}`)}
                            className="block w-full px-4 py-2.5 text-center rounded-lg font-semibold text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all"
                          >
                            View Details
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product)
                            }}
                            disabled={isOutOfStock}
                            className="w-full px-4 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-primary text-white hover:bg-primary/90 hover:shadow-md flex items-center justify-center gap-2"
                          >
                            <FiShoppingCart size={16} />
                            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                          <Link
                            href={withDemo(`/templates/pharmacy/3/product/${product.id}`)}
                            className="block w-full px-4 py-2.5 text-center rounded-lg font-semibold text-sm border-2 border-neutral-border text-neutral-dark hover:bg-gray-50 transition-all"
                          >
                            View Details
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default function Template3MedicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Template3MedicationsContent />
    </Suspense>
  )
}


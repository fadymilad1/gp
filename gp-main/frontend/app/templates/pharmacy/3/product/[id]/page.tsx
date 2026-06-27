'use client'

import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingCart, FiPackage } from 'react-icons/fi'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'
import { ProductImage } from '@/components/pharmacy/ProductImage'
import { normalizeRenderableProductImageUrl } from '@/lib/productImage'
import { getSiteItem, setSiteItem, setSiteOwnerId } from '@/lib/storage'

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

type BusinessInfo = {
  name?: string
  logo?: string
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function ProductDetailsContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = params?.id as string
  const isDemo = searchParams?.get('demo') === '1'
  const ownerId = searchParams?.get('owner') || ''
  const cartKey = isDemo ? 'pharmacy3_cart_demo' : 'pharmacy3_cart'

  const [product, setProduct] = useState<Product | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [cartWarning, setCartWarning] = useState('')

  const withDemo = (path: string) => {
    const [base, hash] = path.split('#')
    const [pathname, query = ''] = base.split('?')
    const params = new URLSearchParams(query)
    if (isDemo) params.set('demo', '1')
    if (ownerId) params.set('owner', ownerId)
    const nextQuery = params.toString()
    return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash ? `#${hash}` : ''}`
  }

  useEffect(() => {
    if (ownerId) {
      setSiteOwnerId(ownerId)
    }
  }, [ownerId])

  // Load business info
  useEffect(() => {
    if (isDemo) {
      setBusinessInfo({ name: 'Minimal Pharmacy', logo: '/mod logo.png' })
    } else {
      const info = safeJsonParse<BusinessInfo>(getSiteItem('businessInfo'))
      setBusinessInfo(info)
    }
  }, [isDemo])

  // Load cart
  useEffect(() => {
    const raw = isDemo ? localStorage.getItem(cartKey) : getSiteItem(cartKey)
    const saved = safeJsonParse<CartItem[]>(raw)
    setCart(saved || [])
  }, [cartKey, isDemo])

  // Load product
  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true)
      try {
        // Try backend first
        const token = localStorage.getItem('access_token')
        if (token && !isDemo) {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
          const response = await fetch(`${API_URL}/pharmacy/products/${productId}/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const p = await response.json()
            setProduct({
              id: p.id,
              name: p.name,
              category: p.category || 'General',
              description: p.description || '',
              price: `$${parseFloat(p.price || 0).toFixed(2)}`,
              stock: typeof p.stock === 'number' ? p.stock : 0,
              inStock: typeof p.stock === 'number' ? p.stock > 0 : false,
              imageUrl: normalizeRenderableProductImageUrl(p.image_url_resolved || p.image_url || ''),
            })
            setIsLoading(false)
            return
          }
        }

        // Fallback to cached catalog (set by medications page)
        const cachedCatalog = safeJsonParse<Product[]>(getSiteItem('template3ProductsCache')) || []
        const cachedProduct = cachedCatalog.find((item) => String(item.id) === String(productId))
        if (cachedProduct) {
          setProduct(cachedProduct)
          setIsLoading(false)
          return
        }

        // Fallback to localStorage
        const setup = safeJsonParse<any>(getSiteItem('pharmacySetup'))
        const products = setup?.products || []
        const foundProduct = products.find((_: any, idx: number) => `user-${idx}` === productId)
        
        if (foundProduct) {
          // Parse stock correctly - it might be a number or string
          let stockValue = 0
          if (foundProduct.stock !== undefined && foundProduct.stock !== null) {
            const parsed = typeof foundProduct.stock === 'number' 
              ? foundProduct.stock 
              : parseInt(String(foundProduct.stock), 10)
            stockValue = isNaN(parsed) ? 0 : Math.max(0, parsed)
          }

          // Ensure price is formatted
          let priceFormatted = foundProduct.price || '$0.00'
          if (!priceFormatted.startsWith('$')) {
            const priceNum = parseFloat(priceFormatted)
            priceFormatted = isNaN(priceNum) ? '$0.00' : `$${priceNum.toFixed(2)}`
          }

          setProduct({
            id: productId,
            name: foundProduct.name,
            category: foundProduct.category || 'General',
            description: foundProduct.description || '',
            price: priceFormatted,
            stock: stockValue,
            inStock: stockValue > 0,
            imageUrl: normalizeRenderableProductImageUrl(foundProduct.imageUrl || foundProduct.image_url || ''),
          })
        }
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      loadProduct()
    }
  }, [productId, isDemo])

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const addToCart = () => {
    if (!product || product.stock === 0) return
    setCartWarning('')

    const maxStock = product.stock || 0
    const currentInCart = cart.find(item => item.product.id === product.id)?.quantity || 0
    const canAdd = currentInCart + quantity <= maxStock

    if (!canAdd) {
      setCartWarning(`Only ${maxStock} units available. You already have ${currentInCart} in cart.`)
      return
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const updated = existing
        ? prev.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
          )
        : [...prev, { product, quantity }]

      if (isDemo) {
        localStorage.setItem(cartKey, JSON.stringify(updated))
      } else {
        setSiteItem(cartKey, JSON.stringify(updated))
      }
      return updated
    })

    setAddedFeedback(true)
    window.setTimeout(() => setAddedFeedback(false), 1800)
    setQuantity(1)
  }

  const incrementQuantity = () => {
    if (product && product.stock && quantity < product.stock) {
      setCartWarning('')
      setQuantity(quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setCartWarning('')
      setQuantity(quantity - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiPackage className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link
            href={withDemo('/templates/pharmacy/3/medications')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <FiArrowLeft />
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const isOutOfStock = product.stock === 0
  const stockStatus = isOutOfStock
    ? { text: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-200' }
    : product.stock && product.stock < 5
    ? { text: `Low Stock`, color: 'text-orange-600 bg-orange-50 border-orange-200' }
    : { text: 'In Stock', color: 'text-green-600 bg-green-50 border-green-200' }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-border bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <Link href={withDemo('/templates/pharmacy/3')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm bg-white flex items-center justify-center">
              <BrandLogo
                src={businessInfo?.logo || null}
                alt={`${businessInfo?.name || 'Pharmacy'} Logo`}
                fallbackText={businessInfo?.name || 'P'}
                imageClassName="w-full h-full object-contain p-1"
                fallbackClassName="w-full h-full bg-neutral-dark text-white flex items-center justify-center text-sm font-bold"
              />
            </div>
            <span className="text-lg font-bold text-neutral-dark">
              {businessInfo?.name || 'Minimal Pharmacy'}
            </span>
          </Link>
          <Link
            href={withDemo('/templates/pharmacy/3/checkout')}
            className="relative inline-flex items-center gap-2 rounded-full border border-neutral-border px-4 py-2.5 text-sm font-medium hover:bg-neutral-light transition-colors shadow-sm bg-white"
          >
            <FiShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            {cartItemCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-white text-xs font-semibold px-2.5 py-0.5">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 w-full">
        <Link
          href={withDemo('/templates/pharmacy/3/medications')}
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6 font-medium"
        >
          <FiArrowLeft size={18} />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-neutral-border p-8 flex items-center justify-center shadow-sm overflow-hidden min-h-[360px]">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full max-h-[460px] object-contain"
              fallbackClassName="grid h-full w-full place-items-center bg-white text-gray-400"
              fallbackLabel={product.category || 'No product image'}
              loading="eager"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-3">
                {product.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-neutral-dark mb-4">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-gray-600 text-lg leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-neutral-border p-6 space-y-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-gray-600 font-medium">Price:</span>
                <span className="text-4xl font-bold text-neutral-dark">{product.price}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-gray-600 font-medium">Availability:</span>
                <div className="flex items-center gap-3">
                  {product.stock !== undefined && (
                    <span className="text-lg font-semibold text-neutral-dark">
                      {product.stock} units
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${stockStatus.color}`}>
                    {stockStatus.text}
                  </span>
                </div>
              </div>
            </div>

            {!isOutOfStock && (
              <div className="bg-white rounded-xl border border-neutral-border p-6 space-y-4 shadow-sm">
                <label className="block text-gray-700 font-semibold mb-2">
                  Quantity:
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-12 h-12 rounded-lg border-2 border-neutral-border flex items-center justify-center text-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <FiMinus />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      const max = product.stock || 1
                      setCartWarning('')
                      setQuantity(Math.max(1, Math.min(val, max)))
                    }}
                    className="w-20 h-12 text-center text-xl font-bold border-2 border-neutral-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    min="1"
                    max={product.stock}
                  />
                  <button
                    onClick={incrementQuantity}
                    disabled={!product.stock || quantity >= product.stock}
                    className="w-12 h-12 rounded-lg border-2 border-neutral-border flex items-center justify-center text-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Increase quantity"
                  >
                    <FiPlus />
                  </button>
                  <span className="text-gray-600 ml-auto">
                    Max: {product.stock}
                  </span>
                </div>

                <button
                  onClick={addToCart}
                  disabled={isOutOfStock}
                  className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <FiShoppingCart size={20} />
                  Add to Cart
                </button>
                {addedFeedback ? <p className="text-sm text-success text-center">Added to cart.</p> : null}
                {cartWarning ? <p className="text-sm text-error text-center">{cartWarning}</p> : null}
              </div>
            )}

            {isOutOfStock && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-800 font-semibold text-lg">
                  This product is currently out of stock
                </p>
                <p className="text-red-600 mt-2">
                  Please check back later or contact us for availability
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ProductDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <ProductDetailsContent />
    </Suspense>
  )
}

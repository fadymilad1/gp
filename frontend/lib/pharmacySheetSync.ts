import {
  pharmacyProductsApi,
  SHEET_SYNC_INTERVAL_MS,
  type PharmacyProduct,
} from '@/lib/pharmacy'
import { setPublicSiteItem, setScopedItem } from '@/lib/storage'

export const PHARMACY_PRODUCTS_SYNC_EVENT = 'pharmacy-products-synced'

export type PharmacyProductSnapshot = {
  id: string
  name: string
  category: string
  description: string
  price: string
  stock: number
  inStock: boolean
  imageUrl: string
}

export const toProductSnapshot = (products: PharmacyProduct[]): { products: PharmacyProductSnapshot[] } => ({
  products: products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    stock: product.stock,
    inStock: product.in_stock,
    imageUrl: product.image_url_resolved || product.image_url || '',
  })),
})

export const persistProductSnapshot = (products: PharmacyProduct[]) => {
  const snapshot = toProductSnapshot(products)
  const serialized = JSON.stringify(snapshot)
  setScopedItem('pharmacySetup', serialized)
  setPublicSiteItem('pharmacySetup', serialized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PHARMACY_PRODUCTS_SYNC_EVENT, { detail: snapshot }))
  }
}

export const fetchSyncedProducts = async (options?: {
  ownerId?: string | null
  authenticated?: boolean
}) => {
  if (options?.authenticated) {
    return pharmacyProductsApi.list({ sync: true })
  }

  if (options?.ownerId) {
    const response = await pharmacyProductsApi.listPublic(options.ownerId, true)
    if (response.error || !response.data) {
      return { error: response.error || 'Could not load products.' }
    }
    return { data: response.data.products }
  }

  return pharmacyProductsApi.list({ sync: true })
}

export const startPharmacyProductPolling = (options: {
  enabled: boolean
  authenticated?: boolean
  ownerId?: string | null
  onProducts: (products: PharmacyProduct[]) => void
  onError?: (message: string) => void
  intervalMs?: number
}) => {
  if (!options.enabled || typeof window === 'undefined') {
    return () => undefined
  }

  let active = true

  const pull = async () => {
    const response = await fetchSyncedProducts({
      authenticated: options.authenticated,
      ownerId: options.ownerId,
    })

    if (!active) return

    if (response.error) {
      options.onError?.(response.error)
      return
    }

    const products = Array.isArray(response.data) ? response.data : []
    options.onProducts(products)
    persistProductSnapshot(products)
  }

  void pull()
  const timer = window.setInterval(() => {
    void pull()
  }, options.intervalMs ?? SHEET_SYNC_INTERVAL_MS)

  return () => {
    active = false
    window.clearInterval(timer)
  }
}

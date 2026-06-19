import { API_BASE_URL, getAuthToken } from '@/lib/api'

export type PharmacyThemeSettings = {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  sections?: {
    hero?: boolean
    featuredProducts?: boolean
    categories?: boolean
    offers?: boolean
    contactInfo?: boolean
    map?: boolean
  }
}

export type PharmacyProfile = {
  id: string
  name: string
  description: string
  logo: string | null
  logo_url: string | null
  theme_settings: PharmacyThemeSettings
  template_id: number | null
  is_published: boolean
  google_sheet_url?: string
  google_sheet_sync_enabled?: boolean
  google_sheet_last_synced_at?: string | null
  product_count: number
  created_at: string
  updated_at: string
}

export type TemplatePaymentMethod = 'visa' | 'fawry'
export type PharmacyTemplatePurchaseStatus = 'active' | 'cancelled'

export type PharmacyTemplatePurchase = {
  id: string
  template_id: number
  template_name: string
  amount: string
  payment_method: TemplatePaymentMethod
  transaction_reference: string
  status: PharmacyTemplatePurchaseStatus
  purchased_at: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export type PharmacyProfilePayload = {
  name?: string
  description?: string
  logo?: File | null
  theme_settings?: PharmacyThemeSettings
  template_id?: number | null
  is_published?: boolean
}

export type PurchaseTemplatePayload = {
  template_id: number
  payment_method: TemplatePaymentMethod
  transaction_reference?: string
}

export type PharmacyProduct = {
  id: string
  pharmacy: string | null
  name: string
  category: string
  description: string
  image: string | null
  image_url: string
  image_url_resolved: string | null
  price: string
  stock: number
  in_stock: boolean
  created_at: string
  updated_at: string
}

export type PharmacyProductPayload = {
  name: string
  category: string
  description?: string
  image?: File | null
  image_url?: string
  price: number
  stock?: number
}

export type ProductStats = {
  total: number
  out_of_stock: number
  low_stock: number
  categories: number
  last_updated: string | null
}

export type BulkUploadFailure = {
  row: number
  errors: string[]
  data: Record<string, string>
}

export type BulkUploadResult = {
  message: string
  success_count: number
  created_count: number
  updated_count: number
  failed_count?: number
  processed_count?: number
  failed_rows: BulkUploadFailure[]
  preview_count?: number
}

export type SheetUploadPreviewResult = {
  message: string
  preview_count: number
  failed_count: number
  failed_rows: BulkUploadFailure[]
  preview_rows: Array<{
    name: string
    category: string
    price: string
    stock: number
  }>
}

export type SheetSyncStatus = {
  google_sheet_url: string
  google_sheet_webhook_url?: string
  google_sheet_sync_enabled: boolean
  google_sheet_last_synced_at: string | null
  google_sheet_last_pushed_at?: string | null
  google_sheets_write_configured?: boolean
  google_service_account_email?: string | null
  sync_interval_seconds: number
}

export const SHEET_SYNC_INTERVAL_MS = 15_000

type RequestResult<T> = {
  data?: T
  error?: string
}

type PaginatedResponse<T> = {
  results?: T[]
}

const buildHeaders = (customHeaders?: HeadersInit, body?: BodyInit | null): HeadersInit => {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<RequestResult<T>> => {
  const body = options.body ?? null

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(options.headers, body),
    })

    const rawText = await response.text()
    let payload: any = null
    if (rawText) {
      try {
        payload = JSON.parse(rawText)
      } catch {
        payload = { message: rawText }
      }
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.error || payload?.message || 'Request failed.'
      return { error: String(detail) }
    }

    return { data: payload as T }
  } catch {
    return { error: 'Network error. Please check your connection and try again.' }
  }
}

const toJsonBody = (data: unknown) => JSON.stringify(data)

const normalizeListPayload = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object') {
    const results = (payload as PaginatedResponse<T>).results
    if (Array.isArray(results)) {
      return results
    }
  }

  return []
}

const toFormData = (payload: PharmacyProfilePayload | PharmacyProductPayload): FormData => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (value instanceof File) {
      formData.append(key, value)
      return
    }

    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value))
      return
    }

    formData.append(key, String(value))
  })
  return formData
}

export const pharmacyApi = {
  getProfile: async () => request<PharmacyProfile>('/pharmacy/pharmacies/profile/', { method: 'GET' }),

  saveProfile: async (
    payload: PharmacyProfilePayload,
    method: 'POST' | 'PATCH' | 'PUT' = 'PATCH',
  ) => {
    const hasFile = payload.logo instanceof File
    const body = hasFile ? toFormData(payload) : toJsonBody(payload)

    return request<PharmacyProfile>('/pharmacy/pharmacies/profile/', {
      method,
      body,
    })
  },

  publish: async () => request<PharmacyProfile>('/pharmacy/pharmacies/publish/', { method: 'POST' }),

  listTemplatePurchases: async () =>
    request<PharmacyTemplatePurchase[]>('/pharmacy/pharmacies/template_purchases/', { method: 'GET' }),

  purchaseTemplate: async (payload: PurchaseTemplatePayload) =>
    request<{ purchase: PharmacyTemplatePurchase; profile: PharmacyProfile }>(
      '/pharmacy/pharmacies/purchase_template/',
      {
        method: 'POST',
        body: toJsonBody(payload),
      },
    ),

  cancelTemplatePurchase: async (templateId: number) =>
    request<{
      cancelled_purchase: PharmacyTemplatePurchase
      active_template_id: number | null
      profile: PharmacyProfile
    }>('/pharmacy/pharmacies/cancel_template_purchase/', {
      method: 'POST',
      body: toJsonBody({ template_id: templateId }),
    }),

  deleteWebsite: async () =>
    request<{ message: string }>('/pharmacy/pharmacies/delete_website/', { method: 'DELETE' }),
}

export const pharmacyProductsApi = {
  list: async (params?: { search?: string; category?: string; ordering?: string; sync?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.ordering) searchParams.set('ordering', params.ordering)
    if (params?.sync) searchParams.set('sync', '1')

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : ''
    const response = await request<PharmacyProduct[] | PaginatedResponse<PharmacyProduct>>(
      `/pharmacy/products/${suffix}`,
      { method: 'GET' },
    )

    if (response.error) {
      return { error: response.error }
    }

    return { data: normalizeListPayload<PharmacyProduct>(response.data) }
  },

  stats: async () => request<ProductStats>('/pharmacy/products/stats/', { method: 'GET' }),

  create: async (payload: PharmacyProductPayload) => {
    const hasFile = payload.image instanceof File
    return request<PharmacyProduct>('/pharmacy/products/', {
      method: 'POST',
      body: hasFile ? toFormData(payload) : toJsonBody(payload),
    })
  },

  update: async (productId: string, payload: Partial<PharmacyProductPayload>) => {
    const hasFile = payload.image instanceof File
    return request<PharmacyProduct>(`/pharmacy/products/${productId}/`, {
      method: 'PATCH',
      body: hasFile ? toFormData(payload as PharmacyProductPayload) : toJsonBody(payload),
    })
  },

  remove: async (productId: string) =>
    request<void>(`/pharmacy/products/${productId}/`, {
      method: 'DELETE',
    }),

  deleteAll: async () => request<{ message: string }>('/pharmacy/products/delete_all/', { method: 'DELETE' }),

  bulkUploadJson: async (products: Array<Record<string, unknown>>) =>
    request<BulkUploadResult>('/pharmacy/products/bulk_upload/', {
      method: 'POST',
      body: toJsonBody({ products }),
    }),

  bulkUploadCsv: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return request<BulkUploadResult>('/pharmacy/products/bulk_upload/', {
      method: 'POST',
      body: formData,
    })
  },

  bulkUploadFromSheet: async (url: string, dryRun = false, enableLiveSync = true) => {
    return request<BulkUploadResult | SheetUploadPreviewResult>(
      '/pharmacy/products/bulk_upload_from_sheet/',
      {
        method: 'POST',
        body: toJsonBody({ url, dry_run: dryRun, enable_live_sync: enableLiveSync }),
      },
    )
  },

  getSheetSyncStatus: async () =>
    request<SheetSyncStatus>('/pharmacy/products/sheet_sync_status/', { method: 'GET' }),

  connectGoogleSheet: async (url: string, webhookUrl?: string) =>
    request<SheetSyncStatus & { message: string; sync?: Record<string, unknown> }>(
      '/pharmacy/products/connect_google_sheet/',
      {
        method: 'POST',
        body: toJsonBody({ url, webhook_url: webhookUrl || '' }),
      },
    ),

  disconnectGoogleSheet: async () =>
    request<{ message: string; google_sheet_sync_enabled: boolean }>(
      '/pharmacy/products/disconnect_google_sheet/',
      { method: 'POST', body: toJsonBody({}) },
    ),

  listPublic: async (ownerId: string, sync = true) => {
    const searchParams = new URLSearchParams({ owner_id: ownerId })
    if (sync) searchParams.set('sync', '1')
    const response = await request<{
      products: PharmacyProduct[]
      google_sheet_sync_enabled: boolean
      google_sheet_last_synced_at: string | null
      sync_interval_seconds: number
    }>(`/pharmacy/products/public/?${searchParams.toString()}`, { method: 'GET' })

    if (response.error) {
      return { error: response.error }
    }

    return { data: response.data }
  },
}

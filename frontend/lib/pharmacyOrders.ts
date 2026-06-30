import { API_BASE_URL, apiRequest, ApiResponse } from '@/lib/api'

export type PharmacyOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

export type PharmacyOrderItem = {
  id: string
  product: string | null
  product_name: string
  product_category: string
  quantity: number
  unit_price: string
  line_total: string
}

export type PharmacyOrder = {
  id: string
  order_number: string
  patient_name: string
  patient_email: string
  patient_phone: string
  address: string
  city: string
  state: string
  zip_code: string
  delivery_method: 'delivery' | 'pickup'
  payment_method: 'cash' | 'card'
  payment_status: 'pending' | 'paid'
  payment_last4: string
  notes: string
  status: PharmacyOrderStatus
  subtotal: string
  delivery_fee: string
  total: string
  status_updated_at: string
  owner_seen_at: string | null
  created_at: string
  updated_at: string
  items: PharmacyOrderItem[]
}

export type PlacePharmacyOrderPayload = {
  owner_id: string
  client_request_id: string
  full_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  delivery_method: 'delivery' | 'pickup'
  payment_method: 'cash' | 'card'
  payment_last4?: string
  notes?: string
  delivery_fee: number
  items: Array<{
    product_id: string
    quantity: number
  }>
}

export type PlacePharmacyOrderResponse = {
  message: string
  duplicate: boolean
  order: PharmacyOrder
}

type ApiResult<T> = {
  data?: T
  error?: string
  errorDetails?: any
}

type UnseenOrdersCountResponse = {
  count: number
}

type MarkSeenResponse = {
  marked_seen: number
  remaining_unseen: number
}

const parseJsonSafely = async (response: Response): Promise<any> => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

const extractErrorMessage = (payload: any): string => {
  if (!payload) return 'Request failed.'
  if (typeof payload === 'string') return payload

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail
  }

  if (Array.isArray(payload.non_field_errors) && typeof payload.non_field_errors[0] === 'string') {
    return payload.non_field_errors[0]
  }

  const firstKey = Object.keys(payload)[0]
  if (!firstKey) return 'Request failed.'

  const firstValue = payload[firstKey]
  if (typeof firstValue === 'string') return firstValue
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]

  return 'Request failed.'
}

export const placePharmacyOrder = async (
  payload: PlacePharmacyOrderPayload,
): Promise<ApiResult<PlacePharmacyOrderResponse>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/pharmacy/orders/place/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await parseJsonSafely(response)

    if (!response.ok) {
      return {
        error: extractErrorMessage(data),
        errorDetails: data,
      }
    }

    return { data: data as PlacePharmacyOrderResponse }
  } catch {
    return { error: 'Network error while placing order.' }
  }
}

export const listOwnerPharmacyOrders = async (): Promise<ApiResponse<PharmacyOrder[]>> => {
  const response = await apiRequest<PharmacyOrder[]>('/pharmacy/orders/')
  if (response.error) return response

  const list = Array.isArray(response.data)
    ? response.data
    : Array.isArray((response.data as any)?.results)
      ? (response.data as any).results
      : []
  return { data: list }
}

export const updateOwnerPharmacyOrderStatus = async (
  orderId: string,
  status: PharmacyOrderStatus,
): Promise<ApiResponse<PharmacyOrder>> => {
  return apiRequest<PharmacyOrder>(`/pharmacy/orders/${orderId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export const getOwnerUnseenPharmacyOrdersCount = async (): Promise<ApiResponse<number>> => {
  const response = await apiRequest<UnseenOrdersCountResponse>('/pharmacy/orders/unseen_count/')
  if (response.error) return { error: response.error }
  return { data: Number(response.data?.count || 0) }
}

export const markOwnerPharmacyOrdersSeen = async (
  orderIds?: string[],
): Promise<ApiResponse<MarkSeenResponse>> => {
  const response = await apiRequest<MarkSeenResponse>('/pharmacy/orders/mark_seen/', {
    method: 'POST',
    body: JSON.stringify(orderIds && orderIds.length ? { order_ids: orderIds } : {}),
  })
  if (response.error) return response
  return { data: response.data || { marked_seen: 0, remaining_unseen: 0 } }
}

export const deletePharmacyOrder = async (orderId: string): Promise<ApiResponse<void>> => {
  return apiRequest<void>(`/pharmacy/orders/${orderId}/`, {
    method: 'DELETE',
  })
}

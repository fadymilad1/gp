// API configuration and utility functions

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
  status?: number
  errorDetails?: unknown
}

export interface ChatbotAssistantPayload {
  content: string
  follow_up_questions: string[]
  possible_conditions: string[]
  recommended_specialties: string[]
  guidance: string[]
  urgency: 'self_care' | 'routine' | 'urgent' | 'emergency'
  seek_emergency_care: boolean
  confidence_note: string
  disclaimer: string
}

export interface ChatbotResponsePayload {
  conversation_id: string
  assistant: ChatbotAssistantPayload
}

function extractErrorMessage(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'An error occurred'
  }

  const data = payload as Record<string, unknown>

  if (typeof data.error === 'string' && data.error.trim()) return data.error
  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail

  if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
    return data.non_field_errors[0]
  }

  const firstField = Object.keys(data)[0]
  if (!firstField) return 'An error occurred'

  const firstValue = data[firstField]
  if (typeof firstValue === 'string' && firstValue.trim()) return firstValue
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0]

  return 'An error occurred'
}

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

// Get refresh token from localStorage
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

// API request helper
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        error: extractErrorMessage(data),
        status: response.status,
        errorDetails: data,
      }
    }

    return { data, status: response.status }
  } catch (error) {
    console.error('API request error:', error)
    return {
      error: 'Network error. Please check your connection.',
      status: 0,
    }
  }
}

// Auth API functions
export const authApi = {
  signup: async (userData: {
    email: string
    password: string
    password_confirm: string
    name: string
    business_type: 'hospital' | 'pharmacy'
  }) => {
    return apiRequest<{
      user: {
        id: string
        email: string
        name: string
        business_type: string
      }
      tokens: {
        access: string
        refresh: string
      }
      website_setup_id: string
    }>('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  login: async (email: string, password: string) => {
    return apiRequest<{
      user: {
        id: string
        email: string
        name: string
        business_type: string
      }
      tokens: {
        access: string
        refresh: string
      }
    }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  getCurrentUser: async () => {
    return apiRequest<{
      id: string
      email: string
      name: string
      business_type: string
    }>('/auth/me/')
  },

  logout: async (payload: { refresh?: string; all_devices?: boolean }) => {
    return apiRequest<{ message: string }>('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteAccount: async (payload: {
    email: string
    password: string
    confirmation_text: string
  }) => {
    return apiRequest<{ message: string }>('/auth/delete-account/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  forgotPassword: async (email: string) => {
    return apiRequest<{ message: string }>('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  validatePasswordResetToken: async (uid: string, token: string) => {
    return apiRequest<{ valid: boolean }>('/auth/password-reset/validate/', {
      method: 'POST',
      body: JSON.stringify({ uid, token }),
    })
  },

  resetPassword: async (payload: {
    uid: string
    token: string
    password: string
    password_confirm: string
  }) => {
    return apiRequest<{ message: string }>('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

// Website Setup API functions
export const websiteSetupApi = {
  get: async () => {
    return apiRequest('/website-setups/')
  },

  update: async (data: any) => {
    return apiRequest('/website-setups/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

// Business Info API functions
export const businessInfoApi = {
  get: async () => {
    return apiRequest('/business-info/')
  },

  create: async (data: any) => {
    return apiRequest('/business-info/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (data: any) => {
    return apiRequest('/business-info/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  publish: async () => {
    return apiRequest('/business-info/publish/', {
      method: 'POST',
    })
  },
}

// Website Setup API functions (template selection, paid status, features)
export const websiteSetupApiV2 = {
  get: async () => {
    return apiRequest('/website-setups/')
  },

  update: async (data: {
    template_id?: number | null
    is_paid?: boolean
    total_price?: number
    review_system?: boolean
    ai_chatbot?: boolean
    patient_portal?: boolean
    prescription_refill?: boolean
  }) => {
    const lookup = await apiRequest<any>('/website-setups/')
    if (lookup.error) {
      return lookup
    }

    const payload = lookup.data
    const setup = Array.isArray(payload?.results)
      ? payload.results[0]
      : Array.isArray(payload)
        ? payload[0]
        : payload

    if (!setup?.id) {
      return { error: 'Website setup not found.', status: lookup.status }
    }

    return apiRequest(`/website-setups/${setup.id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

export const chatbotApi = {
  sendMessage: async (payload: {
    message: string
    conversation_id?: string
    subdomain?: string
    visitor_id?: string
    locale?: string
    patient_profile?: Record<string, unknown>
  }) => {
    return apiRequest<ChatbotResponsePayload>('/chatbot/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getConversation: async (conversationId: string, subdomain?: string) => {
    const params = new URLSearchParams({ conversation_id: conversationId })
    if (subdomain) {
      params.set('subdomain', subdomain)
    }
    return apiRequest(`/chatbot/?${params.toString()}`)
  },
}


export type PharmacyTemplateCategory = 'modern' | 'minimal' | 'ecommerce'

export type PharmacyTemplateDefinition = {
  id: number
  name: string
  description: string
  image: string
  category: PharmacyTemplateCategory
  price: number
  hasAI: boolean
  highlights: string[]
}

export const PHARMACY_TEMPLATES: PharmacyTemplateDefinition[] = [
  {
    id: 1,
    name: 'Modern Pharmacy',
    description: 'Bold storefront with high-contrast CTA zones and conversion-first product cards.',
    image: '/template-1-preview.svg',
    category: 'modern',
    price: 25,
    hasAI: true,
    highlights: ['Hero with featured offers', 'Fast checkout path', 'AI assistant ready'],
  },
  {
    id: 2,
    name: 'Classic Pharmacy',
    description: 'Professional editorial layout tailored for trusted family pharmacies.',
    image: '/template-2-preview.svg',
    category: 'ecommerce',
    price: 20,
    hasAI: true,
    highlights: ['Service-first navigation', 'Story-driven sections', 'Rich medication catalog'],
  },
  {
    id: 3,
    name: 'Minimal Pharmacy',
    description: 'Clean product grid optimized for mobile ordering and simplified browsing.',
    image: '/template-3-preview.svg',
    category: 'minimal',
    price: 15,
    hasAI: false,
    highlights: ['Lightweight layout', 'Minimal distractions', 'Quick launch setup'],
  },
  {
    id: 4,
    name: 'Aurora Glass Rx',
    description: 'Glassmorphism storefront with atmospheric gradients and premium consultation pathways.',
    image: '/template-4-preview.svg',
    category: 'modern',
    price: 28,
    hasAI: true,
    highlights: ['Glass-layer UI system', 'Gradient wellness hero', 'Animated checkout journey'],
  },
  {
    id: 5,
    name: 'HarborLine Concierge',
    description: 'Warm editorial commerce template for family-focused pharmacies and service workflows.',
    image: '/template-5-preview.svg',
    category: 'ecommerce',
    price: 24,
    hasAI: true,
    highlights: ['Built-in services and contact pages', 'Editorial trust sections', 'Family-centric catalog controls'],
  },
  {
    id: 6,
    name: 'NeoMeds Bento',
    description: 'High-contrast dark bento template optimized for rapid product discovery and checkout.',
    image: '/template-6-preview.svg',
    category: 'modern',
    price: 26,
    hasAI: true,
    highlights: ['Dark bento interface', 'Product detail deep-linking', 'Stock-aware rapid checkout'],
  },
]

export const PHARMACY_TEMPLATE_CATEGORIES: Array<{ id: 'all' | PharmacyTemplateCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'ecommerce', label: 'E-commerce' },
]

export const getTemplateById = (id: number | null | undefined) =>
  PHARMACY_TEMPLATES.find((template) => template.id === id) || null

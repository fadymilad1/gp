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
    description: 'Bold storefront with high-contrast CTA zones, conversion-first product cards, and floating WhatsApp/AI customer support.',
    image: '/template-1-preview.svg',
    category: 'modern',
    price: 25,
    hasAI: true,
    highlights: ['Hero with featured offers', 'AI assistant & WhatsApp support', 'Clean binary stock status'],
  },
  {
    id: 2,
    name: 'Classic Pharmacy',
    description: 'Professional editorial layout tailored for trusted family pharmacies with dynamic interactive Google Maps and floating WhatsApp support.',
    image: '/template-2-preview.svg',
    category: 'ecommerce',
    price: 20,
    hasAI: true,
    highlights: ['Dynamic interactive Google Maps', 'Floating WhatsApp support button', 'Clean centered contact details'],
  },
  {
    id: 3,
    name: 'Minimal Pharmacy',
    description: 'Clean product grid optimized for mobile ordering and simplified browsing without distractions or chatbot widgets.',
    image: '/template-3-preview.svg',
    category: 'minimal',
    price: 15,
    hasAI: false,
    highlights: ['Lightweight grid layout', 'Zero distractions (no chatbot)', 'Quick checkout validation'],
  },
  {
    id: 4,
    name: 'Aurora Glass Rx',
    description: 'Glassmorphism storefront with atmospheric gradients, premium consultation pathways, and integrated WhatsApp support.',
    image: '/template-4-preview.svg',
    category: 'modern',
    price: 28,
    hasAI: true,
    highlights: ['Glass-layer UI system', 'WhatsApp & AI chatbot integration', 'Animated checkout journey'],
  },
  {
    id: 5,
    name: 'HarborLine Concierge',
    description: 'Warm editorial commerce template for family-focused pharmacies with simplified support pages.',
    image: '/template-5-preview.svg',
    category: 'ecommerce',
    price: 24,
    hasAI: true,
    highlights: ['Direct services & info pages', 'Clean centered layout (no forms)', 'AI assistant ready'],
  },
  {
    id: 6,
    name: 'NeoMeds Bento',
    description: 'High-contrast dark bento template optimized for rapid product discovery and stock-aware ordering.',
    image: '/template-6-preview.svg',
    category: 'modern',
    price: 26,
    hasAI: true,
    highlights: ['Dark bento interface', 'Deep product detail linking', 'Stock-aware checkout limits'],
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

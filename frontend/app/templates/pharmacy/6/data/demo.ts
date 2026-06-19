import {
  type TemplateBrand,
  type TemplateProduct,
} from '@/lib/pharmacyTemplateRuntime'

export const TEMPLATE6_DEMO_BRAND: TemplateBrand = {
  name: 'NeoMeds Studio',
  logo: '/template-3.jpg',
  about: 'A sharp, product-first pharmacy template built with bento layouts and high-speed checkout behavior.',
  phone: '+1 (555) 610-4021',
  address: '300 Vector Lane, Austin',
  openHours: 'Mon-Fri 08:30-19:30',
}

export const TEMPLATE6_DEMO_PRODUCTS: TemplateProduct[] = [
  {
    id: 'nm-1',
    name: 'Focus Guard Capsules',
    category: 'Cognitive',
    description: 'Daily nootropic blend for mental clarity.',
    price: '$26.00',
    inStock: true,
    stock: 14,
    imageUrl: '/template-3.jpg',
  },
  {
    id: 'nm-2',
    name: 'Hydra Salt Mix',
    category: 'Hydration',
    description: 'Rapid electrolyte replenishment.',
    price: '$10.90',
    inStock: true,
    stock: 33,
    imageUrl: '/template-2.jpg',
  },
  {
    id: 'nm-3',
    name: 'Night Ease Drops',
    category: 'Sleep',
    description: 'Calm evening support with herbal extracts.',
    price: '$17.40',
    inStock: true,
    stock: 18,
    imageUrl: '/template-1.jpg',
  },
  {
    id: 'nm-4',
    name: 'Pulse Smart Thermometer',
    category: 'Devices',
    description: 'App-connected temperature tracking.',
    price: '$39.00',
    inStock: true,
    stock: 9,
    imageUrl: '/hero-pharmacy.jpg',
  },
  {
    id: 'nm-5',
    name: 'Immunity Matrix Pack',
    category: 'Wellness',
    description: 'Stacked vitamin combo with timed release.',
    price: '$28.50',
    inStock: true,
    stock: 11,
    imageUrl: '/logo.png',
  },
  {
    id: 'nm-6',
    name: 'Calm Flow Magnesium',
    category: 'Sleep',
    description: 'Night routine mineral blend.',
    price: '$19.10',
    inStock: true,
    stock: 3,
    imageUrl: '/logo.jpg',
  },
]

export type Template6StockStatus = 'in' | 'low' | 'out'

export function getTemplate6StockStatus(product: Pick<TemplateProduct, 'inStock' | 'stock'>): Template6StockStatus {
  const stock = product.stock || 0
  if (!product.inStock || stock <= 0) return 'out'
  if (stock <= 4) return 'low'
  return 'in'
}

export function getTemplate6StockTone(status: Template6StockStatus): string {
  if (status === 'out') return 'text-rose-400'
  if (status === 'low') return 'text-amber-400'
  return 'text-emerald-400'
}

export function getTemplate6StockPillClasses(status: Template6StockStatus): string {
  if (status === 'out') return 'border border-rose-500/35 bg-rose-500/10 text-rose-300'
  if (status === 'low') return 'border border-amber-400/35 bg-amber-400/10 text-amber-300'
  return 'border border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
}

export function getTemplate6StockLabel(status: Template6StockStatus): string {
  if (status === 'out') return 'Out of Stock'
  if (status === 'low') return 'Low Stock'
  return 'In Stock'
}
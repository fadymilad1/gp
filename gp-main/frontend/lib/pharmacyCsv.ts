import { normalizeCsvImageUrl } from '@/lib/productImage'

export type ParsedCsvRow = {
  name: string
  price: number
  category: string
  description: string
  image_url?: string
  stock?: number
}

export type CsvRowError = {
  row: number
  errors: string[]
  values: Record<string, string>
}

export type CsvParseResult = {
  headers: string[]
  validRows: ParsedCsvRow[]
  invalidRows: CsvRowError[]
}

type CanonicalCsvHeader = 'name' | 'category' | 'price' | 'stock' | 'description' | 'image_url'

const REQUIRED_HEADERS: CanonicalCsvHeader[] = ['name', 'category', 'price', 'stock', 'description']

const HEADER_ALIASES: Record<string, CanonicalCsvHeader> = {
  name: 'name',
  productname: 'name',
  product: 'name',
  itemname: 'name',
  category: 'category',
  productcategory: 'category',
  type: 'category',
  price: 'price',
  unitprice: 'price',
  sellingprice: 'price',
  productprice: 'price',
  stock: 'stock',
  stockquantity: 'stock',
  quantity: 'stock',
  qty: 'stock',
  stockqty: 'stock',
  description: 'description',
  productdescription: 'description',
  details: 'description',
  imageurl: 'image_url',
  image: 'image_url',
  imagelink: 'image_url',
}

const normalizeHeaderToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const resolveHeader = (value: string): CanonicalCsvHeader | null => {
  const token = normalizeHeaderToken(value)
  return HEADER_ALIASES[token] || null
}

const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

const normalizeNumericText = (value: string) => {
  let normalized = value.replace(/[^0-9,.-]/g, '')
  if (!normalized) return ''

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
    return normalized
  }

  if (normalized.includes(',')) {
    const parts = normalized.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      return normalized.replace(',', '.')
    }
    return normalized.replace(/,/g, '')
  }

  return normalized
}

const parsePriceValue = (value: string) => {
  if (!value.trim()) {
    return { error: 'price is required' }
  }

  const normalized = normalizeNumericText(value)
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return { error: 'price must be a number' }
  }
  if (parsed < 0) {
    return { error: 'price cannot be negative' }
  }

  return { value: parsed }
}

const parseStockValue = (value: string) => {
  if (!value.trim()) {
    return { error: 'stock quantity is required' }
  }

  const normalized = normalizeNumericText(value)
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { error: 'stock must be an integer' }
  }
  if (parsed < 0) {
    return { error: 'stock cannot be negative' }
  }

  return { value: parsed }
}

export const parsePharmacyCsv = async (file: File): Promise<CsvParseResult> => {
  const text = await file.text()
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return {
      headers: [],
      validRows: [],
      invalidRows: [
        {
          row: 1,
          errors: ['CSV must include a header row and at least one data row.'],
          values: {},
        },
      ],
    }
  }

  const sourceHeaders = parseCsvLine(lines[0])
  const mappedHeaders = sourceHeaders.map((header) => resolveHeader(header))
  const availableHeaders = new Set(mappedHeaders.filter(Boolean) as CanonicalCsvHeader[])
  const missing = REQUIRED_HEADERS.filter((required) => !availableHeaders.has(required))

  if (missing.length > 0) {
    return {
      headers: sourceHeaders,
      validRows: [],
      invalidRows: [
        {
          row: 1,
          errors: [`Missing required columns: ${missing.join(', ')}`],
          values: {},
        },
      ],
    }
  }

  const validRows: ParsedCsvRow[] = []
  const invalidRows: CsvRowError[] = []

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2
    const cells = parseCsvLine(line)
    const values: Record<string, string> = {}

    mappedHeaders.forEach((header, headerIndex) => {
      if (!header) return

      const cellValue = (cells[headerIndex] || '').trim()
      if (!(header in values) || cellValue) {
        values[header] = cellValue
      }
    })

    const errors: string[] = []

    if (!values.name) {
      errors.push('name is required')
    }

    const priceResult = parsePriceValue(values.price || '')
    if (priceResult.error) {
      errors.push(priceResult.error)
    }

    const stockResult = parseStockValue(values.stock || '')
    if (stockResult.error) {
      errors.push(stockResult.error)
    }

    const imageUrl = normalizeCsvImageUrl(values.image_url || '')

    if (errors.length > 0) {
      invalidRows.push({ row: rowNumber, errors, values })
      return
    }

    validRows.push({
      name: values.name,
      price: priceResult.value as number,
      category: values.category || 'General',
      description: values.description || '',
      image_url: imageUrl || undefined,
      stock: stockResult.value as number,
    })
  })

  return {
    headers: sourceHeaders,
    validRows,
    invalidRows,
  }
}

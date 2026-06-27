import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrandLogo } from '@/components/pharmacy/BrandLogo'

// Mock process.env.NEXT_PUBLIC_API_URL
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api'

describe('BrandLogo Component (Pharmacy)', () => {
  it('renders fallback character when src is null or empty', () => {
    render(<BrandLogo src={null} alt="Pharmacy Logo" fallbackText="Medify" />)
    
    // Fallback letter is the first char capitalized: 'M'
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('renders fallback default letter P if fallbackText is not provided', () => {
    render(<BrandLogo src={null} alt="Pharmacy Logo" />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('renders img element with normalized src when logo path is valid', () => {
    const absoluteSrc = 'https://example.com/logo.png'
    render(<BrandLogo src={absoluteSrc} alt="Brand Logo" />)
    
    const imageElement = screen.getByRole('img', { name: /brand logo/i })
    expect(imageElement).toBeInTheDocument()
    expect(imageElement).toHaveAttribute('src', absoluteSrc)
  })

  it('correctly prepends backend URL origin for relative media paths', () => {
    render(<BrandLogo src="/media/pharmacies/logo.png" alt="Relative Logo" />)
    
    const imageElement = screen.getByRole('img', { name: /relative logo/i })
    expect(imageElement).toBeInTheDocument()
    expect(imageElement).toHaveAttribute('src', 'http://localhost:8000/media/pharmacies/logo.png')
  })

  it('switches to fallback letter if img triggers onError', () => {
    render(<BrandLogo src="https://example.com/bad-logo.png" alt="Faulty Logo" fallbackText="Health" />)
    
    const imageElement = screen.getByRole('img', { name: /faulty logo/i })
    expect(imageElement).toBeInTheDocument()
    
    // Trigger image error
    fireEvent.error(imageElement)
    
    // Verify fallback 'H' appears and image is removed
    expect(screen.getByText('H')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /faulty logo/i })).not.toBeInTheDocument()
  })
})

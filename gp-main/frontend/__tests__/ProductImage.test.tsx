import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductImage } from '@/components/pharmacy/ProductImage'

describe('ProductImage Component (Pharmacy)', () => {
  it('renders fallback placeholder when src is null or empty', () => {
    render(<ProductImage src={null} alt="Test Product" fallbackLabel="No Photo Available" />)
    
    const fallbackElement = screen.getByRole('img', { name: /no photo available/i })
    expect(fallbackElement).toBeInTheDocument()
    expect(screen.getByText('No Photo Available')).toBeInTheDocument()
  })

  it('renders img element with normalized src when src is valid', () => {
    const src = 'https://example.com/aspirin.jpg'
    render(<ProductImage src={src} alt="Aspirin Tablet" />)
    
    const imageElement = screen.getByRole('img', { name: /aspirin tablet/i })
    expect(imageElement).toBeInTheDocument()
    expect(imageElement).toHaveAttribute('src', src)
    expect(imageElement.tagName).toBe('IMG')
  })

  it('renders fallback placeholder if img triggers onError', () => {
    const src = 'https://example.com/broken-image.jpg'
    render(<ProductImage src={src} alt="Broken Image Product" fallbackLabel="Error Placeholder" />)
    
    const imageElement = screen.getByRole('img', { name: /broken image product/i })
    expect(imageElement).toBeInTheDocument()
    
    // Simulate image loading failure
    fireEvent.error(imageElement)
    
    // Check that it switched to fallback
    const fallbackElement = screen.getByRole('img', { name: /error placeholder/i })
    expect(fallbackElement).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /broken image product/i })).not.toBeInTheDocument()
  })

  it('resets error state and tries to render again when src changes', () => {
    const { rerender } = render(
      <ProductImage src="https://example.com/broken.jpg" alt="Dynamic Product" fallbackLabel="Fallback" />
    )
    
    const imageElement = screen.getByRole('img', { name: /dynamic product/i })
    fireEvent.error(imageElement)
    
    // Shows fallback now
    expect(screen.getByRole('img', { name: /fallback/i })).toBeInTheDocument()
    
    // Rerender with a new src
    rerender(<ProductImage src="https://example.com/working.jpg" alt="Dynamic Product" fallbackLabel="Fallback" />)
    
    // It should try to render the image again and remove fallback
    const newImage = screen.getByRole('img', { name: /dynamic product/i })
    expect(newImage).toBeInTheDocument()
    expect(newImage).toHaveAttribute('src', 'https://example.com/working.jpg')
    expect(screen.queryByRole('img', { name: /fallback/i })).not.toBeInTheDocument()
  })
})

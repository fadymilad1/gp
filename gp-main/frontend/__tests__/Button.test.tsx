import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders the button with children content', () => {
    render(<Button>Click Me</Button>)
    const buttonElement = screen.getByRole('button', { name: /click me/i })
    expect(buttonElement).toBeInTheDocument()
  })

  it('applies the primary variant class by default', () => {
    render(<Button>Primary Button</Button>)
    const buttonElement = screen.getByRole('button', { name: /primary button/i })
    expect(buttonElement.className).toContain('bg-primary')
    expect(buttonElement.className).toContain('text-white')
  })

  it('applies the secondary variant class when variant is secondary', () => {
    render(<Button variant="secondary">Secondary Button</Button>)
    const buttonElement = screen.getByRole('button', { name: /secondary button/i })
    expect(buttonElement.className).toContain('bg-white')
    expect(buttonElement.className).toContain('text-primary')
    expect(buttonElement.className).toContain('border-primary')
  })

  it('applies the ghost variant class when variant is ghost', () => {
    render(<Button variant="ghost">Ghost Button</Button>)
    const buttonElement = screen.getByRole('button', { name: /ghost button/i })
    expect(buttonElement.className).toContain('text-neutral-gray')
  })

  it('is disabled and prevents click events when disabled prop is true', () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>)
    const buttonElement = screen.getByRole('button', { name: /disabled button/i })
    
    expect(buttonElement).toBeDisabled()
    
    fireEvent.click(buttonElement)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('triggers onClick handler when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Clickable Button</Button>)
    const buttonElement = screen.getByRole('button', { name: /clickable button/i })
    
    fireEvent.click(buttonElement)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('forwards additional HTML attributes correctly', () => {
    render(<Button type="submit" data-testid="custom-btn">Submit Button</Button>)
    const buttonElement = screen.getByTestId('custom-btn')
    expect(buttonElement).toHaveAttribute('type', 'submit')
  })
})

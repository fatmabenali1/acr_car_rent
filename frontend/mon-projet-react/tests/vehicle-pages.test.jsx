import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
})

import { vehicleGroups } from '../src/data/vehicleGroups.js'
import { AttikaRoutesPage } from '../src/pages/AttikaRoutesPage.jsx'
import { VehicleGroupPage } from '../src/pages/VehicleGroupPage.jsx'

describe('curated vehicle category pages', () => {
  it.each([
    ['standard-cars', ['category-d-manual'], 'Standard Cars'],
    ['automatic-cars', ['category-e-automatic', 'category-e1-automatic'], 'Automatic Cars'],
    ['mini-vans', ['category-f2-automatic', 'category-f-manual'], 'Mini Vans'],
  ])('shows only the requested categories on %s', (slug, expectedCategories, title) => {
    const group = vehicleGroups.find((item) => item.slug === slug)

    expect(group.title).toBe(title)
    expect(group.featured.map((category) => category.slug)).toEqual(expectedCategories)

    const { container } = render(<VehicleGroupPage slug={slug} />)

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy()
    expect(container.querySelectorAll('article')).toHaveLength(expectedCategories.length)
    for (const categorySlug of expectedCategories) {
      expect(container.querySelector(`a[href*="category=${categorySlug}"]`)).toBeTruthy()
    }
    expect(screen.getAllByRole('link', { name: 'Request a quote' })).toHaveLength(expectedCategories.length + 1)
  })
})

describe('Attika Routes page', () => {
  it('renders the supplied route copy and lazy-loaded destination photos', () => {
    render(<AttikaRoutesPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Attika Routes' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Sounion' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Aegina Island' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Request a quote' })).toBeTruthy()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getAllByRole('img').every((image) => image.getAttribute('loading') === 'lazy')).toBe(true)
    expect(document.title).toBe('Attika Routes | Athens Car Rental')
  })
})

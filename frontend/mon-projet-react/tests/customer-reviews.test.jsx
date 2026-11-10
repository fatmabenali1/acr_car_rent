import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/reviews.js', () => ({
  getReviews: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'review-1',
        source: 'google',
        author: 'Alex',
        rating: 5,
        text: 'Excellent service.',
        imageUrl: '/images/reviews/google/review-1.png',
      },
      {
        id: 'review-2',
        source: 'tripadvisor',
        author: 'Taylor',
        rating: 5,
        text: 'A great rental experience.',
        imageUrl: null,
      },
    ],
  }),
}))

import { CustomerReviewsPage } from '../src/pages/CustomerReviewsPage.jsx'
import { getReviews } from '../src/api/reviews.js'

describe('Customer Reviews page', () => {
  it('loads screenshot and text reviews through reviews.js with working calls to action', async () => {
    const { container } = render(<CustomerReviewsPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Customer Reviews' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Request a quote' }).getAttribute('href')).toBe('/quote')
    expect(await screen.findByText('A great rental experience.')).toBeTruthy()
    expect(getReviews).toHaveBeenCalledWith({}, 'en')

    const tripadvisorLink = screen.getByRole('link', { name: 'Read more on Tripadvisor' })
    expect(tripadvisorLink.getAttribute('target')).toBe('_blank')
    expect(tripadvisorLink.getAttribute('rel')).toContain('noopener')
    expect(tripadvisorLink.getAttribute('href')).toContain('tripadvisor.com')

    const imageButtons = await screen.findAllByRole('button', { name: /Open Customer review of Athens Car Rental ACR/ })
    expect(imageButtons.every((button) => button.querySelector('img')?.getAttribute('loading') === 'lazy')).toBe(true)
    const localCaptureSources = imageButtons
      .map((button) => button.querySelector('img').getAttribute('src'))
      .filter((src) => /^\/images\/reviews\/review\d+\.PNG$/.test(src))
    expect(localCaptureSources).toHaveLength(7)
    const reviewsGrid = container.querySelector('#customer-reviews-grid')
    expect(reviewsGrid.className).toContain('customer-reviews-grid')

    await waitFor(() => {
      expect(document.title).toBe('Customer Reviews | Athens Car Rental ACR')
      expect(document.querySelector('meta[name="description"]').content.length).toBeLessThanOrEqual(150)
    })
  })
})

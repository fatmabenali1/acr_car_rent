import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyCookiePreferences,
  defaultCookiePreferences,
  readCookiePreferences,
  saveCookiePreferences,
} from '../src/api/cookie-preferences.js'
import { CookiesPrivacyPolicyPage } from '../src/pages/CookiesPrivacyPolicyPage.jsx'

describe('Cookies & Privacy Policy page', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/cookies-privacy-policy')
    document.getElementById('acr-google-tag')?.remove()
    document.getElementById('acr-google-recaptcha')?.remove()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.gtag
    delete window.dataLayer
  })

  it('resolves the clean policy URL and renders the supplied content with unique metadata', () => {
    render(<CookiesPrivacyPolicyPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cookies & Privacy Policy' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'System logs and maintenance' })).toBeTruthy()
    expect(screen.getByText(/This only identifies your ISP \(Internet Servi$/)).toBeTruthy()
    expect(document.title).toBe('Cookies & Privacy Policy | Athens Car Rental ACR')
    expect(document.querySelector('meta[name="description"]').content.length).toBeLessThanOrEqual(150)
    expect(screen.getAllByRole('switch')).toHaveLength(3)
  })

  it('saves granular preferences through the application handler', async () => {
    const savePreferences = vi.fn(async (preferences) => {
      saveCookiePreferences(preferences)
      return preferences
    })
    const { container } = render(<CookiesPrivacyPolicyPage onSavePreferences={savePreferences} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Reject Google Ads' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Reject Google Analytics' }))
    fireEvent.click(container.querySelector('.cookies-service-actions button:nth-child(3)'))

    await waitFor(() => expect(savePreferences).toHaveBeenCalledWith({
      googleAds: true,
      googleAnalytics: true,
      recaptcha: false,
    }))
    expect(readCookiePreferences()).toEqual({
      googleAds: true,
      googleAnalytics: true,
      recaptcha: false,
    })
  })

  it('stores preferences and never injects unconsented scripts', () => {
    expect(readCookiePreferences()).toBeNull()
    saveCookiePreferences(defaultCookiePreferences)
    applyCookiePreferences(defaultCookiePreferences)

    expect(readCookiePreferences()).toEqual(defaultCookiePreferences)
    expect(document.getElementById('acr-google-tag')).toBeNull()
    expect(document.getElementById('acr-google-recaptcha')).toBeNull()
  })

  it('loads a configured optional service only after the user enables it', () => {
    vi.stubEnv('VITE_GOOGLE_ANALYTICS_ID', 'G-TEST123')
    applyCookiePreferences(defaultCookiePreferences)
    expect(document.getElementById('acr-google-tag')).toBeNull()

    applyCookiePreferences({ ...defaultCookiePreferences, googleAnalytics: true })
    expect(document.getElementById('acr-google-tag').src).toContain('id=G-TEST123')

    applyCookiePreferences(defaultCookiePreferences)
    expect(document.getElementById('acr-google-tag')).toBeNull()
  })
})

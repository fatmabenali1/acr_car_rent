const STORAGE_KEY = 'acr-cookie-preferences-v1'

export const defaultCookiePreferences = Object.freeze({
  googleAds: false,
  googleAnalytics: false,
  recaptcha: false,
})

export function readCookiePreferences() {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  const parsed = JSON.parse(stored)
  return {
    googleAds: parsed.googleAds === true,
    googleAnalytics: parsed.googleAnalytics === true,
    recaptcha: parsed.recaptcha === true,
  }
}

export function saveCookiePreferences(preferences) {
  const normalized = {
    googleAds: preferences.googleAds === true,
    googleAnalytics: preferences.googleAnalytics === true,
    recaptcha: preferences.recaptcha === true,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent('acr-cookie-preferences-change', { detail: normalized }))
  return normalized
}

function addScript(id, src) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.src = src
  script.async = true
  document.head.append(script)
}

export function applyCookiePreferences(preferences) {
  const analyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim()
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID?.trim()
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()
  const gtagIds = [
    preferences.googleAnalytics && analyticsId,
    preferences.googleAds && adsId,
  ].filter(Boolean)

  if (gtagIds.length) {
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('consent', 'update', {
      analytics_storage: preferences.googleAnalytics && analyticsId ? 'granted' : 'denied',
      ad_storage: preferences.googleAds && adsId ? 'granted' : 'denied',
      ad_user_data: preferences.googleAds && adsId ? 'granted' : 'denied',
      ad_personalization: preferences.googleAds && adsId ? 'granted' : 'denied',
    })
    for (const id of gtagIds) window.gtag('config', id)
    addScript('acr-google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagIds[0])}`)
  } else {
    document.getElementById('acr-google-tag')?.remove()
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    }
  }

  if (preferences.recaptcha && recaptchaSiteKey) {
    addScript('acr-google-recaptcha', `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`)
  } else {
    document.getElementById('acr-google-recaptcha')?.remove()
  }
}

export function configuredCookieServices() {
  return {
    googleAds: Boolean(import.meta.env.VITE_GOOGLE_ADS_ID?.trim()),
    googleAnalytics: Boolean(import.meta.env.VITE_GOOGLE_ANALYTICS_ID?.trim()),
    recaptcha: Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()),
  }
}

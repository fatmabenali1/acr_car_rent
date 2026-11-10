import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowUpRight, Clock3, Mail, MapPin, Phone, ShieldCheck, Star } from 'lucide-react'
import { getVehicleGroups, getVehicles } from './api/vehicles'
import { getLocations } from './api/locations'
import { getExtras } from './api/extras'
import { getPageBySlug } from './api/pages'
import { checkAvailability } from './api/availability'
import { getPricingEstimate } from './api/pricing'
import { createBooking } from './api/checkout'
import { getCookieConsent, saveCookieConsent } from './api/cookie-consent'
import {
  applyCookiePreferences,
  defaultCookiePreferences,
  readCookiePreferences,
  saveCookiePreferences,
} from './api/cookie-preferences'
import { HomePage } from './pages/HomePage'
import { FleetPages } from './pages/FleetPages'
import { QuotePages } from './pages/QuotePages'
import { SecurePaymentPage } from './pages/SecurePaymentPage'
import { StaticPages } from './pages/StaticPages'
import { PricelistPage } from './pages/PricelistPage'
import { CategoryDetailPage } from './pages/CategoryDetailPage'
import { VehicleGroupPage } from './pages/VehicleGroupPage'
import { FaqPage } from './pages/FaqPage'
import { ContactPage } from './pages/ContactPage'
import { CargoVansPage } from './pages/CargoVansPage'
import { TripadvisorPage } from './pages/TripadvisorPage'
import { CustomerReviewsPage } from './pages/CustomerReviewsPage'
import { RentalConditionsPage } from './pages/RentalConditionsPage'
import { EarlyBirdPage } from './pages/EarlyBirdPage'
import { AboutPage } from './pages/AboutPage'
import { AttikaRoutesPage } from './pages/AttikaRoutesPage'
import { CookiesPrivacyPolicyPage } from './pages/CookiesPrivacyPolicyPage'
import './App.css'

const LocationsPage = lazy(() => import('./pages/LocationsPage').then((module) => ({ default: module.LocationsPage })))
const LocationDetailPage = lazy(() => import('./pages/LocationDetailPage').then((module) => ({ default: module.LocationDetailPage })))

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80'

const navItems = [
  { key: 'home', label: { en: 'Home', el: 'Αρχική' } },
  { key: 'quote', label: { en: 'Request a quote', el: 'Ζητήστε προσφορά' }, primary: true },
  { key: 'fleet', label: { en: 'Pricelist & Fleet', el: 'Τιμολόγιο & Φωτογραφίες' } },
  { key: 'static', label: { en: 'Rental conditions', el: 'Όροι ενοικίασης' } },
  { key: 'faq', label: { en: 'FAQ', el: 'Συχνές ερωτήσεις' } },
  { key: 'locations', label: { en: 'Locations', el: 'Τοποθεσίες' } },
  { key: 'payment', label: { en: 'Secure payment', el: 'Ασφαλής πληρωμή' } },
  { key: 'contact', label: { en: 'Contact us', el: 'Επικοινωνία' } },
]

function resolveRoute(pathname = window.location.pathname, search = window.location.search) {
  const path = pathname.replace(/\/+$/, '') || '/'
  const detailMatch = path.match(/^\/fleet\/([^/]+)$/)
  const locationDetailMatch = path.match(/^\/locations\/([^/]+)$/)
  const vehicleGroupMatch = path.match(/^\/vehicles\/([^/]+)$/)
  const legacyGroupSlugs = {
    luxury: 'luxury-cars',
    minibus: 'mini-vans',
    suv: 'suvs',
  }
  const searchParams = new URLSearchParams(search)
  const legacyGroupSlug = path === '/fleet'
    ? legacyGroupSlugs[searchParams.get('category')]
    : null

  if (legacyGroupSlug) {
    searchParams.delete('category')
    const remainingSearch = searchParams.toString()
    return {
      page: 'vehicle-group',
      slug: legacyGroupSlug,
      redirectTo: `/vehicles/${legacyGroupSlug}${remainingSearch ? `?${remainingSearch}` : ''}`,
    }
  }
  const curatedVehicleGroup = {
    '/standard-cars': 'standard-cars',
    '/automatic-cars': 'automatic-cars',
    '/mini-vans': 'mini-vans',
  }[path]
  if (curatedVehicleGroup) return { page: 'vehicle-group', slug: curatedVehicleGroup }
  if (path === '/attika-routes') return { page: 'attika-routes', slug: '' }
  if (path === '/cookies-privacy-policy') return { page: 'cookies-policy', slug: '' }
  if (vehicleGroupMatch) return { page: 'vehicle-group', slug: decodeURIComponent(vehicleGroupMatch[1]) }

  if (path === '/faq') return { page: 'faq', slug: '' }
  if (path === '/contact') return { page: 'contact', slug: '' }
  if (path === '/cargo-vans') return { page: 'cargo-vans', slug: '' }
  if (path === '/tripadvisor') return { page: 'tripadvisor', slug: '' }
  if (path === '/customer-reviews') return { page: 'customer-reviews', slug: '' }
  if (path === '/about') return { page: 'about', slug: '' }
  if (path === '/early-bird') return { page: 'early-bird', slug: '' }
  if (locationDetailMatch) return { page: 'location-detail', slug: decodeURIComponent(locationDetailMatch[1]) }
  if (path === '/locations') return { page: 'locations', slug: '' }
  if (path === '/quote') return { page: 'quote', slug: '' }
  if (path === '/pay/success') return { page: 'payment-success', slug: '' }
  if (path === '/pay/cancel') return { page: 'payment-cancel', slug: '' }
  if (path === '/pay') return { page: 'payment', slug: '' }
  if (path === '/rental-conditions') return { page: 'static', slug: '' }
  if (path === '/booking') return { page: 'booking', slug: '' }
  if (path === '/pricelist') return { page: 'pricelist', slug: '' }
  if (detailMatch) return { page: 'category-detail', slug: decodeURIComponent(detailMatch[1]) }
  if (path === '/fleet') return { page: 'fleet', slug: '' }
  return { page: 'home', slug: '' }
}

function App() {
  const [initialRoute] = useState(() => {
    const route = resolveRoute()
    if (route.redirectTo) window.history.replaceState(window.history.state, '', route.redirectTo)
    return route
  })
  const [lang, setLang] = useState(() => {
    const urlLang = new URLSearchParams(window.location.search).get('lang')
    if (urlLang === 'en' || urlLang === 'el') return urlLang
    try {
      return window.localStorage.getItem('acr-language') === 'el' ? 'el' : 'en'
    } catch {
      return 'en'
    }
  })
  const [activePage, setActivePage] = useState(initialRoute.page)
  const [categorySlug, setCategorySlug] = useState(initialRoute.slug)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoMenuOpen, setInfoMenuOpen] = useState(false)
  const infoMenuRef = useRef(null)
  const mobileInfoMenuRef = useRef(null)
  const infoMenuButtonRef = useRef(null)
  const mobileInfoMenuButtonRef = useRef(null)
  const cookieDialogRef = useRef(null)
  const cookieFocusReturnRef = useRef(null)
  const cookieCustomizeTriggerRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [groups, setGroups] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [locations, setLocations] = useState([])
  const [extras, setExtras] = useState([])
  const [staticPage, setStaticPage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cookieConsent, setCookieConsent] = useState(null)
  const [cookieConsentLoaded, setCookieConsentLoaded] = useState(false)
  const [cookieConsentSaving, setCookieConsentSaving] = useState(false)
  const [cookieConsentError, setCookieConsentError] = useState('')
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false)
  const [cookieCustomizing, setCookieCustomizing] = useState(false)
  const [reservationNotice, setReservationNotice] = useState(null)

  useEffect(() => {
    const handlePopState = () => {
      const route = resolveRoute()
      if (route.redirectTo) window.history.replaceState(window.history.state, '', route.redirectTo)
      const urlLang = new URLSearchParams(window.location.search).get('lang')
      if (urlLang === 'en' || urlLang === 'el') setLang(urlLang)
      setActivePage(route.page)
      setCategorySlug(route.slug)
      setInfoMenuOpen(false)
      setMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activePage, categorySlug])

  useEffect(() => {
    if (!infoMenuOpen) return undefined

    const handleDocumentMouseDown = (event) => {
      const inDesktopMenu = infoMenuRef.current?.contains(event.target)
      const inMobileMenu = mobileInfoMenuRef.current?.contains(event.target)
      if (!inDesktopMenu && !inMobileMenu) setInfoMenuOpen(false)
    }
    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setInfoMenuOpen(false)
        const trigger = window.matchMedia('(max-width: 1023px)').matches
          ? mobileInfoMenuButtonRef.current
          : infoMenuButtonRef.current
        trigger?.focus()
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [infoMenuOpen])

  useEffect(() => {
    let active = true

    getCookieConsent()
      .then(({ data }) => {
        if (active) {
          const choice = data?.choice || null
          setCookieConsent(choice)
          setCookieDialogOpen(!choice)
          setCookieConsentError('')
          try {
            if (!readCookiePreferences()) {
              saveCookiePreferences(choice === 'accepted'
                ? { googleAds: true, googleAnalytics: true, recaptcha: true }
                : defaultCookiePreferences)
            }
          } catch {
            setCookieConsentError('Cookie preferences could not be read or saved in this browser.')
          }
        }
      })
      .catch(() => {
        if (active) {
          setCookieConsentError('Cookie preferences could not be loaded. Please review your settings.')
          setCookieDialogOpen(true)
        }
      })
      .finally(() => {
        if (active) setCookieConsentLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const applySavedPreferences = () => {
      try {
        applyCookiePreferences(readCookiePreferences() || defaultCookiePreferences)
      } catch {
        applyCookiePreferences(defaultCookiePreferences)
        setCookieConsentError('Cookie preferences could not be applied. Optional services remain disabled.')
      }
    }

    applySavedPreferences()
    window.addEventListener('acr-cookie-preferences-change', applySavedPreferences)
    return () => window.removeEventListener('acr-cookie-preferences-change', applySavedPreferences)
  }, [])

  function closeCookieDialog() {
    setCookieDialogOpen(false)
    setCookieCustomizing(false)
    const trigger = cookieFocusReturnRef.current
    cookieFocusReturnRef.current = null
    if (trigger?.isConnected) window.requestAnimationFrame(() => trigger.focus())
  }

  useEffect(() => {
    if (!cookieDialogOpen) return undefined

    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () => Array.from(
      cookieDialogRef.current?.querySelectorAll(focusableSelector) ?? [],
    )
    const focusFrame = window.requestAnimationFrame(() => {
      const customizeTrigger = cookieCustomizeTriggerRef.current
      if (!cookieCustomizing && customizeTrigger?.isConnected) customizeTrigger.focus()
      else focusableElements()[0]?.focus()
    })
    const handleCookieDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (cookieCustomizing) {
          if (cookieFocusReturnRef.current) {
            closeCookieDialog()
          } else {
            setCookieCustomizing(false)
          }
        } else {
          setCookieDialogOpen(false)
          const trigger = cookieFocusReturnRef.current
          if (trigger?.isConnected) window.requestAnimationFrame(() => trigger.focus())
        }
        return
      }
      if (event.key !== 'Tab') return

      const elements = focusableElements()
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !cookieDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !cookieDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleCookieDialogKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleCookieDialogKeyDown)
    }
  }, [cookieDialogOpen, cookieCustomizing])

  const handleCookieChoice = async (choice) => {
    setCookieConsentSaving(true)
    setCookieConsentError('')
    try {
      const { data } = await saveCookieConsent(choice)
      setCookieConsent(data.choice)
      saveCookiePreferences(choice === 'accepted'
        ? { googleAds: true, googleAnalytics: true, recaptcha: true }
        : defaultCookiePreferences)
      closeCookieDialog()
    } catch {
      setCookieConsentError(lang === 'el'
        ? 'Δεν ήταν δυνατή η αποθήκευση της επιλογής cookies. Οι προτιμήσεις σας δεν άλλαξαν. Δοκιμάστε ξανά από τις Ρυθμίσεις cookies.'
        : 'We could not save your cookie choice. No preferences were changed. Please try again from Cookie settings.')
      closeCookieDialog()
    } finally {
      setCookieConsentSaving(false)
    }
  }

  const saveCookiePolicyPreferences = async (preferences) => {
    const previous = readCookiePreferences() || defaultCookiePreferences
    const allEnabled = Object.values(preferences).every(Boolean)
    const allDisabled = Object.values(preferences).every((enabled) => !enabled)
    const choice = allEnabled ? 'accepted' : allDisabled ? 'refused' : 'customized'

    saveCookiePreferences(preferences)
    try {
      const { data } = await saveCookieConsent(choice)
      setCookieConsent(data.choice)
      setCookieDialogOpen(false)
      return readCookiePreferences()
    } catch (error) {
      saveCookiePreferences(previous)
      throw error
    }
  }

  const navigateToCookieSettings = () => {
    const routePath = `/cookies-privacy-policy?lang=${lang}#use-of-cookies`
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== routePath) {
      window.history.pushState({}, '', routePath)
    }
    setActivePage('cookies-policy')
    setCategorySlug('')
    setMenuOpen(false)
    setInfoMenuOpen(false)
    window.setTimeout(() => document.getElementById('use-of-cookies')?.scrollIntoView(), 0)
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem('acr-language', lang)
    } catch {
      // The selected language remains active for this page if storage is unavailable.
    }
    const params = new URLSearchParams(window.location.search)
    params.set('lang', lang)
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`
    window.history.replaceState({}, '', nextUrl)
  }, [lang])

  useEffect(() => {
    async function loadFleet() {
      try {
        setLoading(true)
        setError('')
        const [groupsResponse, vehiclesResponse, locationsResponse, extrasResponse] = await Promise.all([
          getVehicleGroups(lang),
          getVehicles({ page: 1, limit: 100 }, lang),
          getLocations(lang),
          getExtras(lang),
        ])
        setGroups(groupsResponse.data || [])
        setVehicles(vehiclesResponse.data || [])
        setLocations(locationsResponse.data || [])
        setExtras(extrasResponse.data || [])
      } catch (err) {
        setError(err.message || (lang === 'el' ? 'Δεν ήταν δυνατή η φόρτωση των στοιχείων του στόλου.' : 'Unable to load fleet data.'))
      } finally {
        setLoading(false)
      }
    }

    if (activePage === 'fleet' || activePage === 'quote' || activePage === 'booking') loadFleet()
  }, [activePage, lang])

  useEffect(() => {
    async function loadPageContent() {
      if (!staticPage) return
      try {
        setLoading(true)
        setError('')
        const pageResponse = await getPageBySlug(staticPage, lang)
        setStaticPage(pageResponse.data?.slug || staticPage)
      } catch (err) {
        setError(err.message || (lang === 'el' ? 'Η σελίδα δεν βρέθηκε.' : 'Page not found.'))
      } finally {
        setLoading(false)
      }
    }

    if (activePage === 'content' && staticPage) loadPageContent()
  }, [activePage, lang, staticPage])

  const activeNav = useMemo(
    () => navItems.map((item) => ({ ...item, label: item.label[lang] || item.label.en })),
    [lang],
  )

  const renderPage = () => {
    if (activePage === 'static') {
      return <RentalConditionsPage lang={lang} />
    }

    if (activePage === 'pricelist') {
      return <PricelistPage lang={lang} />
    }

    if (activePage === 'category-detail') {
      return <CategoryDetailPage slug={categorySlug} lang={lang} />
    }

    if (activePage === 'vehicle-group') {
      return <VehicleGroupPage slug={categorySlug} lang={lang} />
    }

    if (activePage === 'attika-routes') {
      return <AttikaRoutesPage lang={lang} />
    }

    if (activePage === 'cookies-policy') {
      return <CookiesPrivacyPolicyPage lang={lang} onSavePreferences={saveCookiePolicyPreferences} />
    }

    if (activePage === 'faq') {
      return <FaqPage lang={lang} />
    }

    if (activePage === 'contact') {
      return <ContactPage lang={lang} />
    }

    if (activePage === 'cargo-vans') {
      return <CargoVansPage lang={lang} />
    }

    if (activePage === 'tripadvisor') {
      return <TripadvisorPage lang={lang} />
    }

    if (activePage === 'customer-reviews') {
      return <CustomerReviewsPage lang={lang} />
    }

    if (activePage === 'early-bird') {
      return <EarlyBirdPage lang={lang} />
    }

    if (activePage === 'about') {
      return <AboutPage lang={lang} />
    }

    if (activePage === 'locations') {
      return (
        <Suspense fallback={<div className="api-banner api-loading">{lang === 'el' ? 'Φόρτωση τοποθεσιών…' : 'Loading locations…'}</div>}>
          <LocationsPage
            lang={lang}
            onRequestQuote={() => onNavClick('quote')}
            onLocationNavigate={navigateToLocation}
          />
        </Suspense>
      )
    }

    if (activePage === 'location-detail') {
      return (
        <Suspense fallback={<div className="api-banner api-loading">{lang === 'el' ? 'Φόρτωση τοποθεσίας…' : 'Loading location…'}</div>}>
          <LocationDetailPage
            lang={lang}
            slug={categorySlug}
            onLocationNavigate={navigateToLocation}
            onBackToLocations={() => onNavClick('locations')}
            onRequestQuote={() => onNavClick('quote')}
            onContactUs={() => onNavClick('contact')}
          />
        </Suspense>
      )
    }

    if (activePage === 'home') {
      return (
        <HomePage lang={lang} />
      )
    }

    if (activePage === 'fleet') {
      return (
        <FleetPages
          lang={lang}
          groups={groups}
          vehicles={vehicles}
          loading={loading}
          error={error}
          fallbackImage={FALLBACK_IMAGE}
        />
      )
    }

    if (activePage === 'quote' || activePage === 'booking') {
      return (
        <QuotePages
          lang={lang}
          locations={locations}
          extras={extras}
          vehicles={vehicles}
          loading={loading}
          error={error}
          fallbackImage={FALLBACK_IMAGE}
          api={{ checkAvailability, getPricingEstimate, createBooking }}
          onReservationCreated={(reservation) => {
            window.history.pushState({}, '', `/pay?ref=${encodeURIComponent(reservation.reference)}`)
            setReservationNotice(reservation)
            setCategorySlug('')
            setActivePage('payment')
          }}
        />
      )
    }

    if (['payment', 'payment-success', 'payment-cancel'].includes(activePage)) {
      return (
        <SecurePaymentPage route={activePage} reservationNotice={reservationNotice} lang={lang} />
      )
    }

    return (
      <StaticPages
        staticPage={staticPage}
        lang={lang}
        loading={loading}
        error={error}
      />
    )
  }

  const onNavClick = (key) => {
    const destinations = {
      home: { path: '/', page: 'home' },
      fleet: { path: '/pricelist', page: 'pricelist' },
      static: { path: '/rental-conditions', page: 'static' },
      faq: { path: '/faq', page: 'faq' },
      contact: { path: '/contact', page: 'contact' },
      'cargo-vans': { path: '/cargo-vans', page: 'cargo-vans' },
      tripadvisor: { path: '/tripadvisor', page: 'tripadvisor' },
      'customer-reviews': { path: '/customer-reviews', page: 'customer-reviews' },
      about: { path: '/about', page: 'about' },
      locations: { path: '/locations', page: 'locations' },
      quote: { path: '/quote', page: 'quote' },
      payment: { path: '/pay', page: 'payment' },
      'standard-cars': { path: '/standard-cars', page: 'vehicle-group', slug: 'standard-cars' },
      'automatic-cars': { path: '/automatic-cars', page: 'vehicle-group', slug: 'automatic-cars' },
      'mini-vans': { path: '/mini-vans', page: 'vehicle-group', slug: 'mini-vans' },
      suvs: { path: '/vehicles/suvs', page: 'vehicle-group', slug: 'suvs' },
      'luxury-cars': { path: '/vehicles/luxury-cars', page: 'vehicle-group', slug: 'luxury-cars' },
      'attika-routes': { path: '/attika-routes', page: 'attika-routes' },
      'cookies-policy': { path: '/cookies-privacy-policy', page: 'cookies-policy' },
    }
    const destination = destinations[key]
    const routePath = destination?.path
    const localizedRoutePath = routePath ? `${routePath}?lang=${lang}` : routePath
    if (localizedRoutePath && `${window.location.pathname}${window.location.search}` !== localizedRoutePath) {
      window.history.pushState({}, '', localizedRoutePath)
    }
    if (destination) {
      setCategorySlug(destination.slug || '')
      setActivePage(destination.page)
    }
    setMenuOpen(false)
    setInfoMenuOpen(false)
  }

  const navigateToLocation = (location) => {
    const routePath = `/locations/${location.slug}?lang=${lang}`
    if (`${window.location.pathname}${window.location.search}` !== routePath) window.history.pushState({}, '', routePath)
    setActivePage('location-detail')
    setCategorySlug(location.slug)
    setMenuOpen(false)
    setInfoMenuOpen(false)
  }

  const infoItems = [
    { key: 'standard-cars', href: '/standard-cars', label: { en: 'Standard cars', el: 'Τυπικά αυτοκίνητα' } },
    { key: 'automatic-cars', href: '/automatic-cars', label: { en: 'Automatic cars', el: 'Αυτόματα αυτοκίνητα' } },
    { key: 'mini-vans', href: '/mini-vans', label: { en: 'Mini Vans', el: 'Μίνι βαν' } },
    { key: 'suvs', href: '/vehicles/suvs', label: { en: 'SUVs', el: 'SUV' } },
    { key: 'luxury-cars', href: '/vehicles/luxury-cars', label: { en: 'Luxury cars', el: 'Πολυτελή αυτοκίνητα' } },
    { key: 'attika-routes', href: '/attika-routes', label: { en: 'Attika Routes', el: 'Διαδρομές Αττικής' } },
    { key: 'static', href: '/rental-conditions', label: { en: 'Rental conditions', el: 'Όροι ενοικίασης' } },
    { key: 'faq', href: '/faq', label: { en: 'FAQ', el: 'Συχνές ερωτήσεις' } },
    { key: 'payment', href: '/pay', label: { en: 'Secure payment', el: 'Ασφαλής πληρωμή' } },
    { key: 'customer-reviews', href: '/customer-reviews', label: { en: 'Customer Reviews', el: 'Κριτικές πελατών' } },
  ]

  const handleInfoLinkClick = (event, key) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onNavClick(key)
  }

  const isInfoItemActive = (item) => {
    if (item.key === 'standard-cars' || item.key === 'automatic-cars' || item.key === 'mini-vans' || item.key === 'suvs' || item.key === 'luxury-cars') {
      return activePage === 'vehicle-group' && categorySlug === item.key
    }
    return activePage === item.key
  }

  return (
    <div className={`bg-[#f7f4ef] text-slate-800 antialiased ${activePage === 'payment' ? 'payment-route-shell' : ''} ${activePage === 'cookies-policy' ? 'cookies-policy-shell' : ''}`}>
      <div className="bg-[#0b0b0d] text-white text-sm">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <div className="flex h-10 items-center justify-between">
            <div className="hidden md:flex items-center gap-5">
              <a href="tel:+302106022220" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">{lang === 'el' ? 'Τηλέφωνο' : 'Phone'}</span>
                <span>+30 210 6022220</span>
              </a>
              <a href="tel:+302106624887" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">{lang === 'el' ? 'Τηλέφωνο' : 'Phone'}</span>
                <span>+30 210 6624887</span>
              </a>
              <a href="mailto:info@athenscarrental.com" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Zm0 0 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">{lang === 'el' ? 'Email' : 'Email'}</span>
                <span>info@athenscarrental.com</span>
              </a>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-white/10 p-1" aria-label={lang === 'el' ? 'Επιλογή γλώσσας' : 'Language switcher'}>
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${lang === 'en' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`}
                  onClick={() => setLang('en')}
                  aria-label={lang === 'el' ? 'Αγγλικά' : 'English'}
                  aria-pressed={lang === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${lang === 'el' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`}
                  onClick={() => setLang('el')}
                  aria-label={lang === 'el' ? 'Ελληνικά' : 'Greek'}
                  aria-pressed={lang === 'el'}
                >
                  EL
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3" aria-label={lang === 'el' ? 'Σύνδεσμοι κοινωνικών δικτύων' : 'Social links'}>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M13.5 21v-8h2.7l.4-3h-3.1V7.5c0-.9.3-1.5 1.6-1.5H17V3.1c-.4-.1-1.6-.2-3-.2-3 0-5 1.8-5 5.2V10H6.5v3H9v8h4.5Z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black hover:text-white">
                  <span className="sr-only">Instagram</span>
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
                  </svg>
                </a>
                <a href="https://wa.me/302106022220" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-[#25D366] transition-colors hover:bg-black">
                  <span className="sr-only">WhatsApp</span>
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.11 4.89A9.8 9.8 0 0 0 12.13 2C6.62 2 2.16 6.46 2.16 11.97c0 1.77.47 3.5 1.35 5.02L2 22l5.17-1.35a9.96 9.96 0 0 0 4.96 1.29h.01c5.51 0 9.96-4.46 9.96-9.97 0-2.67-1.04-5.17-2.89-7.08Zm-7 3.42c.26 0 .58.01.83.01.28 0 .66.01.79.52.19.73-.37 1.9-.58 2.27-.17.29-.34.64-.12 1.17.22.52 1.02 1.7 2.2 2.76 1.51 1.22 2.79 1.59 3.3 1.77.5.18.82.14 1.1-.08.28-.22.84-.96.99-1.29.15-.33.3-.27.63-.16.32.11 2.07 1 2.44 1.18.38.18.63.27.73.42.1.15.1.86-.2 1.68-.3.82-1.64 1.64-2.27 1.76-.63.12-1.3.12-2.93-.63-2.5-.97-4.11-3.58-4.24-3.74-.13-.17-1.64-2.17-1.64-4.14 0-1.97 1.04-2.95 1.4-3.35.36-.41.78-.5 1.04-.5Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 transition-shadow ${scrolled ? 'shadow-md' : ''}`}>
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <div className="flex h-20 items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-3 whitespace-nowrap text-left"
              onClick={() => onNavClick('home')}
              aria-label={lang === 'el' ? 'Αρχική σελίδα Athens Car Rental' : 'Athens Car Rental home'}
            >
              <img
                src="/images/acr-logo.png"
                alt="Athens Car Rental logo"
                className="h-16 w-auto object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.16)]"
                onError={(event) => {
                  event.currentTarget.src = '/images/logo.svg';
                }}
              />
              <span className="text-lg font-extrabold tracking-tight text-slate-800">Athens Car Rental</span>
            </button>

            <nav className="hidden lg:flex items-center gap-8" aria-label={lang === 'el' ? 'Κύρια πλοήγηση' : 'Main navigation'}>
              {[
                { key: 'home', label: activeNav.find((item) => item.key === 'home')?.label },
                { key: 'fleet', label: activeNav.find((item) => item.key === 'fleet')?.label },
              ].map((item) => {
                const isActive = activePage === item.key || (item.key === 'fleet' && ['pricelist', 'category-detail', 'vehicle-group'].includes(activePage))
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavClick(item.key)}
                    className={`inline-flex items-center border-0 bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                      isActive ? 'border-b-2 border-[#FACC15] text-[#111111]' : 'border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}

              <div ref={infoMenuRef} className={`relative ${infoMenuOpen ? 'z-[60]' : ''}`}>
                <button
                  ref={infoMenuButtonRef}
                  type="button"
                  className={`inline-flex items-center gap-1 border-0 bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    infoItems.some(isInfoItemActive) ? 'border-b-2 border-[#FACC15] text-[#111111]' : 'border-transparent'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={infoMenuOpen}
                  onClick={() => setInfoMenuOpen((open) => !open)}
                >
                  {lang === 'el' ? 'Εξερευνήστε' : 'Explore'}
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.18l3.71-3.95a.75.75 0 1 1 1.08 1.04l-4.25 4.52a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1-.02-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {infoMenuOpen && (
                  <div className="absolute left-0 top-full z-[1000] w-56 pt-2">
                    <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-soft" role="menu" aria-label="Explore links">
                      {infoItems.map((item) => {
                        const label = item.label[lang] || item.label.en
                        const isActive = isInfoItemActive(item)
                        return (
                          <a
                            key={item.key}
                            href={item.href}
                            role="menuitem"
                            className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                              isActive ? 'bg-[#FEF3C7] text-[#111111] ring-1 ring-[#FACC15]' : 'hover:bg-slate-50 hover:text-navy'
                            }`}
                            onClick={(event) => handleInfoLinkClick(event, item.key)}
                          >
                            {label}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {[
                { key: 'locations', label: activeNav.find((item) => item.key === 'locations')?.label },
                { key: 'contact', label: activeNav.find((item) => item.key === 'contact')?.label },
              ].map((item) => {
                const isActive = activePage === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavClick(item.key)}
                    className={`inline-flex items-center border-0 bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                      isActive ? 'border-b-2 border-accent text-navy' : 'border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}

              <a
                href="/booking"
                className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-6 py-3 text-sm font-bold text-[#111111] shadow-lg shadow-yellow-500/30 transition duration-200 hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2"
              >
                {activeNav.find((item) => item.key === 'quote')?.label}
              </a>
            </nav>

            <div className="flex items-center gap-3 lg:hidden">
              <a href="tel:+302106022220" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {lang === 'el' ? 'Κλήση' : 'Call'}
              </a>
              <a href="https://wa.me/302106022220" target="_blank" rel="noreferrer" aria-label="WhatsApp" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-[#25D366] shadow-md shadow-black/30 transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                <span className="sr-only">WhatsApp</span>
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.11 4.89A9.8 9.8 0 0 0 12.13 2C6.62 2 2.16 6.46 2.16 11.97c0 1.77.47 3.5 1.35 5.02L2 22l5.17-1.35a9.96 9.96 0 0 0 4.96 1.29h.01c5.51 0 9.96-4.46 9.96-9.97 0-2.67-1.04-5.17-2.89-7.08Zm-7 3.42c.26 0 .58.01.83.01.28 0 .66.01.79.52.19.73-.37 1.9-.58 2.27-.17.29-.34.64-.12 1.17.22.52 1.02 1.7 2.2 2.76 1.51 1.22 2.79 1.59 3.3 1.77.5.18.82.14 1.1-.08.28-.22.84-.96.99-1.29.15-.33.3-.27.63-.16.32.11 2.07 1 2.44 1.18.38.18.63.27.73.42.1.15.1.86-.2 1.68-.3.82-1.64 1.64-2.27 1.76-.63.12-1.3.12-2.93-.63-2.5-.97-4.11-3.58-4.24-3.74-.13-.17-1.64-2.17-1.64-4.14 0-1.97 1.04-2.95 1.4-3.35.36-.41.78-.5 1.04-.5Z" />
                </svg>
              </a>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-transparent text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={lang === 'el' ? 'Εναλλαγή μενού' : 'Toggle menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-white lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <button type="button" className="flex items-center gap-3 text-left" onClick={() => onNavClick('home')} aria-label={lang === 'el' ? 'Αρχική σελίδα Athens Car Rental' : 'Athens Car Rental home'}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-base font-extrabold text-white">ACR</span>
                  <span className="text-base font-extrabold text-slate-800">Athens Car Rental</span>
                </button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-transparent text-slate-700" onClick={() => setMenuOpen(false)} aria-label={lang === 'el' ? 'Κλείσιμο μενού' : 'Close mobile menu'}>
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label={lang === 'el' ? 'Πλοήγηση για κινητά' : 'Mobile navigation'}>
                <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                  <span className="text-sm font-semibold text-slate-700">{lang === 'el' ? 'Γλώσσα' : 'Language'}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={`rounded-full px-3 py-1 text-xs font-bold ${lang === 'en' ? 'bg-[#FACC15] text-[#111111]' : 'text-slate-600'}`}>EN</button>
                    <button type="button" aria-pressed={lang === 'el'} onClick={() => setLang('el')} className={`rounded-full px-3 py-1 text-xs font-bold ${lang === 'el' ? 'bg-[#FACC15] text-[#111111]' : 'text-slate-600'}`}>EL</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'home', label: activeNav.find((item) => item.key === 'home')?.label },
                    { key: 'fleet', label: activeNav.find((item) => item.key === 'fleet')?.label },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => onNavClick(item.key)} className="block w-full rounded-xl bg-transparent px-3 py-3 text-left text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy">
                      {item.label}
                    </button>
                  ))}

                  <div ref={mobileInfoMenuRef} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <button
                      ref={mobileInfoMenuButtonRef}
                      type="button"
                      className="mb-2 flex w-full items-center justify-between px-2 py-1 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                      aria-haspopup="true"
                      aria-expanded={infoMenuOpen}
                      onClick={() => setInfoMenuOpen((open) => !open)}
                    >
                      {lang === 'el' ? 'Εξερευνήστε' : 'Explore'}
                      <span aria-hidden="true">{infoMenuOpen ? '−' : '+'}</span>
                    </button>
                    {infoMenuOpen && infoItems.map((item) => (
                      <a
                        key={item.key}
                        href={item.href}
                        onClick={(event) => handleInfoLinkClick(event, item.key)}
                        className={`block w-full cursor-pointer rounded-lg px-3 py-3 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isInfoItemActive(item) ? 'bg-[#FEF3C7] text-[#111111] ring-1 ring-[#FACC15]' : 'bg-transparent text-slate-700 hover:bg-white hover:text-navy'
                        }`}
                      >
                        {item.label[lang] || item.label.en}
                      </a>
                    ))}
                  </div>

                  {[
                    { key: 'locations', label: activeNav.find((item) => item.key === 'locations')?.label },
                    { key: 'contact', label: activeNav.find((item) => item.key === 'contact')?.label },
                  ].map((item) => (
                    <button key={item.key} type="button" onClick={() => onNavClick(item.key)} className="block w-full rounded-xl bg-transparent px-3 py-3 text-left text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-navy">
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  <a href="/booking" className="inline-flex w-full items-center justify-center rounded-full bg-[#FACC15] px-6 py-3 text-sm font-bold text-[#111111] shadow-lg shadow-yellow-500/30 transition hover:-translate-y-0.5 hover:bg-[#EAB308] hover:shadow-xl">
                    {activeNav.find((item) => item.key === 'quote')?.label}
                  </a>
                  <a href="tel:+302106022220" className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-slate-50">
                    +30 210 6022220
                  </a>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>

      {error && <div className="api-banner api-error">{error}</div>}
      {loading && <div className="api-banner api-loading">{lang === 'el' ? 'Φόρτωση περιεχομένου…' : 'Loading content…'}</div>}

      <main>{renderPage()}</main>

      <footer className="site-footer">
        <div className="footer-bento-wrap">
          <div className="footer-watermark" aria-hidden="true">ACR</div>
          <div className="footer-bento">
            <section className="footer-card footer-brand" aria-label={lang === 'el' ? 'Athens Car Rental' : 'Athens Car Rental'}>
              <a href="/" onClick={(event) => handleInfoLinkClick(event, 'home')} className="footer-logo">
                <img src="/images/acr-logo.png" alt="" />
                <span><strong>Athens Car Rental</strong><small>{lang === 'el' ? 'ACR · ΑΘΗΝΑ, ΕΛΛΑΔΑ' : 'ACR · ATHENS, GREECE'}</small></span>
              </a>
              <p>{lang === 'el'
                ? 'Η αξιόπιστη ενοικίαση αυτοκινήτου στην Αθήνα από το 2005. Η ομάδα μας είναι εδώ για να σας βοηθήσει να ταξιδέψετε με άνεση.'
                : 'Your trusted car rental in Athens since 2005. Our team is here to help you travel comfortably and confidently.'}</p>
              <div className="footer-trust-badge"><Star size={15} aria-hidden="true" /><span>{lang === 'el' ? 'Από το 2005' : 'Since 2005'}</span></div>
              <div className="footer-social-links" aria-label={lang === 'el' ? 'Ακολουθήστε μας' : 'Follow us'}>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.7v1.9h-3v3.2h3V21h3.9Z" fill="currentColor" /></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.7" cy="6.6" r="1.1" fill="currentColor" /></svg>
                </a>
                <a href="/tripadvisor" onClick={(event) => handleInfoLinkClick(event, 'tripadvisor')} aria-label="Tripadvisor">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.3 8.3c2.1-2.4 5-3.6 8.7-3.6s6.6 1.2 8.7 3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="7.5" cy="13" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="16.5" cy="13" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.7" /><circle cx="7.5" cy="13" r="1.2" fill="currentColor" /><circle cx="16.5" cy="13" r="1.2" fill="currentColor" /><path d="m10.5 18 1.5 1.5 1.5-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            </section>

            <nav className="footer-card footer-column footer-explore" aria-label={lang === 'el' ? 'Εξερευνήστε' : 'Explore'}>
              <h3>{lang === 'el' ? 'Εξερευνήστε' : 'Explore'}</h3>
              <a href="/about" onClick={(event) => handleInfoLinkClick(event, 'about')}>{lang === 'el' ? 'Σχετικά με εμάς' : 'About ACR'}</a>
              <a href="/locations" onClick={(event) => handleInfoLinkClick(event, 'locations')}>{lang === 'el' ? 'Τοποθεσίες παραλαβής' : 'Pickup locations'}</a>
              <a href="/customer-reviews" onClick={(event) => handleInfoLinkClick(event, 'customer-reviews')}>{lang === 'el' ? 'Κριτικές πελατών' : 'Customer reviews'}</a>
              <a href="/tripadvisor" onClick={(event) => handleInfoLinkClick(event, 'tripadvisor')}>Tripadvisor</a>
              <a href="/attika-routes" onClick={(event) => handleInfoLinkClick(event, 'attika-routes')}>Attika Routes</a>
            </nav>

            <nav className="footer-card footer-column footer-fleet" aria-label={lang === 'el' ? 'Κατηγορίες οχημάτων' : 'Our fleet'}>
              <h3>{lang === 'el' ? 'Ο στόλος μας' : 'Our fleet'}</h3>
              <a href="/standard-cars" onClick={(event) => handleInfoLinkClick(event, 'standard-cars')}>{lang === 'el' ? 'Τυπικά αυτοκίνητα' : 'Standard cars'}</a>
              <a href="/automatic-cars" onClick={(event) => handleInfoLinkClick(event, 'automatic-cars')}>{lang === 'el' ? 'Αυτόματα αυτοκίνητα' : 'Automatic cars'}</a>
              <a href="/mini-vans" onClick={(event) => handleInfoLinkClick(event, 'mini-vans')}>{lang === 'el' ? 'Μίνι βαν' : 'Mini Vans'}</a>
              <a href="/vehicles/suvs" onClick={(event) => handleInfoLinkClick(event, 'suvs')}>SUVs</a>
              <a href="/vehicles/luxury-cars" onClick={(event) => handleInfoLinkClick(event, 'luxury-cars')}>{lang === 'el' ? 'Πολυτελή αυτοκίνητα' : 'Luxury cars'}</a>
            </nav>

            <nav className="footer-card footer-column footer-help" aria-label={lang === 'el' ? 'Χρήσιμοι σύνδεσμοι' : 'Helpful links'}>
              <h3>{lang === 'el' ? 'Χρήσιμοι σύνδεσμοι' : 'Helpful links'}</h3>
              <a href="/faq" onClick={(event) => handleInfoLinkClick(event, 'faq')}>FAQ</a>
              <a href="/rental-conditions" onClick={(event) => handleInfoLinkClick(event, 'static')}>{lang === 'el' ? 'Όροι ενοικίασης' : 'Rental conditions'}</a>
              <a href="/contact" onClick={(event) => handleInfoLinkClick(event, 'contact')}>{lang === 'el' ? 'Επικοινωνία' : 'Contact us'}</a>
              <a href="/pay" onClick={(event) => handleInfoLinkClick(event, 'payment')}>{lang === 'el' ? 'Ασφαλής πληρωμή' : 'Secure payment'}</a>
              <a href="/cookies-privacy-policy#use-of-cookies" className="footer-text-button" onClick={(event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                navigateToCookieSettings()
              }}>{lang === 'el' ? 'Ρυθμίσεις cookies' : 'Cookie settings'}</a>
            </nav>

            <section className="footer-card footer-map-card" aria-label={lang === 'el' ? 'Η τοποθεσία μας' : 'Our location'}>
              <div className="footer-map-illustration" aria-hidden="true">
                <span className="footer-map-road footer-map-road-one" />
                <span className="footer-map-road footer-map-road-two" />
                <span className="footer-map-road footer-map-road-three" />
                <span className="footer-map-pin"><MapPin size={22} aria-hidden="true" /></span>
                <span className="footer-map-label">{lang === 'el' ? 'ΚΟΡΩΠΙ · ΑΘΗΝΑ' : 'KOROPI · ATHENS'}</span>
              </div>
              <div className="footer-map-copy">
                <span className="footer-card-kicker">{lang === 'el' ? 'ΕΠΙΣΚΕΦΘΕΙΤΕ ΜΑΣ' : 'FIND US'}</span>
                <p>{lang === 'el' ? '3ο χλμ. Λεωφόρου Μαρκοπούλου–Παιανίας, Κορωπί, Αθήνα' : '3rd km Markopoulou–Paiania Avenue, Koropi, Athens'}</p>
                <a href="https://maps.google.com/?daddr=3rd+km+Markopoulou+Paiania+Avenue+Koropi+Athens" target="_blank" rel="noreferrer" className="footer-directions-link">
                  {lang === 'el' ? 'Οδηγίες διαδρομής' : 'Get directions'}<ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </section>

            <section className="footer-card footer-contact-card" aria-label={lang === 'el' ? 'Επικοινωνία και ώρες' : 'Contact and hours'}>
              <h3>{lang === 'el' ? 'Επικοινωνία' : 'Contact'}</h3>
              <div className="footer-hours">
                <Clock3 size={18} aria-hidden="true" />
                <span><strong>{lang === 'el' ? 'Ώρες λειτουργίας' : 'Opening hours'}</strong><small>{lang === 'el' ? 'Παράδοση και παραλαβή στο αεροδρόμιο 24/7 κατόπιν ραντεβού' : 'Airport delivery & collection 24/7 by appointment'}</small></span>
              </div>
              <a href="mailto:info@athenscarrental.com" className="footer-contact-detail"><Mail size={17} aria-hidden="true" />info@athenscarrental.com</a>
              <a href="tel:+302106624887" className="footer-contact-detail"><Phone size={17} aria-hidden="true" />+30 210 6624887</a>
            </section>

            <section className="footer-card footer-payment-card" aria-label={lang === 'el' ? 'Ασφαλείς online πληρωμές' : 'Secure online payments'}>
              <div className="footer-payment-copy">
                <ShieldCheck size={25} aria-hidden="true" />
                <span><strong>{lang === 'el' ? 'Ασφαλείς online πληρωμές' : 'Secure online payments'}</strong><small>{lang === 'el' ? 'Ασφαλής πληρωμή SSL' : 'SSL protected checkout'}</small></span>
              </div>
              <div className="footer-card-brands" aria-label="Card payments">
                <span className="footer-visa-mark">VISA</span>
                <span className="footer-mastercard-mark" aria-label="Mastercard"><i /><i /></span>
              </div>
            </section>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Athens Car Rental Greece. {lang === 'el' ? 'Με επιφύλαξη παντός δικαιώματος.' : 'All rights reserved.'}</p>
          <div className="footer-bottom-actions">
            <a href="/cookies-privacy-policy" onClick={(event) => handleInfoLinkClick(event, 'cookies-policy')}>{lang === 'el' ? 'Πολιτική Cookies και Απορρήτου' : 'Cookies & Privacy Policy'}</a>
            <p>{lang === 'el' ? 'Σχεδιασμός και ανάπτυξη από' : 'Designed and developed by'} <a href="https://internetmarketing.gr" target="_blank" rel="noreferrer">InternetMarketing.gr</a></p>
            <button type="button" className="footer-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={lang === 'el' ? 'Επιστροφή στην κορυφή' : 'Back to top'}>
              <span>{lang === 'el' ? 'Πίσω στην κορυφή' : 'Back to top'}</span><ArrowUp size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>

      {cookieConsentError && !cookieDialogOpen && <p className="cookie-consent-error" role="alert">{cookieConsentError}</p>}

      {cookieConsentLoaded && cookieDialogOpen && (
        <div
          className={`cookie-banner z-40${cookieCustomizing ? ' cookie-banner--customizing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-dialog-title"
          ref={cookieDialogRef}
        >
          <div className="cookie-banner__text">
            <strong id="cookie-dialog-title">{lang === 'el'
              ? cookieCustomizing ? 'Ρυθμίσεις cookies' : 'Ειδοποίηση cookies'
              : cookieCustomizing ? 'Cookie settings' : 'Cookie notice'}</strong>
            <p>
              {cookieCustomizing
                ? lang === 'el'
                  ? 'Αυτός ο ιστότοπος χρησιμοποιεί μόνο τα απολύτως απαραίτητα cookies. Δεν χρησιμοποιεί cookies ανάλυσης ή διαφήμισης.'
                  : 'This site currently uses only strictly necessary cookies. It does not use analytics or advertising cookies.'
                : lang === 'el'
                  ? 'Χρησιμοποιούμε μόνο τα απολύτως απαραίτητα cookies για τη λειτουργία του ιστότοπου και την αποθήκευση της επιλογής σας.'
                  : 'We use strictly necessary cookies to provide and remember your cookie choice.'}
            </p>
            {cookieCustomizing && (
              <div className="cookie-categories">
                <p><strong>{lang === 'el' ? 'Τρέχουσα επιλογή:' : 'Current choice:'}</strong> {cookieConsent || (lang === 'el' ? 'Δεν έχει οριστεί' : 'Not set')}</p>
                <label>
                  <input type="checkbox" checked readOnly disabled />
                  <span><strong>{lang === 'el' ? 'Απολύτως απαραίτητα' : 'Strictly necessary'}</strong><br />{lang === 'el'
                    ? 'Απαιτούνται για τη λειτουργία του ιστότοπου και την αποθήκευση της συγκατάθεσής σας. Είναι πάντα ενεργά.'
                    : 'Required for the site and consent preference to work. Always active.'}</span>
                </label>
              </div>
            )}
          </div>
          <div className={`cookie-actions${cookieCustomizing ? ' cookie-actions--equal' : ''}`}>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('accepted')}>{lang === 'el' ? 'Αποδοχή όλων' : 'Accept all'}</button>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('refused')}>{lang === 'el' ? 'Απόρριψη όλων' : 'Refuse all'}</button>
            <button
              type="button"
              disabled={cookieConsentSaving}
              ref={cookieCustomizeTriggerRef}
              onClick={(event) => {
                if (cookieCustomizing) {
                  void handleCookieChoice('customized')
                } else {
                  cookieCustomizeTriggerRef.current = event.currentTarget
                  setCookieCustomizing(true)
                }
              }}
            >
              {lang === 'el'
                ? cookieCustomizing ? 'Αποθήκευση επιλογών' : 'Προσαρμογή'
                : cookieCustomizing ? 'Save my choices' : 'Customize'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

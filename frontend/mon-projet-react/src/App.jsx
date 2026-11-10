import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { getVehicleGroups, getVehicles } from './api/vehicles'
import { getLocations } from './api/locations'
import { getExtras } from './api/extras'
import { getPageBySlug } from './api/pages'
import { checkAvailability } from './api/availability'
import { getPricingEstimate } from './api/pricing'
import { createBooking } from './api/checkout'
import { getCookieConsent, saveCookieConsent } from './api/cookie-consent'
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
  const [lang, setLang] = useState('en')
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

  const closeCookieDialog = () => {
    setCookieDialogOpen(false)
    setCookieCustomizing(false)
    const trigger = cookieFocusReturnRef.current
    cookieFocusReturnRef.current = null
    if (trigger?.isConnected) window.requestAnimationFrame(() => trigger.focus())
  }

  const openCookieSettings = (event) => {
    event.preventDefault()
    cookieFocusReturnRef.current = event.currentTarget
    setCookieConsentError('')
    setCookieCustomizing(true)
    setCookieDialogOpen(true)
  }

  const handleCookieChoice = async (choice) => {
    setCookieConsentSaving(true)
    setCookieConsentError('')
    try {
      const { data } = await saveCookieConsent(choice)
      setCookieConsent(data.choice)
      closeCookieDialog()
    } catch {
      setCookieConsentError('We could not save your cookie choice. No preferences were changed. Please try again from Cookie settings.')
      closeCookieDialog()
    } finally {
      setCookieConsentSaving(false)
    }
  }

  useEffect(() => {
    const urlLang = new URLSearchParams(window.location.search).get('lang')
    if (urlLang === 'el' || urlLang === 'en') setLang(urlLang)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('lang', lang)
    const nextUrl = `${window.location.pathname}?${params.toString()}`
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
        setError(err.message || 'Unable to load fleet data.')
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
        setError(err.message || 'Page not found.')
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
      return <RentalConditionsPage />
    }

    if (activePage === 'pricelist') {
      return <PricelistPage />
    }

    if (activePage === 'category-detail') {
      return <CategoryDetailPage slug={categorySlug} />
    }

    if (activePage === 'vehicle-group') {
      return <VehicleGroupPage slug={categorySlug} />
    }

    if (activePage === 'faq') {
      return <FaqPage />
    }

    if (activePage === 'contact') {
      return <ContactPage />
    }

    if (activePage === 'cargo-vans') {
      return <CargoVansPage />
    }

    if (activePage === 'tripadvisor') {
      return <TripadvisorPage />
    }

    if (activePage === 'customer-reviews') {
      return <CustomerReviewsPage />
    }

    if (activePage === 'early-bird') {
      return <EarlyBirdPage />
    }

    if (activePage === 'about') {
      return <AboutPage />
    }

    if (activePage === 'locations') {
      return (
        <Suspense fallback={<div className="api-banner api-loading">Loading locations…</div>}>
          <LocationsPage
            onRequestQuote={() => onNavClick('quote')}
            onLocationNavigate={navigateToLocation}
          />
        </Suspense>
      )
    }

    if (activePage === 'location-detail') {
      return (
        <Suspense fallback={<div className="api-banner api-loading">Loading location…</div>}>
          <LocationDetailPage
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
        <HomePage />
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
        <SecurePaymentPage route={activePage} reservationNotice={reservationNotice} />
      )
    }

    return (
      <StaticPages
        lang={lang}
        staticPage={staticPage}
        setStaticPage={setStaticPage}
        loading={loading}
        error={error}
      />
    )
  }

  const onNavClick = (key) => {
    const routePaths = {
      home: '/',
      fleet: '/pricelist',
      static: '/rental-conditions',
      faq: '/faq',
      contact: '/contact',
      'cargo-vans': '/cargo-vans',
      tripadvisor: '/tripadvisor',
      'customer-reviews': '/customer-reviews',
      about: '/about',
      locations: '/locations',
      quote: '/quote',
      payment: '/pay',
    }
    const routePath = routePaths[key]
    if (routePath && window.location.pathname !== routePath) {
      window.history.pushState({}, '', routePath)
    }
    if (routePath) setCategorySlug('')
    setActivePage(key === 'fleet' ? 'pricelist' : key)
    setMenuOpen(false)
    setInfoMenuOpen(false)
  }

  const navigateToLocation = (location) => {
    const routePath = `/locations/${location.slug}`
    if (window.location.pathname !== routePath) window.history.pushState({}, '', routePath)
    setActivePage('location-detail')
    setCategorySlug(location.slug)
    setMenuOpen(false)
    setInfoMenuOpen(false)
  }

  const infoItems = [
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

  return (
    <div className={`bg-[#f7f4ef] text-slate-800 antialiased ${activePage === 'payment' ? 'payment-route-shell' : ''}`}>
      <div className="bg-[#0b0b0d] text-white text-sm">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <div className="flex h-10 items-center justify-between">
            <div className="hidden md:flex items-center gap-5">
              <a href="tel:+302106022220" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Phone</span>
                <span>+30 210 6022220</span>
              </a>
              <a href="tel:+302106624887" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Phone</span>
                <span>+30 210 6624887</span>
              </a>
              <a href="mailto:info@athenscarrental.com" className="inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white">
                <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Zm0 0 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Email</span>
                <span>info@athenscarrental.com</span>
              </a>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-white/10 p-1" aria-label="Language switcher">
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${lang === 'en' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`}
                  onClick={() => setLang('en')}
                  aria-label="English"
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${lang === 'el' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`}
                  onClick={() => setLang('el')}
                  aria-label="Greek"
                >
                  EL
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3" aria-label="Social links">
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
              aria-label="Athens Car Rental home"
            >
              <img
                src="/images/acr-logo.png"
                alt="Athens Car Rental logo"
                className="h-14 w-auto object-contain"
                onError={(event) => {
                  event.currentTarget.src = '/images/logo.svg';
                }}
              />
              <span className="text-lg font-extrabold tracking-tight text-slate-800">Athens Car Rental</span>
            </button>

            <nav className="hidden lg:flex items-center gap-8" aria-label="Main navigation">
              {[
                { key: 'home', label: activeNav.find((item) => item.key === 'home')?.label },
                { key: 'fleet', label: activeNav.find((item) => item.key === 'fleet')?.label },
              ].map((item) => {
                const isActive = activePage === item.key || (item.key === 'fleet' && ['pricelist', 'category-detail'].includes(activePage))
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

              <div ref={infoMenuRef} className={`relative ${infoMenuOpen ? 'z-[60]' : ''}`}>
                <button
                  ref={infoMenuButtonRef}
                  type="button"
                  className={`inline-flex items-center gap-1 border-0 bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    infoItems.some((item) => item.key === activePage) ? 'border-b-2 border-accent text-navy' : 'border-transparent'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={infoMenuOpen}
                  onClick={() => setInfoMenuOpen((open) => !open)}
                >
                  Infos
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.18l3.71-3.95a.75.75 0 1 1 1.08 1.04l-4.25 4.52a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1-.02-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {infoMenuOpen && (
                  <div className="absolute left-0 top-full z-[1000] w-56 pt-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-soft" role="menu" aria-label="Information links">
                      {infoItems.map((item) => {
                        const label = item.label[lang] || item.label.en
                        const isActive = activePage === item.key
                        return (
                          <a
                            key={item.key}
                            href={item.href}
                            role="menuitem"
                            className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                              isActive ? 'bg-slate-50 text-navy' : 'hover:bg-slate-50 hover:text-navy'
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
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Request a quote
              </a>
            </nav>

            <div className="flex items-center gap-3 lg:hidden">
              <a href="tel:+302106022220" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Call
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
                aria-label="Toggle menu"
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
                <button type="button" className="flex items-center gap-3 text-left" onClick={() => onNavClick('home')} aria-label="Athens Car Rental home">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-base font-extrabold text-white">ACR</span>
                  <span className="text-base font-extrabold text-slate-800">Athens Car Rental</span>
                </button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-transparent text-slate-700" onClick={() => setMenuOpen(false)} aria-label="Close mobile menu">
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Mobile navigation">
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
                      Infos
                      <span aria-hidden="true">{infoMenuOpen ? '−' : '+'}</span>
                    </button>
                    {infoMenuOpen && infoItems.map((item) => (
                      <a
                        key={item.key}
                        href={item.href}
                        onClick={(event) => handleInfoLinkClick(event, item.key)}
                        className="block w-full cursor-pointer rounded-lg bg-transparent px-3 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-white hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                  <a href="/booking" className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:shadow-xl">
                    Request a quote
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
      {loading && <div className="api-banner api-loading">Loading content…</div>}

      <main>{renderPage()}</main>

      <footer className="site-footer">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 footer-grid">
          <div>
            <h4>Athens Car Rental – ACR</h4>
            <p>3rd km Markopoulou–Paiania Avenue, Koropi</p>
            <p><a href="tel:+302106022220">+30 210 6022220</a></p>
            <p><a href="tel:+302106624887">+30 210 6624887</a></p>
            <p><a href="mailto:info@athenscarrental.com">info@athenscarrental.com</a></p>
          </div>
          <div>
            <h4>General information</h4>
            <ul>
              <li>Privacy policy</li>
              <li><a href="#cookie-settings" onClick={openCookieSettings}>Cookie settings</a></li>
              <li>Travel guide</li>
            </ul>
          </div>
          <div>
            <h4>Top vehicle categories</h4>
            <ul>
              <li>Standard cars</li>
              <li>Mini Van Automatic</li>
              <li><a href="/vehicles/mini-vans">Mini Vans</a></li>
              <li><a href="/vehicles/suvs">SUVs</a></li>
              <li><a href="/vehicles/luxury-cars">Luxury cars</a></li>
            </ul>
          </div>
          <div>
            <h4>Secure payment</h4>
            <p><a href="/pay">Secure payment</a></p>
            <p>SSL secured • Greek Tourism Organisation</p>
            <p>Google Privacy Policy • Terms</p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 footer-bottom">
          <p>© 2026 Athens Car Rental Greece</p>
          <p>Powered by InternetMarketing.gr</p>
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
            <strong id="cookie-dialog-title">{cookieCustomizing ? 'Cookie settings' : 'Cookie notice'}</strong>
            <p>
              {cookieCustomizing
                ? 'This site currently uses only strictly necessary cookies. It does not use analytics or advertising cookies.'
                : 'We use strictly necessary cookies to provide and remember your cookie choice.'}
            </p>
            {cookieCustomizing && (
              <div className="cookie-categories">
                <p><strong>Current choice:</strong> {cookieConsent || 'Not set'}</p>
                <label>
                  <input type="checkbox" checked readOnly disabled />
                  <span><strong>Strictly necessary</strong><br />Required for the site and consent preference to work. Always active.</span>
                </label>
              </div>
            )}
          </div>
          <div className={`cookie-actions${cookieCustomizing ? ' cookie-actions--equal' : ''}`}>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('accepted')}>Accept all</button>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('refused')}>Refuse all</button>
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
              {cookieCustomizing ? 'Save my choices' : 'Customize'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

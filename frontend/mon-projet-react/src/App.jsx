import { useEffect, useMemo, useState } from 'react'
import { getHome } from './api/home'
import { getVehicleGroups, getVehicles } from './api/vehicles'
import { getLocations } from './api/locations'
import { getExtras } from './api/extras'
import { getFaq } from './api/faq'
import { getOffers } from './api/offers'
import { getReviews } from './api/reviews'
import { getRentalInfo } from './api/rentalInfo'
import { getContactInfo } from './api/contact'
import { getPageBySlug } from './api/pages'
import { checkAvailability } from './api/availability'
import { getPricingEstimate } from './api/pricing'
import { createQuote } from './api/quotes'
import { initPayment, getPaymentStatus } from './api/payments'
import { getCookieConsent, saveCookieConsent } from './api/cookie-consent'
import { HomePage } from './pages/HomePage'
import { FleetPages } from './pages/FleetPages'
import { QuotePages } from './pages/QuotePages'
import { PaymentPages } from './pages/PaymentPages'
import { StaticPages } from './pages/StaticPages'
import { BookingPage } from './pages/BookingPage'
import { PricelistPage } from './pages/PricelistPage'
import { CategoryDetailPage } from './pages/CategoryDetailPage'
import './App.css'

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

function resolveRoute(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  const detailMatch = path.match(/^\/fleet\/([^/]+)$/)

  if (path === '/booking') return { page: 'booking', slug: '' }
  if (path === '/pricelist') return { page: 'pricelist', slug: '' }
  if (detailMatch) return { page: 'category-detail', slug: decodeURIComponent(detailMatch[1]) }
  if (path === '/fleet') return { page: 'fleet', slug: '' }
  return { page: 'home', slug: '' }
}

function App() {
  const [lang, setLang] = useState('en')
  const [activePage, setActivePage] = useState(() => resolveRoute().page)
  const [categorySlug, setCategorySlug] = useState(() => resolveRoute().slug)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoMenuOpen, setInfoMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [homeData, setHomeData] = useState({ slides: [], banners: [], arguments: [] })
  const [offers, setOffers] = useState([])
  const [reviews, setReviews] = useState([])
  const [groups, setGroups] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [locations, setLocations] = useState([])
  const [extras, setExtras] = useState([])
  const [faq, setFaq] = useState([])
  const [rentalInfo, setRentalInfo] = useState({})
  const [contactInfo, setContactInfo] = useState({})
  const [staticPage, setStaticPage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cookieConsent, setCookieConsent] = useState(null)
  const [cookieConsentLoaded, setCookieConsentLoaded] = useState(false)
  const [cookieConsentSaving, setCookieConsentSaving] = useState(false)
  const [cookieConsentError, setCookieConsentError] = useState('')

  useEffect(() => {
    const handlePopState = () => {
      const route = resolveRoute()
      setActivePage(route.page)
      setCategorySlug(route.slug)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let active = true

    getCookieConsent()
      .then(({ data }) => {
        if (active) setCookieConsent(data?.choice || null)
      })
      .catch((requestError) => {
        if (active) setCookieConsentError(requestError.message || 'Unable to load cookie preferences.')
      })
      .finally(() => {
        if (active) setCookieConsentLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  const handleCookieChoice = async (choice) => {
    setCookieConsentSaving(true)
    setCookieConsentError('')
    try {
      const { data } = await saveCookieConsent(choice)
      setCookieConsent(data.choice)
    } catch (requestError) {
      setCookieConsentError(requestError.message || 'Unable to save cookie preferences. Please try again.')
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
    async function loadHome() {
      try {
        setLoading(true)
        setError('')
        const [homeResponse, offersResponse, reviewsResponse] = await Promise.all([
          getHome(lang),
          getOffers(lang),
          getReviews({ limit: 6 }, lang),
        ])
        setHomeData(homeResponse.data || { slides: [], banners: [], arguments: [] })
        setOffers(offersResponse.data || [])
        setReviews(reviewsResponse.data || [])
      } catch (err) {
        setError(err.message || 'Unable to load home content.')
      } finally {
        setLoading(false)
      }
    }

    if (activePage === 'home') loadHome()
  }, [activePage, lang])

  useEffect(() => {
    async function loadFleet() {
      try {
        setLoading(true)
        setError('')
        const [groupsResponse, vehiclesResponse, locationsResponse, extrasResponse] = await Promise.all([
          getVehicleGroups(lang),
          getVehicles({ page: 1, limit: 12 }, lang),
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

    if (activePage === 'fleet') loadFleet()
  }, [activePage, lang])

  useEffect(() => {
    async function loadStatic() {
      try {
        setLoading(true)
        setError('')
        const [faqResponse, rentalResponse, contactResponse] = await Promise.all([
          getFaq(lang),
          getRentalInfo(lang),
          getContactInfo(lang),
        ])
        setFaq(faqResponse.data || [])
        setRentalInfo(rentalResponse.data || {})
        setContactInfo(contactResponse.data || {})
      } catch (err) {
        setError(err.message || 'Unable to load information pages.')
      } finally {
        setLoading(false)
      }
    }

    if (activePage === 'static' || activePage === 'faq' || activePage === 'locations' || activePage === 'contact') {
      loadStatic()
    }
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
    if (activePage === 'booking') {
      return <BookingPage />
    }

    if (activePage === 'pricelist') {
      return <PricelistPage />
    }

    if (activePage === 'category-detail') {
      return <CategoryDetailPage slug={categorySlug} />
    }

    if (activePage === 'home') {
      return (
        <HomePage
          lang={lang}
          data={homeData}
          offers={offers}
          reviews={reviews}
          loading={loading}
          error={error}
          fallbackImage={FALLBACK_IMAGE}
        />
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

    if (activePage === 'quote') {
      return (
        <QuotePages
          lang={lang}
          locations={locations}
          extras={extras}
          vehicles={vehicles}
          loading={loading}
          error={error}
          fallbackImage={FALLBACK_IMAGE}
          api={{ checkAvailability, getPricingEstimate, createQuote }}
        />
      )
    }

    if (activePage === 'payment') {
      return (
        <PaymentPages
          lang={lang}
          locations={locations}
          loading={loading}
          error={error}
          fallbackImage={FALLBACK_IMAGE}
          api={{ initPayment, getPaymentStatus }}
        />
      )
    }

    return (
      <StaticPages
        lang={lang}
        faq={faq}
        rentalInfo={rentalInfo}
        contactInfo={contactInfo}
        staticPage={staticPage}
        setStaticPage={setStaticPage}
        loading={loading}
        error={error}
      />
    )
  }

  const onNavClick = (key) => {
    const routePath = key === 'fleet' ? '/pricelist' : key === 'home' ? '/' : null
    if (routePath) {
      window.history.pushState({}, '', routePath)
      setCategorySlug('')
    }
    setActivePage(key === 'fleet' ? 'pricelist' : key)
    setMenuOpen(false)
    setInfoMenuOpen(false)
  }

  const infoItems = [
    { key: 'static', label: { en: 'Rental conditions', el: 'Όροι ενοικίασης' } },
    { key: 'faq', label: { en: 'FAQ', el: 'Συχνές ερωτήσεις' } },
    { key: 'payment', label: { en: 'Secure payment', el: 'Ασφαλής πληρωμή' } },
  ]

  return (
    <div className="bg-[#f7f4ef] text-slate-800 antialiased">
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
                className="h-11 w-auto object-contain"
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

              <div className="relative group">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 border-0 bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    infoItems.some((item) => item.key === activePage) ? 'border-b-2 border-accent text-navy' : 'border-transparent'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={infoMenuOpen}
                  onMouseEnter={() => setInfoMenuOpen(true)}
                  onMouseLeave={() => setInfoMenuOpen(false)}
                  onClick={() => setInfoMenuOpen((open) => !open)}
                >
                  Infos
                  <svg width="20" height="20" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.18l3.71-3.95a.75.75 0 1 1 1.08 1.04l-4.25 4.52a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1-.02-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {infoMenuOpen && (
                  <div
                    className="absolute left-0 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-soft"
                    role="menu"
                    aria-label="Information links"
                    onMouseEnter={() => setInfoMenuOpen(true)}
                    onMouseLeave={() => setInfoMenuOpen(false)}
                  >
                    {infoItems.map((item) => {
                      const label = item.label[lang] || item.label.en
                      const isActive = activePage === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          className={`block w-full rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors ${
                            isActive ? 'bg-slate-50 text-navy' : 'hover:bg-slate-50 hover:text-navy'
                          }`}
                          onClick={() => onNavClick(item.key)}
                        >
                          {label}
                        </button>
                      )
                    })}
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

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Infos</div>
                    {infoItems.map((item) => (
                      <button key={item.key} type="button" onClick={() => onNavClick(item.key)} className="block w-full rounded-lg bg-transparent px-3 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-white hover:text-navy">
                        {item.label[lang] || item.label.en}
                      </button>
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
              <li>Cookies</li>
              <li>Travel guide</li>
            </ul>
          </div>
          <div>
            <h4>Top vehicle categories</h4>
            <ul>
              <li>Standard cars</li>
              <li>Mini Van Automatic</li>
              <li>Mini Vans</li>
              <li>SUVs</li>
              <li>Luxury cars</li>
            </ul>
          </div>
          <div>
            <h4>Secure payment</h4>
            <p>SSL secured • Greek Tourism Organisation</p>
            <p>Google Privacy Policy • Terms</p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 footer-bottom">
          <p>© 2026 Athens Car Rental Greece</p>
          <p>Powered by InternetMarketing.gr</p>
        </div>
      </footer>

      {cookieConsentLoaded && !cookieConsent && (
        <div className="cookie-banner z-40" role="dialog" aria-live="polite" aria-label="Cookie notice">
          <div className="cookie-banner__text">
            <strong>Cookies</strong>
            <p>We use cookies to improve your browsing experience and provide a smoother reservation flow.</p>
            {cookieConsentError && <p role="alert">{cookieConsentError}</p>}
          </div>
          <div className="cookie-actions">
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('accepted')}>Accept</button>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('refused')}>Refuse</button>
            <button type="button" disabled={cookieConsentSaving} onClick={() => handleCookieChoice('customized')}>Customize</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

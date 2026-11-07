import { useState } from 'react'

function formatIsoDate(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getDefaultDate(daysFromToday = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return formatIsoDate(addDays(today, daysFromToday))
}

function FieldBlock({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  min,
  max,
  error,
  inputMode,
  list,
  options = [],
}) {
  const isDateInput = type === 'date' || type === 'time'
  const isSelect = type === 'select'

  return (
    <div
      className={[
        'group relative transition-colors duration-200 hover:bg-slate-50',
        error ? 'text-red-500' : 'text-slate-900',
      ].join(' ')}
    >
      <label htmlFor={id} className="mb-1 block whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
        {label}
      </label>

      <div className={[
        'relative h-12 rounded-lg border border-slate-200 bg-white transition-colors duration-200 focus-within:border-[#FACC15] focus-within:ring-2 focus-within:ring-[#FACC15]/40',
        error ? 'border-red-300' : '',
      ].join(' ')}>
        <span className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" aria-hidden="true">
          {icon}
        </span>

        {isSelect ? (
          <>
            <select
              id={id}
              value={value || ''}
              onChange={(event) => onChange(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-label={label}
              className="h-12 w-full appearance-none rounded-lg border-0 bg-transparent px-3 text-sm font-medium text-slate-800 focus-visible:border-[#FACC15] focus-visible:outline-none"
              style={{ paddingLeft: icon ? '2.25rem' : '0.75rem', paddingRight: '2.25rem' }}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </>
        ) : (
          <input
            id={id}
            type={type}
            value={value || ''}
            min={min || undefined}
            max={max || undefined}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            list={list}
            inputMode={inputMode}
            aria-invalid={Boolean(error)}
            aria-label={label}
            className={[
              'h-12 w-full min-w-0 rounded-lg border-0 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 focus-visible:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/40',
              isDateInput ? 'appearance-none' : '',
              icon ? 'pl-9' : 'pl-3',
              'pr-3',
            ].join(' ')}
          />
        )}
      </div>

      {error && <small className="mt-1 block text-[11px] text-red-400">{error}</small>}

      {list && options.length > 0 && (
        <datalist id={list}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </div>
  )
}

function FeatureTileIcon({ name, className, width = 28, height = 28 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      {name === 'star' && <path d="m12 2.75 2.86 5.79 6.39.93-4.63 4.51 1.09 6.36L12 17.34l-5.71 3 1.09-6.36-4.63-4.51 6.39-.93L12 2.75Z" strokeLinecap="round" strokeLinejoin="round" />}
      {name === 'award' && (
        <>
          <circle cx="12" cy="8" r="6" />
          <path d="m8.2 13.2-1.1 8 4.9-2.8 4.9 2.8-1.1-8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {name === 'truck' && (
        <>
          <path d="M10 17h4V5H2v12h3m9 0h3m5 0h-2V9h-5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 9h5l3 4v4h-3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7.5" cy="17.5" r="2.5" />
          <circle cx="16.5" cy="17.5" r="2.5" />
        </>
      )}
      {name === 'badge-percent' && (
        <>
          <path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-9-9Z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7.5" cy="7.5" r=".5" />
          <path d="m15 9-6 6m.5-6h.01m5 6h.01" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

function TripAdvisorAwardBadge() {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return <FeatureTileIcon name="award" width={48} height={48} className="h-12 w-12 shrink-0 text-[#FACC15]" />
  }

  return (
    <img
      src="/images/tripadvisor-travelers-choice.png"
      alt="TripAdvisor Travelers' Choice badge"
      width={220}
      height={120}
      loading="lazy"
      onError={() => setImageError(true)}
      className="h-16 w-auto object-contain"
    />
  )
}

function VehicleCard({ model, category, image, alt, seats, transmission, bags, price }) {
  const [imageError, setImageError] = useState(false)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-within:ring-2 focus-within:ring-amber-500">
      <div className="relative aspect-[4/3] bg-slate-50 p-4">
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy shadow">
          {category}
        </span>

        {!imageError ? (
          <img
            src={image}
            alt={alt}
            width={640}
            height={480}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 24 24" width={64} height={64} fill="none" stroke="currentColor" strokeWidth="1.6" className="h-16 w-16 shrink-0 text-slate-300" aria-hidden="true">
              <path d="M4 15.5h16l-1.1-5.2A2 2 0 0 0 16.9 8H7.1a2 2 0 0 0-1.9 1.5L4 15.5Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 8.5 8.5 5h7l1.5 3.5M8.5 15.5v1.5m7-1.5v1.5M8 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold text-navy">{model}</h3>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="7" r="3.5" />
              <path d="M20 19v-1a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 4.5a3.5 3.5 0 0 1 0 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {seats}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M5 7h14M5 12h9M5 17h14" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 5v14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {transmission}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M4 8.5h16v8H4z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 8.5V6.5h8v2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 12h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {bags} bags
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100" />

        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="text-sm font-semibold text-slate-700">
            <span className="text-base font-extrabold text-amber-600">From {price}</span>
            <span className="ml-1 text-slate-500">/ day</span>
          </p>

          <a
            href="/booking"
            className="inline-flex items-center justify-center rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0B2347] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Book now
          </a>
        </div>
      </div>
    </article>
  )
}

export function HomePage({ data, offers = [], reviews = [], lang = 'en', loading, error, fallbackImage }) {
  const slides = data?.slides || []
  const banners = data?.banners || []
  const argumentsList = data?.arguments || []

  const locationOptions = [
    'Athens Airport (ATH)',
    'Athens City Center',
    'Koropi',
    'Piraeus Port',
    'Athens Central Station',
  ]

  const [form, setForm] = useState({
    pickupLocation: '',
    pickupDate: getDefaultDate(0),
    pickupTime: '10:00',
    returnDate: getDefaultDate(3),
    returnTime: '10:00',
    returnDifferentLocation: false,
    returnLocation: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState(locationOptions)
  const [heroBackgroundFailed, setHeroBackgroundFailed] = useState(false)

  const reasons = [
    '0% card fee / 0% commission on card payments',
    'Free ferry boarding authorization to all Greek islands',
    '24/7 airport delivery and fast support',
  ]

  const [expandedService, setExpandedService] = useState(null)
  const [serviceCardPhotos, setServiceCardPhotos] = useState({})

  // Service arguments and category tiles for the My Services block.
  const serviceCards = [
    {
      id: 'service',
      title: 'OUR SERVICE',
      icon: 'clock',
      items: [
        'A friendly, face-to-face contact with prompt reply to all your needs/requests, always on time as per agreed appointments and always beside our customers 24 hours per day, seven days per week.',
        '24-hour road assistance in Athens and throughout Greece.',
      ],
    },
    {
      id: 'fleet',
      title: 'OUR FLEET',
      icon: 'car-front',
      items: [
        'An extensive fleet of cars of all types and categories. Renewed and well maintained only with genuine spare parts, insuring a relaxed and safe journeys around Athens and Greece.',
        "Our fleet includes small, economic and compact cars, large cars, mini-vans, SUV's and luxury cars.",
        'Safety is a must; therefore, we made sure that all our vehicles are equipped with the latest safety features and standards.',
      ],
    },
    {
      id: 'rates',
      title: 'OUR RATES',
      icon: 'star',
      items: [
        'Our straight-forward, final, competitive prices, with no "Hidden Extras" that will satisfy even the most demanding customers.',
        'Special offers and discounts are always available especially for long term rentals.',
      ],
      ctaText: 'See our rates',
      ctaHref: '/pricelist',
      isLink: true,
    },
  ]

  const photoCards = [
    {
      href: '/fleet?category=luxury',
      title: 'Luxury & Premium',
      subtitle: 'Cars',
      image: '/images/cars/luxury-bmw.webp',
      alt: 'Luxury and premium car fleet',
    },
    {
      href: '/fleet?category=minibus',
      title: 'Rent a Mini Bus',
      subtitle: 'Athens Airport',
      image: '/images/cars/minibus.webp',
      alt: 'Mini bus rental at Athens Airport',
    },
    {
      href: '/fleet?category=suv',
      title: 'SUV Car Rental',
      subtitle: 'Available for bookings',
      image: '/images/cars/suv.webp',
      alt: 'SUV rental service',
    },
  ]

  const updateField = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value }

      if (field === 'pickupDate' && nextForm.returnDate && nextForm.returnDate < value) {
        nextForm.returnDate = value
      }

      return nextForm
    })
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const handleLocationChange = (value) => {
    updateField('pickupLocation', value)
    const text = value.trim().toLowerCase()
    if (!text) {
      setLocationSuggestions(locationOptions)
      return
    }

    setLocationSuggestions(
      locationOptions.filter((option) => option.toLowerCase().includes(text))
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.pickupLocation.trim()) {
      nextErrors.pickupLocation = 'Location required.'
    }

    if (!form.pickupDate) {
      nextErrors.pickupDate = 'Pickup date required.'
    }

    if (!form.pickupTime) {
      nextErrors.pickupTime = 'Pickup time required.'
    }

    if (!form.returnDate) {
      nextErrors.returnDate = 'Return date required.'
    }

    if (!form.returnTime) {
      nextErrors.returnTime = 'Return time required.'
    }

    if (form.pickupDate && form.returnDate && form.returnDate < form.pickupDate) {
      nextErrors.returnDate = 'Return date must be after pickup.'
    }

    if (form.returnDifferentLocation && !form.returnLocation.trim()) {
      nextErrors.returnLocation = 'Return location required.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const params = new URLSearchParams({
      pickupLocation: form.pickupLocation.trim(),
      pickupDate: form.pickupDate,
      pickupTime: form.pickupTime,
      returnDate: form.returnDate,
      returnTime: form.returnTime,
      ...(form.returnDifferentLocation && form.returnLocation.trim() ? { returnLocation: form.returnLocation.trim() } : {}),
    })

    setIsLoading(true)
    window.location.assign(`/booking?${params.toString()}`)
  }

  const timeOptions = Array.from({ length: 48 }, (_, index) => {
    const totalMinutes = index * 30
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}`
  })

  return (
    <section className="page page-home">
      {loading && <div className="state-box">Loading home content…</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="relative isolate min-h-[700px] w-full overflow-hidden bg-white lg:min-h-[760px]">
            <div className="absolute inset-0 -z-10">
              <img
                src="/images/image.png"
                alt="Athens Car Rental fleet"
                width={1920}
                height={900}
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-cover object-[68%_35%]"
              />
            </div>

            <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/55 via-black/25 to-transparent lg:block lg:w-[65%]" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-gradient-to-t from-[#F7F4EF] to-transparent" aria-hidden="true" />

            <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 pb-56 pt-10 sm:px-6 lg:px-10 lg:pb-56 lg:pt-14 2xl:px-16">
              <div className="lg:max-w-[52%]">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600 lg:text-amber-400">
                  ATHENS CAR RENTAL GREECE
                </p>

                <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-navy sm:text-5xl lg:text-[3.5rem] lg:text-white lg:drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                  <span className="block">Find Your Perfect Car</span>
                  <span className="block">Drive Your <span className="text-[#F59E0B]">Journey</span></span>
                </h1>

                <p className="mt-5 max-w-md text-base font-medium text-slate-700 lg:text-white/95 lg:drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
                  Premium, flexible and reliable fleet for airport pickup, city travel, island escapes and long stays.
                </p>

                <div className="mt-8 flex gap-3">
                  <a
                    href="/booking"
                    className="inline-flex items-center justify-center rounded-xl bg-[#FACC15] px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    Book now
                  </a>
                  <a
                    href="/rates"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-navy transition hover:-translate-y-0.5 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:border-white/50 lg:bg-white/15 lg:text-white lg:ring-1 lg:ring-white/50 lg:backdrop-blur-sm lg:hover:bg-white/25"
                  >
                    View rates
                  </a>
                </div>

                <div className="mt-10 mb-12 flex flex-nowrap gap-8 overflow-x-auto pb-1">
                  {[
                    { title: 'Free cancellation', detail: 'Change anytime' },
                    { title: 'Unlimited mileage', detail: 'On 3 days+' },
                    { title: '24/7 assistance', detail: 'Road support' },
                  ].map((item) => (
                    <div key={item.title} className="flex min-w-0 shrink-0 items-center gap-3 whitespace-nowrap">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200 lg:bg-white/20 lg:text-white lg:ring-white/40">
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
                          <path d="M5 12.5 9.5 17 19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 lg:text-white">{item.title}</p>
                        <p className="text-xs font-medium text-slate-600 lg:text-white/85">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="relative z-20 mx-auto mt-6 w-full max-w-[1760px] px-4 pb-0 sm:px-6 lg:-mt-48 lg:px-10 2xl:px-16">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_10px_40px_-10px_rgba(15,45,92,0.25)] ring-1 ring-slate-100 lg:px-6 lg:py-4">
              <div className="mb-0 flex items-center gap-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border-b-2 border-[#FACC15] bg-navy px-4 py-2 text-sm font-semibold text-white"
                  aria-label="Rent a Car"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M6 16.5h12l-1.1-5.2a2 2 0 0 0-1.9-1.5H9a2 2 0 0 0-1.9 1.5L6 16.5Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 10.5 9.2 7h5.6l1.2 3.5M8 16.5v1.3m8-1.3v1.3M8.5 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Rent a Car</span>
                </button>
              </div>

              <form
                aria-label="Car rental search form"
                className="mt-3"
                method="GET"
                action="/search"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2.2fr_1.3fr_1fr_1.3fr_1fr_auto] lg:items-end lg:gap-4">
                  <FieldBlock
                    id="pickup-location"
                    label="Pick-up location"
                    value={form.pickupLocation}
                    onChange={(value) => handleLocationChange(value)}
                    placeholder="City or airport"
                    error={errors.pickupLocation}
                    list="pickup-locations"
                    inputMode="text"
                    options={locationSuggestions}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                    }
                  />

                  <FieldBlock
                    id="pickup-date"
                    label="Pick-up date"
                    type="date"
                    value={form.pickupDate}
                    onChange={(value) => updateField('pickupDate', value)}
                    min={getDefaultDate(0)}
                    error={errors.pickupDate}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M7 3v3M17 3v3M4 9.5h16" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                      </svg>
                    }
                  />

                  <FieldBlock
                    id="pickup-time"
                    label="Pick-up time"
                    type="select"
                    value={form.pickupTime}
                    onChange={(value) => updateField('pickupTime', value)}
                    error={errors.pickupTime}
                    options={timeOptions}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  />

                  <FieldBlock
                    id="return-date"
                    label="Drop-off date"
                    type="date"
                    value={form.returnDate}
                    onChange={(value) => updateField('returnDate', value)}
                    min={form.pickupDate || getDefaultDate(0)}
                    error={errors.returnDate}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M7 3v3M17 3v3M4 9.5h16" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                      </svg>
                    }
                  />

                  <FieldBlock
                    id="return-time"
                    label="Drop-off time"
                    type="select"
                    value={form.returnTime}
                    onChange={(value) => updateField('returnTime', value)}
                    error={errors.returnTime}
                    options={timeOptions}
                    icon={
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  />

                  <div>
                    <button
                      type="submit"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#FACC15] px-8 text-sm font-bold text-black shadow-lg shadow-yellow-400/30 transition hover:-translate-y-0.5 hover:bg-[#EAB308] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/40 focus-visible:ring-offset-2 motion-reduce:transition-none lg:w-auto"
                      disabled={isLoading}
                    >
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px] shrink-0 text-black" aria-hidden="true">
                        <circle cx="11" cy="11" r="5.5" />
                        <path d="m16 16 4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{isLoading ? 'Searching...' : 'Search cars'}</span>
                    </button>
                  </div>
                </div>

                <label htmlFor="return-other" className="mt-3 flex items-center justify-start gap-2 text-sm text-slate-600">
                  <input
                    id="return-other"
                    type="checkbox"
                    checked={form.returnDifferentLocation}
                    onChange={(event) => updateField('returnDifferentLocation', event.target.checked)}
                    className="h-4 w-4 accent-[#FACC15]"
                  />
                  Return in another location
                </label>

                <div
                  className={[
                    'overflow-hidden transition-all duration-300 ease-out',
                    form.returnDifferentLocation ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0',
                  ].join(' ')}
                  aria-hidden={!form.returnDifferentLocation}
                >
                  <div className="pt-1">
                    <FieldBlock
                      id="return-location"
                      label="Drop-off location"
                      value={form.returnLocation}
                      onChange={(value) => updateField('returnLocation', value)}
                      placeholder="City or airport"
                      error={errors.returnLocation}
                      icon={
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                      }
                    />
                  </div>
                </div>
              </form>
            </div>
          </section>

          {/* Our fleet: premium vehicle cards - placed directly under the booking widget */}
          <section className="pt-6 lg:pt-8">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">POPULAR VEHICLES</p>
                  <h2 className="text-3xl font-extrabold text-navy lg:text-4xl">Choose Your Perfect Car</h2>
                </div>

                <a href="/pricelist" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  <span>View all vehicles</span>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { model: 'Toyota Yaris', category: 'Economy', image: '/images/cars/yaris.webp', alt: 'Toyota Yaris economy car', seats: '5 seats', transmission: 'Manual', bags: '2', price: '25 EUR' },
                  { model: 'Skoda Scala', category: 'Compact', image: '/images/cars/scala.webp', alt: 'Skoda Scala compact car', seats: '5 seats', transmission: 'Automatic', bags: '2', price: '32 EUR' },
                  { model: 'Fiat 500', category: 'City', image: '/images/cars/fiat500.webp', alt: 'Fiat 500 city car', seats: '4 seats', transmission: 'Manual', bags: '1', price: '28 EUR' },
                  { model: 'Hyundai Tucson', category: 'SUV', image: '/images/cars/tucson.webp', alt: 'Hyundai Tucson SUV', seats: '5 seats', transmission: 'Automatic', bags: '3', price: '48 EUR' },
                ].map((vehicle) => (
                  <VehicleCard
                    key={vehicle.model}
                    model={vehicle.model}
                    category={vehicle.category}
                    image={vehicle.image}
                    alt={vehicle.alt}
                    seats={vehicle.seats}
                    transmission={vehicle.transmission}
                    bags={vehicle.bags}
                    price={vehicle.price}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="relative z-10 pt-12 pb-8 lg:pt-12">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Supported by
                <span className="mx-auto mt-3 block h-0.5 w-10 rounded-full bg-amber-500" aria-hidden="true" />
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {[
                  {
                    src: '/images/eu_co_funded_en.jpg',
                    alt: 'Co-funded by the European Union',
                    width: 220,
                    height: 120,
                    className: 'max-h-14 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                  {
                    src: '/images/ESPA_Logo.EL_.jpg',
                    alt: 'ESPA 2021-2027 Partnership Agreement',
                    width: 220,
                    height: 120,
                    className: 'max-h-20 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                  {
                    src: '/images/competitiveness-2021-2027.jpg',
                    alt: 'Programme Competitiveness 2021-2027',
                    width: 220,
                    height: 120,
                    className: 'max-h-14 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                ].map((logo) => {
                  const content = (
                    <figure className="flex h-28 w-full items-center justify-center rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-amber-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                      <img
                        src={logo.src}
                        alt={logo.alt}
                        width={logo.width}
                        height={logo.height}
                        loading="lazy"
                        className={`${logo.className} max-h-16 w-auto max-w-[85%] object-contain`}
                      />
                    </figure>
                  )

                  return (
                    <div key={logo.alt} className="mx-auto w-full">
                      {logo.href && logo.href !== '#' ? (
                        <a href={logo.href} target="_blank" rel="noopener noreferrer" aria-label={logo.alt} className="block h-full">
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="bg-[#F7F4EF] py-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <div className="mb-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
                  ATHENS CAR RENTAL GREECE
                </p>
                <h2 className="text-3xl font-extrabold text-[#111111] lg:text-4xl">
                  Why travelers choose ACR
                </h2>
              </div>

              <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    href: '/reviews',
                    title: 'Customer reviews',
                    description: 'Read what our customers say about us.',
                    icon: 'star',
                    delay: 0,
                  },
                  {
                    href: '/tripadvisor',
                    title: "Travelers' Choice Award",
                    description: "Winners of the TripAdvisor Travelers' Choice Award.",
                    icon: 'award',
                    delay: 100,
                    awardBadge: true,
                  },
                  {
                    href: '/cargo-vans',
                    title: 'ACR Cargo Vans',
                    description: 'Spacious vans for moving, deliveries and group trips.',
                    icon: 'truck',
                    delay: 200,
                  },
                  {
                    href: '/early-bird',
                    title: 'Early Bird Discounts',
                    description: 'Book early and get our best prices.',
                    icon: 'badge-percent',
                    delay: 300,
                    saveMore: true,
                  },
                ].map((tile) => (
                  <a
                    key={tile.title}
                    href={tile.href}
                    className="reveal-up group relative flex min-h-[220px] flex-col rounded-3xl bg-white p-6 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:min-h-[300px]"
                    style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: `${tile.delay}ms` }}
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                      <FeatureTileIcon name={tile.icon} className="h-7 w-7 shrink-0" />
                    </span>

                    <h3 className="mt-5 min-h-[3.5rem] text-xl font-extrabold uppercase leading-tight text-[#111111]">
                      {tile.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{tile.description}</p>

                    {tile.title === 'Customer reviews' && (
                      <div className="mt-3 flex items-center gap-1" aria-label="Five stars">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <svg key={index} width={20} height={20} viewBox="0 0 24 24" fill="#FACC15" className="h-5 w-5 shrink-0" aria-hidden="true">
                            <path d="m12 2.75 2.86 5.79 6.39.93-4.63 4.51 1.09 6.36L12 17.34l-5.71 3 1.09-6.36-4.63-4.51 6.39-.93L12 2.75Z" />
                          </svg>
                        ))}
                      </div>
                    )}

                    {tile.awardBadge && (
                      <div className="mt-3 flex min-h-16 items-center">
                        <TripAdvisorAwardBadge />
                        <span className="ml-3 inline-flex rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#111111]">
                          2022 &ndash; 2026
                        </span>
                      </div>
                    )}

                    {tile.saveMore && (
                      <span className="mt-3 inline-flex w-fit rounded-full bg-[#111111] px-3 py-1 text-[10px] font-bold uppercase text-[#FACC15]">
                        SAVE MORE
                      </span>
                    )}

                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#111111]">
                      {tile.title === 'Customer reviews' && 'Read the reviews'}
                      {tile.awardBadge && 'See the award'}
                      {tile.title === 'ACR Cargo Vans' && 'Book your van'}
                      {tile.saveMore && 'Get the offer'}
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                        <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <style>{`
            @keyframes fadeUp {
              from {
                opacity: 0;
                transform: translateY(16px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .reveal-up {
                animation: none !important;
                opacity: 1 !important;
                transform: none !important;
              }
            }
          `}</style>

          <section className="bg-[#F7F4EF] py-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">ABOUT US</span>
                  <h2 className="mt-3 text-3xl font-extrabold text-[#111111] lg:text-4xl">
                    Reliable car rental near Athens Airport
                  </h2>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
                  <div className="whitespace-nowrap text-3xl font-extrabold text-[#111111] lg:text-4xl">2005</div>
                  <div className="mt-2 text-xs text-slate-500">Founded</div>
                </div>
                <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
                  <div className="whitespace-nowrap text-3xl font-extrabold text-[#111111] lg:text-4xl">18 mo.</div>
                  <div className="mt-2 text-xs text-slate-500">Average fleet age</div>
                </div>
                <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
                  <div className="whitespace-nowrap text-3xl font-extrabold text-[#111111] lg:text-4xl">5 yrs</div>
                  <div className="mt-2 text-xs text-slate-500">Maximum age</div>
                </div>
              </div>

              <div className="grid items-stretch gap-6 md:grid-cols-3">
                <article className="reveal-up relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animation: 'fadeUp 0.6s ease-out both' }}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 shrink-0" aria-hidden="true">
                      <path d="M3 9.5A2.5 2.5 0 0 1 5.5 7H18.5A2.5 2.5 0 0 1 21 9.5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6.5Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 12h10M7 15.5h5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="relative z-10 mt-6">
                    <h3 className="text-2xl font-extrabold uppercase leading-tight text-[#111111]">0% fee, 0% commission</h3>
                    <p className="mt-3 text-base leading-relaxed text-slate-600">For credit card use.</p>
                  </div>

                  <a href="/payment-options" className="relative z-10 mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                    <span>See payment options</span>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </article>

                <article className="reveal-up relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: '80ms' }}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 shrink-0" aria-hidden="true">
                      <path d="M2 16.5V9.5a2 2 0 0 1 2-2h6.5L12.5 8H20a2 2 0 0 1 2 2v6.5A2.5 2.5 0 0 1 19.5 19H4.5A2.5 2.5 0 0 1 2 16.5Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 15.5h12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="relative z-10 mt-6">
                    <h3 className="text-2xl font-extrabold uppercase leading-tight text-[#111111]">Free ferry permission</h3>
                    <p className="mt-3 text-base leading-relaxed text-slate-600">Free and pre-authorised permission to ferry our cars to all Greek islands.</p>
                  </div>

                  <a href="/island-rentals" className="relative z-10 mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                    <span>Island rentals</span>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </article>

                <article className="reveal-up relative flex min-h-[320px] flex-col overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: '160ms' }}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 shrink-0" aria-hidden="true">
                      <path d="M2 15.5V9.5l7-4.5 8 5.5 5-3.5v12.5L17 16l-8 5.5L2 15.5Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 11.5h8M9 15.5h8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="relative z-10 mt-6">
                    <h3 className="text-2xl font-extrabold uppercase leading-tight text-[#111111]">24h airport delivery</h3>
                    <p className="mt-3 text-base leading-relaxed text-slate-600">Express delivery at Athens Airport Eleftherios Venizelos.</p>
                  </div>

                  <a href="/booking" className="relative z-10 mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                    <span>Book delivery</span>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </article>
              </div>

              <div className="reveal-up relative isolate mt-6 overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-2 ring-[#FACC15] lg:mt-8 lg:p-14" style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: '200ms' }}>
                <div className="grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 10.5v5M12 7.5h.01" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>About us</span>
                    </div>

                    <h2 className="mt-5 text-3xl font-extrabold leading-tight text-[#111111] lg:text-4xl">
                      Reliable car rental near Athens Airport
                    </h2>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M7 3v3M17 3v3M4 9.5h16" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                        </svg>
                        Since 2005
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        Koropi, near the airport
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M5 15.5h14l-1.1-5.2a2 2 0 0 0-1.9-1.5H8a2 2 0 0 0-1.9 1.5L5 15.5Z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 15.5v1.3m8-1.3v1.3M9 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Modern fleet
                      </span>
                    </div>

                    <a
                      href="/about"
                      className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#111111] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      <span>View more about us</span>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>

                  <div className="rounded-2xl bg-[#FEF3C7] p-6 shadow-sm ring-1 ring-[#FACC15]/50 lg:p-8">
                    <div className="border-l-4 border-[#111111] pl-5">
                      <p className="max-w-3xl text-base font-medium leading-relaxed text-[#111111]">
                        <span className="font-extrabold">Athens Car Rental</span> was founded in 2005 and ever since then we strive year after year to provide the best of our services for our clients. We are located in Koropi, near to the Athens International Airport "Eleftherios Venizelos".
                      </p>

                      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#111111]/90">
                        Our many years of experience in the field of short-term car rental and leasing allow us to commit to you for reliable services and vehicles. With large variety of the latest released car models, our aim is to serve you best by adapting our services to the modern needs of everyday life, thereby delivering a unique experience!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* My services section placed right after the About us block */}
          <section className="bg-[#F7F4EF] py-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <div className="mb-8 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">WHY ATHENS CAR RENTAL</span>
                <h2 className="mt-4 text-3xl font-extrabold text-[#111111] lg:text-4xl">
                  Service, fleet and rates you can trust
                </h2>
              </div>

              {/* Three argument cards with a compact accordion behaviour on the fleet block */}
              <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                {serviceCards.map((card, index) => {
                  const isExpanded = expandedService === card.id
                  const visibleItems = card.items.slice(0, 2)
                  const hiddenItems = card.items.slice(2)

                  return (
                    <article
                      key={card.id}
                      className="reveal-up relative flex h-full flex-col rounded-3xl bg-white p-8 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                      style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex h-14 w-14 rotate-45 items-center justify-center rounded-2xl bg-[#FACC15] shadow-md lg:h-16 lg:w-16">
                        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 -rotate-45 shrink-0" aria-hidden="true">
                          {card.icon === 'clock' && (
                            <>
                              <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          )}
                          {card.icon === 'car-front' && (
                            <>
                              <path d="M3.5 14.5h17l-1.2-5.1A2 2 0 0 0 17.4 8h-10a2 2 0 0 0-1.9 1.4L3.5 14.5Z" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M6 14.5v2.2m12-2.2v2.2M7 17.5a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm10 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          )}
                          {card.icon === 'star' && (
                            <path d="M12 2.75 14.8 8.7l6.2.9-4.5 4.4 1.1 6.1-5.6-2.9-5.6 2.9 1.1-6.1-4.5-4.4 6.2-.9L12 2.75Z" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                        </svg>
                      </div>

                      <h3 className="mt-8 text-xl font-extrabold uppercase text-[#111111] lg:text-2xl">{card.title}</h3>
                      <div className="mt-3 h-1 w-12 rounded-full bg-[#FACC15]" />

                      <ul className="mt-5 space-y-3 text-slate-700 leading-relaxed">
                        {visibleItems.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3C7] text-[#111111]">
                              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0" aria-hidden="true">
                                <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}

                        {hiddenItems.length > 0 && (
                          <li className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-3 pt-0">
                              {hiddenItems.map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3C7] text-[#111111]">
                                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 shrink-0" aria-hidden="true">
                                      <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </li>
                        )}
                      </ul>

                      {hiddenItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedService(isExpanded ? null : card.id)}
                          aria-expanded={isExpanded}
                          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                        >
                          <span>Read more</span>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}

                      {card.isLink && (
                        <a href={card.ctaHref} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                          <span>{card.ctaText}</span>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </a>
                      )}
                    </article>
                  )
                })}
              </div>

              {/* Three photo tiles for the fleet categories */}
              <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-8">
                {photoCards.map((card, index) => {
                  const hasImageError = serviceCardPhotos[index]

                  return (
                    <a
                      key={card.href}
                      href={card.href}
                      className="group relative block overflow-hidden rounded-3xl bg-[#111111] shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:ring-4 focus-visible:ring-amber-400"
                    >
                      {hasImageError ? (
                        <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#2B2B2B] to-[#111111]">
                          <div className="flex h-full items-center justify-center">
                            <svg viewBox="0 0 24 24" width={80} height={80} fill="none" stroke="currentColor" strokeWidth="1.6" className="h-20 w-20 shrink-0 text-white/20" aria-hidden="true">
                              <path d="M3.5 14.5h17l-1.2-5.1A2 2 0 0 0 17.4 8h-10a2 2 0 0 0-1.9 1.4L3.5 14.5Z" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M6 14.5v2.2m12-2.2v2.2M7 17.5a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm10 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={card.image}
                          alt={card.alt}
                          width={800}
                          height={600}
                          loading="lazy"
                          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={() => setServiceCardPhotos((current) => ({ ...current, [index]: true }))}
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden="true" />

                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                        <div>
                          <h3 className="text-xl font-extrabold uppercase leading-tight text-[#FACC15] lg:text-2xl">{card.title}</h3>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/90">{card.subtitle}</p>
                        </div>

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] transition group-hover:bg-white">
                          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
                            <path d="M7 17 17 7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 content-section">
            <div className="section-header">
              <span className="eyebrow">Customer reviews</span>
              <h2>What our clients say</h2>
            </div>
            <div className="reviews-grid">
              {reviews.length ? (
                reviews.slice(0, 3).map((review) => (
                  <article key={review.id || review.author} className="review-card">
                    <div className="review-topline">
                      <strong>{review.author || 'Guest review'}</strong>
                      <span>{review.source || 'Google'} • {review.rating || 5}/5</span>
                    </div>
                    <p>{review.text || ''}</p>
                  </article>
                ))
              ) : (
                <div className="state-box">No reviews available.</div>
              )}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 content-section">
            <div className="section-header">
              <span className="eyebrow">Special offers</span>
              <h2>Current offers</h2>
            </div>
            <div className="offers-grid">
              {offers.length ? (
                offers.map((offer) => (
                  <article key={offer.id || offer.slug} className="offer-card">
                    <h3>{offer.name || 'Offer'}</h3>
                    <p>{offer.description || 'Exclusive rate available.'}</p>
                  </article>
                ))
              ) : (
                <div className="state-box">No offers available.</div>
              )}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 content-section guide-section">
            <div className="section-header">
              <span className="eyebrow">Travel guide</span>
              <h2>Discover Greece</h2>
            </div>
            <div className="guide-grid">
              <article>Attika</article>
              <article>Peloponnese</article>
              <article>Central Greece</article>
            </div>
          </section>

          <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16 arguments-list">
            {argumentsList.length ? argumentsList.map((item, index) => <span key={`${item.label || 'arg'}-${index}`}>{item.label || item}</span>) : <span>0% card fees</span>}
          </div>
        </>
      )}
    </section>
  )
}

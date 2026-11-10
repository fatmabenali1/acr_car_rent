import { useEffect, useState } from 'react'
import { CarFront } from 'lucide-react'
import { getCheckoutLocations } from '../api/checkout'
import './HomePage.css'

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
        <span className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black" aria-hidden="true">
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
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      {name === 'award' && (
        <>
          <circle cx="12" cy="8" r="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m8.3 12.2-1.1 8 4.8-2.7 4.8 2.7-1.1-8M12 5.5v5M9.5 8h5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {name === 'truck' && (
        <>
          <path d="M2.5 6.5h12v11h-12zM14.5 10h4l3 3.5v4h-7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6.5" cy="18" r="2" />
          <circle cx="17.5" cy="18" r="2" />
        </>
      )}
      {name === 'tag' && (
        <>
          <path d="M20.5 13.5 13 21l-10-10V3h8l9.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7.5" cy="7.5" r="1" />
        </>
      )}
    </svg>
  )
}

export function HomePage({ lang = 'en' }) {
  const isGreek = lang === 'el'
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
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [locationLookupError, setLocationLookupError] = useState('')
  const [expandedService, setExpandedService] = useState(null)
  const [serviceCardPhotos, setServiceCardPhotos] = useState({})

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      getCheckoutLocations(form.pickupLocation)
        .then((locations) => {
          if (active) {
            setLocationSuggestions(locations.map((location) => location.name))
            setLocationLookupError('')
          }
        })
        .catch((error) => {
          if (active) {
            const genericError = 'The request could not be completed. Please try again.'
            const networkErrors = ['Failed to fetch', 'NetworkError when attempting to fetch resource.']
            const translatedError = isGreek && error.message === genericError
              ? 'Το αίτημα δεν ολοκληρώθηκε. Δοκιμάστε ξανά.'
              : isGreek && networkErrors.includes(error.message)
                ? 'Δεν ήταν δυνατή η σύνδεση με την υπηρεσία τοποθεσιών. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
                : error.message
            setLocationLookupError(translatedError)
          }
        })
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [form.pickupLocation, isGreek])

  // Service arguments and category tiles for the My Services block.
  const serviceCards = [
    {
      id: 'service',
      title: isGreek ? 'ΟΙ ΥΠΗΡΕΣΙΕΣ ΜΑΣ' : 'OUR SERVICE',
      icon: 'clock',
      items: [
        isGreek
          ? 'Φιλική, προσωπική επικοινωνία και άμεση ανταπόκριση σε κάθε ανάγκη ή αίτημά σας, πάντα στην ώρα μας σύμφωνα με τα συμφωνημένα ραντεβού και πάντα δίπλα στους πελάτες μας, 24 ώρες την ημέρα, επτά ημέρες την εβδομάδα.'
          : 'A friendly, face-to-face contact with prompt reply to all your needs/requests, always on time as per agreed appointments and always beside our customers 24 hours per day, seven days per week.',
        isGreek ? 'Οδική βοήθεια όλο το 24ωρο στην Αθήνα και σε ολόκληρη την Ελλάδα.' : '24-hour road assistance in Athens and throughout Greece.',
      ],
    },
    {
      id: 'fleet',
      title: isGreek ? 'Ο ΣΤΟΛΟΣ ΜΑΣ' : 'OUR FLEET',
      icon: 'car-front',
      items: [
        isGreek
          ? 'Μεγάλος στόλος αυτοκινήτων όλων των τύπων και κατηγοριών. Ανανεώνεται και συντηρείται με γνήσια ανταλλακτικά, εξασφαλίζοντας άνετες και ασφαλείς διαδρομές στην Αθήνα και την Ελλάδα.'
          : 'An extensive fleet of cars of all types and categories. Renewed and well maintained only with genuine spare parts, insuring a relaxed and safe journeys around Athens and Greece.',
        isGreek
          ? 'Ο στόλος μας περιλαμβάνει μικρά, οικονομικά και μεσαίας κατηγορίας αυτοκίνητα, μεγάλα αυτοκίνητα, μίνι βαν, SUV και πολυτελή αυτοκίνητα.'
          : "Our fleet includes small, economic and compact cars, large cars, mini-vans, SUV's and luxury cars.",
        isGreek
          ? 'Η ασφάλεια είναι απαραίτητη· γι’ αυτό φροντίσαμε όλα τα οχήματά μας να διαθέτουν τα πιο σύγχρονα χαρακτηριστικά και πρότυπα ασφαλείας.'
          : 'Safety is a must; therefore, we made sure that all our vehicles are equipped with the latest safety features and standards.',
      ],
    },
    {
      id: 'rates',
      title: isGreek ? 'ΟΙ ΤΙΜΕΣ ΜΑΣ' : 'OUR RATES',
      icon: 'star',
      items: [
        isGreek
          ? 'Οι ξεκάθαρες, τελικές και ανταγωνιστικές τιμές μας, χωρίς «κρυφές χρεώσεις», ικανοποιούν ακόμη και τους πιο απαιτητικούς πελάτες.'
          : 'Our straight-forward, final, competitive prices, with no "Hidden Extras" that will satisfy even the most demanding customers.',
        isGreek
          ? 'Ειδικές προσφορές και εκπτώσεις είναι πάντα διαθέσιμες, ιδιαίτερα για μακροχρόνιες ενοικιάσεις.'
          : 'Special offers and discounts are always available especially for long term rentals.',
      ],
      ctaText: isGreek ? 'Δείτε τις τιμές μας' : 'See our rates',
      ctaHref: '/pricelist',
      isLink: true,
    },
  ]

  const photoCards = [
    {
      href: '/vehicles/luxury-cars',
      title: isGreek ? 'Πολυτελείας & ανώτερης κατηγορίας' : 'Luxury & Premium',
      subtitle: isGreek ? 'Οχήματα' : 'Cars',
      image: '/images/cars/luxrybmw.jpg',
      alt: isGreek ? 'Ενοικίαση πολυτελούς SUV BMW X1 στην Αθήνα' : 'BMW X1 luxury SUV rental in Athens',
    },
    {
      href: '/vehicles/mini-vans',
      title: isGreek ? 'Ενοικίαση μικρού λεωφορείου' : 'Rent a Mini Bus',
      subtitle: isGreek ? 'Αεροδρόμιο Αθηνών' : 'Athens Airport',
      image: '/images/cars/minibus.jpg',
      alt: isGreek ? 'Ενοικίαση minibus Peugeot στο Αεροδρόμιο Αθηνών' : 'Peugeot minibus rental at Athens Airport',
    },
    {
      href: '/vehicles/suvs',
      title: isGreek ? 'Ενοικίαση SUV' : 'SUV Car Rental',
      subtitle: isGreek ? 'Διαθέσιμο για κρατήσεις' : 'Available for bookings',
      image: '/images/cars/suvcarrental.jpg',
      alt: isGreek ? 'Ενοικίαση SUV Skoda Kodiaq στην Αθήνα' : 'Skoda Kodiaq SUV rental in Athens',
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
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.pickupLocation.trim()) {
      nextErrors.pickupLocation = isGreek ? 'Απαιτείται τοποθεσία παραλαβής.' : 'Location required.'
    }

    if (!form.pickupDate) {
      nextErrors.pickupDate = isGreek ? 'Απαιτείται ημερομηνία παραλαβής.' : 'Pickup date required.'
    }

    if (!form.pickupTime) {
      nextErrors.pickupTime = isGreek ? 'Απαιτείται ώρα παραλαβής.' : 'Pickup time required.'
    }

    if (!form.returnDate) {
      nextErrors.returnDate = isGreek ? 'Απαιτείται ημερομηνία επιστροφής.' : 'Return date required.'
    }

    if (!form.returnTime) {
      nextErrors.returnTime = isGreek ? 'Απαιτείται ώρα επιστροφής.' : 'Return time required.'
    }

    if (form.pickupDate && form.returnDate && form.returnDate < form.pickupDate) {
      nextErrors.returnDate = isGreek ? 'Η ημερομηνία επιστροφής δεν μπορεί να προηγείται της παραλαβής.' : 'Return date must be after pickup.'
    }

    if (form.returnDifferentLocation && !form.returnLocation.trim()) {
      nextErrors.returnLocation = isGreek ? 'Απαιτείται τοποθεσία επιστροφής.' : 'Return location required.'
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
          <section className="relative isolate min-h-[700px] w-full overflow-hidden bg-white lg:min-h-[760px]">
            <div className="absolute inset-0 -z-10">
              <img
                src="/images/image.png"
                alt={isGreek ? 'Στόλος οχημάτων Athens Car Rental' : 'Athens Car Rental fleet'}
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
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FACC15]">
                  {isGreek ? 'ATHENS CAR RENTAL · ΕΛΛΑΔΑ' : 'ATHENS CAR RENTAL GREECE'}
                </p>

                <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-[3.5rem] lg:drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                  <span className="block">{isGreek ? 'Βρείτε το ιδανικό αυτοκίνητο' : 'Find Your Perfect Car'}</span>
                  <span className="block">{isGreek ? 'Ξεκινήστε το' : 'Drive Your'} <span className="text-[#FACC15]">{isGreek ? 'ταξίδι σας' : 'Journey'}</span></span>
                </h1>

                <p className="mt-5 max-w-md text-base font-medium text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
                  {isGreek
                    ? 'Ποιοτικός, ευέλικτος και αξιόπιστος στόλος για παραλαβή από το αεροδρόμιο, μετακινήσεις στην πόλη, αποδράσεις στα νησιά και μακροχρόνιες ενοικιάσεις.'
                    : 'Premium, flexible and reliable fleet for airport pickup, city travel, island escapes and long stays.'}
                </p>

                <div className="mt-8 flex gap-3">
                  <a
                    href="/booking"
                    className="inline-flex items-center justify-center rounded-xl bg-[#FACC15] px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {isGreek ? 'Κάντε κράτηση' : 'Book now'}
                  </a>
                  <a
                    href="/customer-reviews"
                    className="inline-flex items-center justify-center rounded-xl border border-white/50 bg-black/70 px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bg-white/15 lg:ring-1 lg:ring-white/50 lg:backdrop-blur-sm lg:hover:bg-white/25"
                  >
                    {isGreek ? 'Κριτικές πελατών' : 'Customer reviews'}
                  </a>
                </div>

                <div className="mt-10 mb-12 flex flex-nowrap gap-8 overflow-x-auto pb-1">
                  {[
                    { title: isGreek ? 'Δωρεάν ακύρωση' : 'Free cancellation', detail: isGreek ? 'Αλλάξτε όποτε θέλετε' : 'Change anytime' },
                    { title: isGreek ? 'Απεριόριστα χιλιόμετρα' : 'Unlimited mileage', detail: isGreek ? 'Για ενοικιάσεις 3+ ημερών' : 'On 3 days+' },
                    { title: isGreek ? 'Υποστήριξη 24/7' : '24/7 assistance', detail: isGreek ? 'Οδική βοήθεια' : 'Road support' },
                  ].map((item) => (
                    <div key={item.title} className="flex min-w-0 shrink-0 items-center gap-3 whitespace-nowrap">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-sm ring-1 ring-slate-200 lg:bg-white/20 lg:text-white lg:ring-white/40">
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
                  className="inline-flex items-center gap-2 rounded-lg border-b-2 border-[#FACC15] bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black"
                  aria-label={isGreek ? 'Ενοικίαση αυτοκινήτου' : 'Rent a Car'}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M6 16.5h12l-1.1-5.2a2 2 0 0 0-1.9-1.5H9a2 2 0 0 0-1.9 1.5L6 16.5Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 10.5 9.2 7h5.6l1.2 3.5M8 16.5v1.3m8-1.3v1.3M8.5 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{isGreek ? 'Ενοικίαση αυτοκινήτου' : 'Rent a Car'}</span>
                </button>
                <a
                  href="/cargo-vans"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#111111] transition hover:bg-[#FEF3C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none"
                >
                  {isGreek ? 'Φορτηγάκια' : 'Cargo vans'}
                </a>
              </div>

              <form
                aria-label={isGreek ? 'Φόρμα αναζήτησης ενοικίασης αυτοκινήτου' : 'Car rental search form'}
                className="mt-3"
                method="GET"
                action="/search"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2.2fr_1.3fr_1fr_1.3fr_1fr_auto] lg:items-end lg:gap-4">
                  <FieldBlock
                    id="pickup-location"
                    label={isGreek ? 'Τοποθεσία παραλαβής' : 'Pick-up location'}
                    value={form.pickupLocation}
                    onChange={(value) => handleLocationChange(value)}
                    placeholder={isGreek ? 'Πόλη ή αεροδρόμιο' : 'City or airport'}
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
                  {locationLookupError && (
                    <p className="text-xs text-red-600" role="status">
                      {isGreek ? `Σφάλμα κατά την αναζήτηση τοποθεσιών: ${locationLookupError}` : locationLookupError}
                    </p>
                  )}

                  <FieldBlock
                    id="pickup-date"
                    label={isGreek ? 'Ημερομηνία παραλαβής' : 'Pick-up date'}
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
                    label={isGreek ? 'Ώρα παραλαβής' : 'Pick-up time'}
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
                    label={isGreek ? 'Ημερομηνία επιστροφής' : 'Drop-off date'}
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
                    label={isGreek ? 'Ώρα επιστροφής' : 'Drop-off time'}
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
                      <span>{isLoading
                        ? isGreek ? 'Αναζήτηση...' : 'Searching...'
                        : isGreek ? 'Αναζήτηση αυτοκινήτων' : 'Search cars'}</span>
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
                  {isGreek ? 'Επιστροφή σε άλλη τοποθεσία' : 'Return in another location'}
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
                      label={isGreek ? 'Τοποθεσία επιστροφής' : 'Drop-off location'}
                      value={form.returnLocation}
                      onChange={(value) => updateField('returnLocation', value)}
                      placeholder={isGreek ? 'Πόλη ή αεροδρόμιο' : 'City or airport'}
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

          <section className="relative z-10 pt-12 pb-8 lg:pt-12">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {isGreek ? 'Με την υποστήριξη' : 'Supported by'}
                <span className="mx-auto mt-3 block h-0.5 w-10 rounded-full bg-[#FACC15]" aria-hidden="true" />
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {[
                  {
                    src: '/images/eu_co_funded_en.jpg',
                    alt: isGreek ? 'Με τη συγχρηματοδότηση της Ευρωπαϊκής Ένωσης' : 'Co-funded by the European Union',
                    width: 220,
                    height: 120,
                    className: 'max-h-14 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                  {
                    src: '/images/ESPA_Logo.EL_.jpg',
                    alt: isGreek ? 'ΕΣΠΑ 2021-2027 – Συμφωνία Εταιρικής Σχέσης' : 'ESPA 2021-2027 Partnership Agreement',
                    width: 220,
                    height: 120,
                    className: 'max-h-20 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                  {
                    src: '/images/competitiveness-2021-2027.jpg',
                    alt: isGreek ? 'Πρόγραμμα «Ανταγωνιστικότητα 2021-2027»' : 'Programme Competitiveness 2021-2027',
                    width: 220,
                    height: 120,
                    className: 'max-h-14 max-w-[85%] w-auto',
                    href: 'https://www.athens-carrental.com/images/nea%20afisa.pdf',
                  },
                ].map((logo) => {
                  const content = (
                    <figure className="flex h-28 w-full items-center justify-center rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-[#FACC15] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
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

          <section className="why-acr">
            <div className="why-acr__container">
              <div className="why-acr__header">
                <div>
                  <p className="why-acr__eyebrow">{isGreek ? 'ATHENS CAR RENTAL · ΕΛΛΑΔΑ' : 'ATHENS CAR RENTAL · GREECE'}</p>
                  <h2 className="why-acr__title">
                    {isGreek ? 'Γιατί οι ταξιδιώτες' : 'Why travelers'}
                    <br />
                    {isGreek ? 'επιλέγουν την ACR' : 'choose ACR'}
                  </h2>
                </div>
                <a className="why-acr__reviews" href="/customer-reviews">
                  <span>{isGreek ? 'Δείτε τις κριτικές πελατών' : 'View customer reviews'}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                    <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>

              <div className="why-acr__grid">
                <article className="why-acr__card why-acr__card--dark">
                  <div className="why-acr__card-top">
                    <span className="why-acr__icon-chip why-acr__icon-chip--yellow">
                      <FeatureTileIcon name="award" />
                    </span>
                    <span className="why-acr__tripadvisor">TripAdvisor</span>
                  </div>
                  <div className="why-acr__card-content">
                    <p className="why-acr__stat why-acr__stat--dark">2022–<br />2026</p>
                    <h3 className="why-acr__card-title">{isGreek ? 'Βραβείο Επιλογής Ταξιδιωτών' : "Travelers' Choice Award"}</h3>
                    <p className="why-acr__description why-acr__description--dark">
                      {isGreek
                        ? 'Νικητές του βραβείου Travelers’ Choice του TripAdvisor.'
                        : "Winners of the TripAdvisor Travelers' Choice Award."}
                    </p>
                  </div>
                  <a className="why-acr__link" href="/tripadvisor">
                    <span>{isGreek ? 'Δείτε το βραβείο' : 'See the award'}</span>
                    <ArrowIcon />
                  </a>
                </article>

                <article className="why-acr__card why-acr__card--yellow">
                  <div className="why-acr__card-top">
                    <span className="why-acr__icon-chip why-acr__icon-chip--dark">
                      <FeatureTileIcon name="truck" />
                    </span>
                  </div>
                  <svg className="why-acr__van" viewBox="0 0 220 92" fill="none" aria-hidden="true">
                    <path d="M28 20h113a8 8 0 0 1 8 8v45H28V20Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M149 43h28l20 20v10h-48V43ZM150 48v20h38l-15-20h-23ZM42 33h73v27H42z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M28 62h141M90 33v27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="63" cy="75" r="11" fill="var(--acr-yellow)" stroke="currentColor" strokeWidth="2.5" />
                    <circle cx="166" cy="75" r="11" fill="var(--acr-yellow)" stroke="currentColor" strokeWidth="2.5" />
                  </svg>
                  <div className="why-acr__card-content">
                    <h3 className="why-acr__card-title">{isGreek ? 'Επαγγελματικά βαν ACR' : 'ACR Cargo Vans'}</h3>
                    <p className="why-acr__description why-acr__description--yellow">
                      {isGreek
                        ? 'Ευρύχωρα βαν για μετακομίσεις, παραδόσεις και ομαδικές μετακινήσεις.'
                        : 'Spacious vans for moving, deliveries and group trips.'}
                    </p>
                  </div>
                  <a className="why-acr__link" href="/cargo-vans">
                    <span>{isGreek ? 'Κλείστε το βαν σας' : 'Book your van'}</span>
                    <ArrowIcon />
                  </a>
                </article>

                <article className="why-acr__card why-acr__card--white">
                  <div className="why-acr__card-top">
                    <span className="why-acr__icon-chip why-acr__icon-chip--soft">
                      <FeatureTileIcon name="tag" />
                    </span>
                    <span className="why-acr__save-badge">{isGreek ? 'ΕΞΟΙΚΟΝΟΜΗΣΤΕ ΠΕΡΙΣΣΟΤΕΡΑ' : 'SAVE MORE'}</span>
                  </div>
                  <div className="why-acr__card-content">
                    <p className="why-acr__stat why-acr__stat--white">
                      {isGreek ? <>Έγκαιρη<br />κράτηση</> : <>Early<br />bird</>}
                    </p>
                    <h3 className="why-acr__card-title">{isGreek ? 'Εκπτώσεις έγκαιρης κράτησης' : 'Early Bird Discounts'}</h3>
                    <p className="why-acr__description why-acr__description--white">
                      {isGreek ? 'Κάντε κράτηση νωρίς και επωφεληθείτε από τις καλύτερες τιμές μας.' : 'Book early and get our best prices.'}
                    </p>
                  </div>
                  <a className="why-acr__link" href="/early-bird">
                    <span>{isGreek ? 'Δείτε την προσφορά' : 'Get the offer'}</span>
                    <ArrowIcon />
                  </a>
                </article>
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

          <section className="bg-[#F7F4EF] py-8 lg:py-10">
            <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
              <div className="reveal-up relative isolate overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-2 ring-[#FACC15] lg:p-14" style={{ animation: 'fadeUp 0.6s ease-out both', animationDelay: '200ms' }}>
                <div className="grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 10.5v5M12 7.5h.01" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{isGreek ? 'Σχετικά με εμάς' : 'About us'}</span>
                    </div>

                    <h2 className="mt-5 text-3xl font-extrabold leading-tight text-[#111111] lg:text-4xl">
                      {isGreek ? 'Αξιόπιστη ενοικίαση αυτοκινήτου κοντά στο Αεροδρόμιο Αθηνών' : 'Reliable car rental near Athens Airport'}
                    </h2>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M7 3v3M17 3v3M4 9.5h16" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                        </svg>
                        {isGreek ? 'Από το 2005' : 'Since 2005'}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M12 21s6-5.686 6-11a6 6 0 1 0-12 0c0 5.314 6 11 6 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {isGreek ? 'Κορωπί, κοντά στο αεροδρόμιο' : 'Koropi, near the airport'}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-sm font-semibold text-[#111111] ring-1 ring-[#FACC15]/60">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                          <path d="M5 15.5h14l-1.1-5.2a2 2 0 0 0-1.9-1.5H8a2 2 0 0 0-1.9 1.5L5 15.5Z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 15.5v1.3m8-1.3v1.3M9 17.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {isGreek ? 'Σύγχρονος στόλος' : 'Modern fleet'}
                      </span>
                    </div>

                    <a
                      href="/about"
                      className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#111111] px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none"
                    >
                      <span>{isGreek ? 'Μάθετε περισσότερα για εμάς' : 'View more about us'}</span>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>

                  <div className="rounded-2xl bg-[#FEF3C7] p-6 shadow-sm ring-1 ring-[#FACC15]/50 lg:p-8">
                    <div className="border-l-4 border-[#111111] pl-5">
                      <p className="max-w-3xl text-base font-medium leading-relaxed text-[#111111]">
                        {isGreek ? (
                          <>
                            Η <span className="font-extrabold">Athens Car Rental</span> ιδρύθηκε το 2005 και έκτοτε προσπαθούμε κάθε χρόνο να προσφέρουμε τις καλύτερες υπηρεσίες στους πελάτες μας. Βρισκόμαστε στο Κορωπί, κοντά στο Διεθνές Αεροδρόμιο Αθηνών «Ελευθέριος Βενιζέλος».
                          </>
                        ) : (
                          <>
                            <span className="font-extrabold">Athens Car Rental</span> was founded in 2005 and ever since then we strive year after year to provide the best of our services for our clients. We are located in Koropi, near to the Athens International Airport "Eleftherios Venizelos".
                          </>
                        )}
                      </p>

                      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#111111]/90">
                        {isGreek
                          ? 'Η πολυετής εμπειρία μας στη βραχυχρόνια ενοικίαση αυτοκινήτων και τη χρηματοδοτική μίσθωση μάς επιτρέπει να σας προσφέρουμε αξιόπιστες υπηρεσίες και οχήματα. Με μεγάλη ποικιλία από τα πιο πρόσφατα μοντέλα αυτοκινήτων, στόχος μας είναι να σας εξυπηρετούμε με τον καλύτερο τρόπο, προσαρμόζοντας τις υπηρεσίες μας στις σύγχρονες ανάγκες της καθημερινότητας και προσφέροντας μια μοναδική εμπειρία!'
                          : 'Our many years of experience in the field of short-term car rental and leasing allow us to commit to you for reliable services and vehicles. With large variety of the latest released car models, our aim is to serve you best by adapting our services to the modern needs of everyday life, thereby delivering a unique experience!'}
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
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FACC15]">
                  {isGreek ? 'ΓΙΑΤΙ ATHENS CAR RENTAL' : 'WHY ATHENS CAR RENTAL'}
                </span>
                <h2 className="mt-4 text-3xl font-extrabold text-[#111111] lg:text-4xl">
                  {isGreek ? 'Υπηρεσίες, στόλος και τιμές που εμπνέουν εμπιστοσύνη' : 'Service, fleet and rates you can trust'}
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
                          className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 motion-reduce:transition-none"
                        >
                          <span>{isGreek ? 'Διαβάστε περισσότερα' : 'Read more'}</span>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}

                      {card.isLink && (
                        <a href={card.ctaHref} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#111111] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2">
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
                      className="group relative block overflow-hidden rounded-3xl bg-[#111111] shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:ring-4 focus-visible:ring-[#FACC15]"
                    >
                      {hasImageError ? (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-[#2B2B2B] to-[#111111]">
                          <CarFront width={80} height={80} className="h-20 w-20 shrink-0 text-white/20" aria-hidden="true" />
                        </div>
                      ) : (
                        <img
                          src={card.image}
                          alt={card.alt}
                          width={800}
                          height={600}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/3] w-full object-cover object-center transition duration-500 group-hover:scale-105"
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
    </section>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

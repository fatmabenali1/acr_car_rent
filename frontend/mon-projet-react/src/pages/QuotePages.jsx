import { useMemo, useState } from 'react'
import { categories } from '../data/categories'
import './QuotePages.css'

const PRICED_CATEGORY_CODES = new Set(['D1', 'E', 'E1', 'E2', 'E3', 'D3', 'G', 'G1', 'G2', 'F'])
const DEMO_PRICES = import.meta.env.VITE_PRICING_CONFIRMED !== 'true'

function localDate(daysFromToday) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getInitialReservation() {
  const params = new URLSearchParams(window.location.search)
  const returnLocation = params.get('returnLocation') || ''
  const carId = params.get('car_id')
  const categoryFromCarId = categories.find((category) => String(category.carId) === carId)
  const categoryFromSlug = categories.find((category) => category.slug === params.get('category'))

  return {
    pickupDate: params.get('pickupDate') || localDate(1),
    pickupTime: params.get('pickupTime') || '09:00',
    returnDate: params.get('returnDate') || localDate(3),
    returnTime: params.get('returnTime') || '09:00',
    pickupLocation: params.get('pickupLocation') || '',
    dropoffLocation: returnLocation,
    useDifferentDropoff: Boolean(returnLocation),
    driverAge: params.get('driverAge') || '30',
    driverLicenceYears: '1',
    coupon: params.get('coupon') || '',
    notes: '',
    category: carId !== null
      ? categoryFromCarId?.slug || ''
      : categoryFromSlug?.slug || '',
    source: params.get('source') || '',
  }
}

function combineDateTime(date, time) {
  return date && time ? `${date}T${time}` : ''
}

function formatDate(date, time) {
  const value = combineDateTime(date, time)
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function rentalDays(reservation) {
  const pickup = new Date(combineDateTime(reservation.pickupDate, reservation.pickupTime))
  const dropoff = new Date(combineDateTime(reservation.returnDate, reservation.returnTime))
  const duration = dropoff.getTime() - pickup.getTime()
  return Number.isFinite(duration) && duration > 0
    ? Math.max(1, Math.ceil(duration / 86_400_000))
    : null
}

const iconPaths = {
  car: (
    <>
      <path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 11h18v7H3zM6 18v2m12-2v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="14.5" r=".75" />
      <circle cx="17" cy="14.5" r=".75" />
    </>
  ),
  map: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
    </>
  ),
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" />
    </>
  ),
  tag: (
    <>
      <path d="M20.5 13.5 13 21l-10-10V3h8l9.5 10.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />,
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.69A2 2 0 0 1 22 16.92Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
}

function QuoteIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function SectionHeading({ icon, id, title, number }) {
  return (
    <div className="quote-section-heading">
      <span className="quote-section-heading__icon">
        <QuoteIcon name={icon} />
      </span>
      <div>
        <span className="quote-section-heading__step">{number}</span>
        <h2 id={id}>{title}</h2>
      </div>
    </div>
  )
}

function FormField({ id, label, error, children }) {
  const errorId = error ? `${id}-error` : undefined
  const child = {
    ...children.props,
    'aria-invalid': Boolean(error),
    'aria-describedby': errorId,
  }

  return (
    <div className={`quote-field${error ? ' quote-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children.type === 'select'
        ? <select {...child}>{children.props.children}</select>
        : children.type === 'textarea'
          ? <textarea {...child} />
          : <input {...child} />}
      {error && <p className="quote-field__error" id={errorId}>{error}</p>}
    </div>
  )
}

function getCategoryMinimumAge(vehicle, category) {
  const code = String(
    vehicle?.code || category?.name?.match(/category\s+([a-z]\d?)/i)?.[1] || '',
  ).toUpperCase()
  return ['D1', 'E', 'E1', 'E2', 'E3', 'D3', 'G', 'G1', 'G2', 'F'].includes(code) ? 23 : 25
}

function ageMessage(value, minimumAge) {
  if (value === '') return ''
  const age = Number(value)
  if (!Number.isInteger(age)) return 'Enter a valid age.'
  if (age < 23) return 'The minimum age is 23 years'
  if (age > 75) return 'For drivers over 75, please contact us by email before booking.'
  if (age < minimumAge) return `The minimum age for this category is ${minimumAge} years.`
  return ''
}

function estimateValue(estimate) {
  const total = estimate?.totalEur ?? estimate?.total
  if (total === undefined || total === null || total === '') return '—'
  return typeof total === 'number'
    ? new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(total)
    : total
}

export function QuotePages({ locations = [], vehicles = [], lang = 'en', loading, error, api, onReservationCreated }) {
  const [reservation, setReservation] = useState(getInitialReservation)
  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
  })
  const [selectedVehicle, setSelectedVehicle] = useState(reservation.category)
  const [estimate, setEstimate] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [statusMessage, setStatusMessage] = useState('')
  const [createdReference, setCreatedReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [couponOpen, setCouponOpen] = useState(Boolean(reservation.coupon))
  const [confirmed, setConfirmed] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [website, setWebsite] = useState('')
  const [createdDeposit, setCreatedDeposit] = useState(null)

  const vehicleOptions = useMemo(
    () => (vehicles || []).filter((vehicle) => PRICED_CATEGORY_CODES.has(String(vehicle.code).toUpperCase())),
    [vehicles],
  )
  const selectedVehicleData = vehicleOptions.find((vehicle) => vehicle.slug === selectedVehicle)
  const categoryData = categories.find((category) => category.slug === selectedVehicle)
  const minimumDriverAge = getCategoryMinimumAge(selectedVehicleData, categoryData)
  const locationOptions = useMemo(
    () => locations.map((location) => location.name).filter(Boolean),
    [locations],
  )
  const days = rentalDays(reservation)
  const sameLocation = !reservation.useDifferentDropoff
  const dropoffLocation = sameLocation
    ? reservation.pickupLocation
    : reservation.dropoffLocation
  const selectedName = selectedVehicleData?.name || categoryData?.name || ''
  const selectedModels = selectedVehicleData?.example || categoryData?.example || ''
  const selectedImage = categoryData?.image || selectedVehicleData?.image
  const driverAgeError = ageMessage(reservation.driverAge, minimumDriverAge)
  const afterHours = [reservation.pickupTime, reservation.returnTime].some(
    (time) => time && (time >= '23:00' || time < '07:00'),
  )

  const updateReservation = (field, value) => {
    setReservation((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: '' }))
    setEstimate(null)
    setStatusMessage('')
  }

  const updateCustomer = (field, value) => {
    setCustomer((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: '' }))
    setStatusMessage('')
  }

  function getErrors(includeCustomer) {
    const nextErrors = {}
    const pickupAt = combineDateTime(reservation.pickupDate, reservation.pickupTime)
    const returnAt = combineDateTime(reservation.returnDate, reservation.returnTime)

    if (!vehicleOptions.some((vehicle) => vehicle.slug === selectedVehicle)) {
      nextErrors.category = 'Select a vehicle category.'
    }
    if (!reservation.pickupLocation.trim()) nextErrors.pickupLocation = 'Enter a pick-up location.'
    if (reservation.useDifferentDropoff && !reservation.dropoffLocation.trim()) {
      nextErrors.dropoffLocation = 'Enter a drop-off location.'
    }
    if (!reservation.pickupDate) nextErrors.pickupDate = 'Choose a pick-up date.'
    if (!reservation.pickupTime) nextErrors.pickupTime = 'Choose a pick-up time.'
    if (!reservation.returnDate) nextErrors.returnDate = 'Choose a drop-off date.'
    if (!reservation.returnTime) nextErrors.returnTime = 'Choose a drop-off time.'
    if (pickupAt && returnAt && returnAt <= pickupAt) {
      nextErrors.returnDate = 'Drop-off must be after pick-up.'
    }
    if (!reservation.driverAge) nextErrors.driverAge = 'Enter the driver age.'
    else if (driverAgeError) nextErrors.driverAge = driverAgeError
    if (!reservation.driverLicenceYears
      || !Number.isInteger(Number(reservation.driverLicenceYears))
      || Number(reservation.driverLicenceYears) < 1) {
      nextErrors.driverLicenceYears = 'Enter the years holding your driving licence.'
    }

    if (includeCustomer) {
      if (!customer.firstName.trim()) nextErrors.firstName = 'Enter your first name.'
      if (!customer.lastName.trim()) nextErrors.lastName = 'Enter your last name.'
      if (!customer.email.trim()) nextErrors.email = 'Enter your email.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        nextErrors.email = 'Enter a valid email address.'
      }
      if (!customer.phone.trim()) nextErrors.phone = 'Enter your phone number.'
      if (!customer.country.trim()) nextErrors.country = 'Enter your country.'
      if (!privacyAccepted) nextErrors.privacyAccepted = 'Please accept personal data processing.'
    }
    return nextErrors
  }

  const hasValidQuoteDetails = Object.keys(getErrors(true)).length === 0
  const hasValidEstimateDetails = Object.keys(getErrors(false)).filter(
    (field) => !['driverAge', 'driverLicenceYears'].includes(field),
  ).length === 0

  async function onEstimate() {
    const estimateErrors = getErrors(false)
    delete estimateErrors.driverAge
    delete estimateErrors.driverLicenceYears
    setFormErrors((current) => ({ ...current, ...estimateErrors }))
    setStatusMessage('')
    if (Object.keys(estimateErrors).length) return

    setEstimating(true)
    try {
      const locationSlug = (value) => locations.find(
        (location) => location.slug === value || location.name === value,
      )?.slug || value
      const result = await api.getPricingEstimate({
        vehicleSlug: selectedVehicle,
        pickupLocationSlug: locationSlug(reservation.pickupLocation),
        returnLocationSlug: locationSlug(dropoffLocation || reservation.pickupLocation),
        pickupAt: new Date(combineDateTime(reservation.pickupDate, reservation.pickupTime)).toISOString(),
        returnAt: new Date(combineDateTime(reservation.returnDate, reservation.returnTime)).toISOString(),
        extras: [],
      }, lang)
      setEstimate(result.data || null)
      setStatusMessage('Estimate received.')
    } catch (requestError) {
      setStatusMessage(requestError.message || 'Unable to estimate price. Please try again.')
    } finally {
      setEstimating(false)
    }
  }

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = getErrors(true)
    setFormErrors(nextErrors)
    setStatusMessage('')
    if (Object.keys(nextErrors).length) return

    setCreatedReference('')
    setSubmitting(true)
    try {
      const result = await api.createBooking({
        carId: selectedVehicleData.code,
        pickupLocation: reservation.pickupLocation.trim(),
        returnLocation: sameLocation ? reservation.pickupLocation.trim() : reservation.dropoffLocation.trim(),
        pickupAt: new Date(combineDateTime(reservation.pickupDate, reservation.pickupTime)).toISOString(),
        returnAt: new Date(combineDateTime(reservation.returnDate, reservation.returnTime)).toISOString(),
        driverAge: Number(reservation.driverAge),
        driverLicenceYears: Number(reservation.driverLicenceYears),
        coupon: reservation.coupon.trim() || undefined,
        notes: reservation.notes.trim() || undefined,
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        country: customer.country.trim(),
        language: lang,
        privacyAccepted,
        website,
      })
      if (!result?.reservationNumber) {
        setStatusMessage('Your quote request could not be confirmed. Please try again.')
        return
      }
      setCreatedReference(result.reservationNumber)
      setEstimate({ totalEur: result.total })
      setCreatedDeposit(result.deposit)
      if (onReservationCreated) {
        onReservationCreated({
          reference: result.reservationNumber,
          emailSent: result.emailSent !== false,
          total: result.total,
          deposit: result.deposit,
          currency: result.currency,
          demoPrices: result.demoPrices,
        })
      } else {
        setStatusMessage(result.emailSent === false
          ? 'We could not send the confirmation e-mail, please contact us'
          : '')
        setConfirmed(true)
      }
    } catch (requestError) {
      const fieldNames = { carId: 'category', pickupAt: 'pickupDate', returnAt: 'returnDate' }
      const fieldErrors = Object.fromEntries(
        Object.entries(requestError.fields || {}).map(([field, message]) => [fieldNames[field] || field, message]),
      )
      if (Object.keys(fieldErrors).length) {
        setFormErrors((current) => ({ ...current, ...fieldErrors }))
      }
      setStatusMessage(requestError.message || 'Could not create the booking request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const pageTitle = 'Request a quote'

  return (
    <div className="quote-page">
      <section className="quote-hero">
        <div className="quote-hero__inner">
          <nav className="quote-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{pageTitle}</span>
          </nav>
          <div className="quote-hero__copy">
            <p className="quote-eyebrow">ATHENS CAR RENTAL</p>
            <h1>Request a <span>quote</span></h1>
            <p className="quote-hero__subtitle">Tell us about your trip and get your rate in minutes.</p>
          </div>
          <ol className="quote-steps" aria-label="Quote steps">
            <li className="is-current" aria-current="step"><span>1</span> Trip</li>
            <li><span>2</span> Vehicle</li>
            <li><span>3</span> Your details</li>
          </ol>
        </div>
      </section>

      <main className="quote-main">
        {loading && <div className="quote-state" role="status">Loading quote form…</div>}
        {error && !loading && <div className="quote-state quote-state--error" role="alert">{error}</div>}

        {!loading && !error && confirmed ? (
          <section className="quote-confirmation" aria-labelledby="quote-confirmation-title">
            <span className="quote-confirmation__icon"><QuoteIcon name="check" size={30} /></span>
            <h2 id="quote-confirmation-title">Thank you, {customer.firstName}!</h2>
            <p className="quote-confirmation__intro">We will contact you shortly by email.</p>
            {statusMessage && <p className="quote-status" role="alert">{statusMessage}</p>}
            <dl className="quote-confirmation__details">
              <div><dt>Vehicle category</dt><dd>{selectedName || '—'}</dd></div>
              <div><dt>Pick-up</dt><dd>{reservation.pickupLocation || '—'} · {formatDate(reservation.pickupDate, reservation.pickupTime)}</dd></div>
              <div><dt>Drop-off</dt><dd>{dropoffLocation || '—'} · {formatDate(reservation.returnDate, reservation.returnTime)}</dd></div>
              {createdReference && <div><dt>Reference</dt><dd>{createdReference}</dd></div>}
              {estimate?.totalEur !== undefined && <div><dt>Estimated total</dt><dd>€{estimate.totalEur}</dd></div>}
              {createdDeposit !== null && <div><dt>Deposit due</dt><dd>€{createdDeposit}</dd></div>}
            </dl>
            {createdReference && (
              <a className="quote-confirmation__payment" href={`/pay?ref=${encodeURIComponent(createdReference)}`}>
                Continue to secure payment <QuoteIcon name="arrow" size={18} />
              </a>
            )}
            <div className="quote-confirmation__actions">
              <a className="quote-button quote-button--primary" href="/">Back to Home</a>
              <a className="quote-button quote-button--outline" href="tel:+302106022220">
                <QuoteIcon name="phone" size={18} /> Call us
              </a>
            </div>
          </section>
        ) : !loading && !error && (
          <div className="quote-layout">
            <form id="quote-request-form" className="quote-form" onSubmit={onSubmit} noValidate>
              <section className="quote-card" aria-labelledby="quote-trip-title">
                <SectionHeading icon="map" id="quote-trip-title" number="01" title="Your trip" />
                <div className="quote-fields">
                  <FormField id="booking-category" label="Vehicle category" error={formErrors.category}>
                    <select
                      id="booking-category"
                      name="category"
                      required
                      value={selectedVehicle}
                      onChange={(event) => {
                        setSelectedVehicle(event.target.value)
                        setEstimate(null)
                        setFormErrors((current) => ({ ...current, category: '' }))
                      }}
                    >
                      <option value="">Select category</option>
                      {vehicleOptions.map((vehicle) => (
                        <option key={vehicle.id || vehicle.slug} value={vehicle.slug}>{vehicle.name || vehicle.slug}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="booking-pickup-location" label="Pick-up location" error={formErrors.pickupLocation}>
                    <input
                      id="booking-pickup-location"
                      name="pickupLocation"
                      autoComplete="off"
                      list="quote-locations"
                      required
                      value={reservation.pickupLocation}
                      onChange={(event) => updateReservation('pickupLocation', event.target.value)}
                    />
                  </FormField>
                  <label className="quote-same-location">
                    <input
                      id="booking-same-location"
                      name="sameLocation"
                      type="checkbox"
                      checked={sameLocation}
                      onChange={(event) => updateReservation('useDifferentDropoff', !event.target.checked)}
                    />
                    <span>Return to the same location</span>
                  </label>
                  {!sameLocation && (
                    <FormField id="booking-dropoff-location" label="Drop-off location" error={formErrors.dropoffLocation}>
                      <input
                        id="booking-dropoff-location"
                        name="returnLocation"
                        autoComplete="off"
                        list="quote-locations"
                        required
                        value={reservation.dropoffLocation}
                        onChange={(event) => updateReservation('dropoffLocation', event.target.value)}
                      />
                    </FormField>
                  )}
                  <datalist id="quote-locations">
                    {locationOptions.map((location) => <option key={location} value={location} />)}
                  </datalist>
                  <FormField id="booking-pickup-date" label="Pick-up date" error={formErrors.pickupDate}>
                    <input
                      id="booking-pickup-date"
                      name="pickupDate"
                      type="date"
                      required
                      value={reservation.pickupDate}
                      onChange={(event) => updateReservation('pickupDate', event.target.value)}
                    />
                  </FormField>
                  <FormField id="booking-pickup-time" label="Pick-up time" error={formErrors.pickupTime}>
                    <input
                      id="booking-pickup-time"
                      name="pickupTime"
                      type="time"
                      required
                      value={reservation.pickupTime}
                      onChange={(event) => updateReservation('pickupTime', event.target.value)}
                    />
                  </FormField>
                  <FormField id="booking-return-date" label="Drop-off date" error={formErrors.returnDate}>
                    <input
                      id="booking-return-date"
                      name="returnDate"
                      type="date"
                      required
                      value={reservation.returnDate}
                      onChange={(event) => updateReservation('returnDate', event.target.value)}
                    />
                  </FormField>
                  <FormField id="booking-return-time" label="Drop-off time" error={formErrors.returnTime}>
                    <input
                      id="booking-return-time"
                      name="returnTime"
                      type="time"
                      required
                      value={reservation.returnTime}
                      onChange={(event) => updateReservation('returnTime', event.target.value)}
                    />
                  </FormField>
                </div>
                {afterHours && (
                  <p className="quote-after-hours">A small after-hours fee applies between 23:00 and 07:00.</p>
                )}
                {days && <p className="quote-days">{days} {days === 1 ? 'day' : 'days'}</p>}
              </section>

              <section className="quote-card" aria-labelledby="quote-driver-title">
                <SectionHeading icon="user" id="quote-driver-title" number="02" title="Driver" />
                <div className="quote-fields">
                  <FormField id="booking-driver-age" label="Driver age" error={formErrors.driverAge || driverAgeError}>
                    <input
                      id="booking-driver-age"
                      name="driverAge"
                      type="number"
                      min={minimumDriverAge}
                      max="75"
                      required
                      value={reservation.driverAge}
                      onChange={(event) => updateReservation('driverAge', event.target.value)}
                    />
                  </FormField>
                  <FormField id="booking-driver-licence-years" label="Years holding driving licence" error={formErrors.driverLicenceYears}>
                    <input
                      id="booking-driver-licence-years"
                      name="driverLicenceYears"
                      type="number"
                      min="1"
                      max="80"
                      required
                      value={reservation.driverLicenceYears}
                      onChange={(event) => updateReservation('driverLicenceYears', event.target.value)}
                    />
                  </FormField>
                </div>
              </section>

              <section className="quote-card" aria-labelledby="quote-details-title">
                <SectionHeading icon="user" id="quote-details-title" number="03" title="Your details" />
                <div className="quote-fields">
                  <FormField id="quote-first-name" label="First name" error={formErrors.firstName}>
                    <input id="quote-first-name" name="firstName" autoComplete="given-name" required value={customer.firstName} onChange={(event) => updateCustomer('firstName', event.target.value)} />
                  </FormField>
                  <FormField id="quote-last-name" label="Last name" error={formErrors.lastName}>
                    <input id="quote-last-name" name="lastName" autoComplete="family-name" required value={customer.lastName} onChange={(event) => updateCustomer('lastName', event.target.value)} />
                  </FormField>
                  <FormField id="quote-email" label="Email" error={formErrors.email}>
                    <input id="quote-email" name="email" type="email" autoComplete="email" required value={customer.email} onChange={(event) => updateCustomer('email', event.target.value)} />
                  </FormField>
                  <FormField id="quote-phone" label="Phone" error={formErrors.phone}>
                    <input id="quote-phone" name="phone" type="tel" autoComplete="tel" required value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} />
                  </FormField>
                  <FormField id="quote-country" label="Country" error={formErrors.country}>
                    <input id="quote-country" name="country" autoComplete="country-name" required value={customer.country} onChange={(event) => updateCustomer('country', event.target.value)} />
                  </FormField>
                  <FormField id="quote-notes" label="Notes">
                    <textarea id="quote-notes" name="notes" rows="3" value={reservation.notes} onChange={(event) => updateReservation('notes', event.target.value)} />
                  </FormField>
                </div>
                <div className="quote-coupon">
                  <button
                    className="quote-coupon__toggle"
                    type="button"
                    aria-expanded={couponOpen}
                    onClick={() => setCouponOpen((open) => !open)}
                  >
                    <QuoteIcon name="tag" size={17} />
                    Have a coupon?
                  </button>
                  {couponOpen && (
                    <div className="quote-coupon__field">
                      <FormField id="booking-coupon" label="Coupon">
                        <input id="booking-coupon" name="coupon" value={reservation.coupon} onChange={(event) => updateReservation('coupon', event.target.value)} />
                      </FormField>
                    </div>
                  )}
                </div>
              </section>

              <div className="quote-actions">
                <div className="quote-actions__estimate">
                  <span>Estimated total</span>
                  <strong>{estimateValue(estimate)}</strong>
                </div>
                <div className="quote-actions__buttons">
                  <button className="quote-button quote-button--outline" type="button" onClick={onEstimate} disabled={estimating || !hasValidEstimateDetails}>
                    {estimating ? <span className="quote-spinner" aria-hidden="true" /> : null}
                    {estimating ? 'Estimating…' : 'Estimate'}
                  </button>
                  <button className="quote-button quote-button--primary" type="submit" disabled={submitting || !hasValidQuoteDetails}>
                    {submitting ? <span className="quote-spinner" aria-hidden="true" /> : <QuoteIcon name="send" size={18} />}
                    {submitting ? 'Submitting…' : 'Submit quote'}
                  </button>
                </div>
                <p className="quote-actions__note">Submit your request to continue to secure deposit payment.</p>
              </div>
              {statusMessage && <p className="quote-status" role="status" aria-live="polite">{statusMessage}</p>}
              <label className="quote-privacy-consent">
                <input
                  id="quote-privacy-consent"
                  name="privacyAccepted"
                  type="checkbox"
                  checked={privacyAccepted}
                  aria-invalid={Boolean(formErrors.privacyAccepted)}
                  aria-describedby={formErrors.privacyAccepted ? 'quote-privacy-consent-error' : undefined}
                  onChange={(event) => {
                    setPrivacyAccepted(event.target.checked)
                    setFormErrors((current) => ({ ...current, privacyAccepted: '' }))
                  }}
                />
                <span>I accept the processing of my personal data for this reservation request. See our <a href="/privacy-policy">privacy policy</a>.</span>
              </label>
              {formErrors.privacyAccepted && <p className="quote-field__error" id="quote-privacy-consent-error">{formErrors.privacyAccepted}</p>}
              <input
                aria-hidden="true"
                autoComplete="off"
                className="quote-honeypot"
                name="website"
                tabIndex={-1}
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </form>

            <aside className="quote-summary" aria-labelledby="quote-summary-title">
              <h2 id="quote-summary-title">Your rental</h2>
              {DEMO_PRICES && <p className="quote-demo-prices">Demo prices</p>}
              <div className="quote-summary__vehicle">
                {selectedVehicle ? (
                  selectedImage
                    ? <img src={selectedImage} alt={selectedName} />
                    : <span className="quote-summary__vehicle-placeholder"><QuoteIcon name="car" size={30} /></span>
                ) : (
                  <span className="quote-summary__vehicle-placeholder"><QuoteIcon name="car" size={30} /></span>
                )}
                <div>
                  <strong>{selectedName || 'Select category'}</strong>
                  <span>{selectedModels || 'Vehicle models will appear here'}</span>
                </div>
              </div>
              <dl className="quote-summary__trip">
                <div><dt>Pick-up</dt><dd>{reservation.pickupLocation || '—'}</dd></div>
                <div><dt>Drop-off</dt><dd>{dropoffLocation || '—'}</dd></div>
                <div><dt>Pick-up date</dt><dd>{formatDate(reservation.pickupDate, reservation.pickupTime)}</dd></div>
                <div><dt>Drop-off date</dt><dd>{formatDate(reservation.returnDate, reservation.returnTime)}</dd></div>
                <div><dt>Rental length</dt><dd>{days ? `${days} ${days === 1 ? 'day' : 'days'}` : '—'}</dd></div>
              </dl>
              <div className="quote-summary__total">
                <span>Estimated total</span>
                <strong>{estimateValue(estimate)}</strong>
              </div>
              <div className="quote-summary__included">
                <h3>Included in your rate</h3>
                <ul>
                  {[
                    'Civil liability insurance',
                    'C.D.W.',
                    'Theft and fire insurance',
                    'Free additional drivers',
                    '24-hour road assistance',
                  ].map((item) => (
                    <li key={item}><QuoteIcon name="check" size={17} />{item}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </main>
      {!loading && !error && !confirmed && (
        <div className="quote-mobile-actions">
          <div className="quote-mobile-actions__total">
            <span>Estimated total</span>
            <strong>{estimateValue(estimate)}</strong>
          </div>
          <button type="button" className="quote-button quote-button--outline" onClick={onEstimate} disabled={estimating || !hasValidEstimateDetails}>
            {estimating ? <span className="quote-spinner" aria-hidden="true" /> : null}
            Estimate
          </button>
          <button type="submit" form="quote-request-form" className="quote-button quote-button--primary" disabled={submitting || !hasValidQuoteDetails}>
            {submitting ? <span className="quote-spinner" aria-hidden="true" /> : <QuoteIcon name="send" size={17} />}
            Submit quote
          </button>
        </div>
      )}
    </div>
  )
}

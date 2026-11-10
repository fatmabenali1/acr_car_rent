import { useEffect, useState } from 'react'
import { getCheckoutLocations } from '../api/checkout'

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultDates() {
  const pickupDate = new Date()
  const returnDate = new Date()
  returnDate.setDate(returnDate.getDate() + 3)
  return {
    pickupDate: formatLocalDate(pickupDate),
    returnDate: formatLocalDate(returnDate),
  }
}

function getBookingDefaults() {
  const params = new URLSearchParams(window.location.search)
  const dates = getDefaultDates()
  const dropoffLocation = params.get('returnLocation') || ''

  return {
    pickupLocation: params.get('pickupLocation') || '',
    pickupDate: params.get('pickupDate') || dates.pickupDate,
    pickupTime: params.get('pickupTime') || '09:00',
    returnDate: params.get('returnDate') || dates.returnDate,
    returnTime: params.get('returnTime') || '09:00',
    useDifferentDropoff: Boolean(dropoffLocation),
    dropoffLocation,
    driverAge: params.get('driverAge') || '30',
    coupon: params.get('coupon') || '',
    category: params.get('category') || '',
    source: params.get('source') || '',
  }
}

const iconPaths = {
  'map-pin': (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  'calendar-days': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" strokeLinecap="round" />
    </>
  ),
  'calendar-x': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M9 14l6 6m0-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 14 16 8m4.5-1.5a9 9 0 1 1-17 0" strokeLinecap="round" />
      <path d="M6.5 5.5 8 7m8 0 1.5-1.5" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'life-buoy': (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="m5.6 5.6 4.3 4.3m4.2 4.2 4.3 4.3m0-12.8-4.3 4.3m-4.2 4.2-4.3 4.3" />
    </>
  ),
  'plane-landing': (
    <>
      <path d="M2 12h7l5-9 2 1-2 8h6l2-3 2 1-2 5H2v-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  user: (
    <>
      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" />
    </>
  ),
  'ticket-percent': (
    <>
      <path d="M2 9a3 3 0 0 0 0 6v3h20v-3a3 3 0 0 1 0-6V6H2v3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 15 6-6m-5.5.5h.01m5 5h.01" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" strokeLinecap="round" />
    </>
  ),
  'calendar-check': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8 15 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />,
  'chevron-down': <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.69A2 2 0 0 1 22 16.92Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

function BookingIcon({ name, size = 20, className = '' }) {
  const sizeClass = size === 16 ? 'h-4 w-4' : size === 24 ? 'h-6 w-6' : 'h-5 w-5'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`${sizeClass} shrink-0 ${className}`}
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function BookingField({ id, label, icon, iconClassName = '', error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </label>
      <div className="relative">
        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#111111] ${iconClassName || 'left-4'}`} aria-hidden="true">
          <BookingIcon name={icon} />
        </span>
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )
}

const fieldClassName = 'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm font-medium text-[#111111] focus-visible:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]/40'

const times = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minute}`
})

const rateGroups = [
  {
    icon: 'shield-check',
    title: 'Insurance',
    benefits: [
      { text: 'Civil liability and third party liability insurance' },
      { text: 'Full insurance C.D.W. (with relevant deductible)' },
      { text: 'Theft and fire insurance' },
    ],
  },
  {
    icon: 'gauge',
    title: 'Freedom',
    benefits: [
      { text: 'Unlimited mileage for rentals of 3 days or more', detail: '1–2 day rentals are limited to 200 km per day' },
      { text: 'Free additional drivers' },
      { text: 'Free and pre-authorized permission to ferry our vehicles to all Greek islands' },
    ],
  },
  {
    icon: 'clock',
    title: 'Peace of mind',
    benefits: [
      { text: '24-hour road assistance' },
      { text: 'Vehicle Registration Fee (V.R.F.) & VAT 24% included' },
    ],
  },
]

function StepHeading({ number, children }) {
  return (
    <h3 className="mb-4 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-[#111111]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-extrabold text-[#111111]">
        {number}
      </span>
      {children}
    </h3>
  )
}

export function BookingPage() {
  const [form, setForm] = useState(getBookingDefaults)
  const [errors, setErrors] = useState({})
  const [locationOptions, setLocationOptions] = useState([])
  const [locationLookupError, setLocationLookupError] = useState('')

  useEffect(() => {
    let active = true
    getCheckoutLocations()
      .then((locations) => {
        if (active) setLocationOptions(locations.map((location) => location.name))
      })
      .catch((error) => {
        if (active) setLocationLookupError(error.message)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Rates & Reservations | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    const age = Number(form.driverAge)
    const pickupAt = `${form.pickupDate}T${form.pickupTime}`
    const returnAt = `${form.returnDate}T${form.returnTime}`

    if (!form.pickupLocation.trim()) nextErrors.pickupLocation = 'Enter a pick-up location.'
    if (!form.pickupDate) nextErrors.pickupDate = 'Choose a pick-up date.'
    if (!form.returnDate) nextErrors.returnDate = 'Choose a drop-off date.'
    if (form.pickupDate && form.returnDate && returnAt <= pickupAt) {
      nextErrors.returnDate = 'Drop-off must be after pick-up.'
    }
    if (!Number.isInteger(age) || age < 23 || age > 75) nextErrors.driverAge = 'Driver age must meet the category minimum and be no more than 75.'
    if (form.useDifferentDropoff && !form.dropoffLocation.trim()) {
      nextErrors.dropoffLocation = 'Enter a drop-off location.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const params = new URLSearchParams({
      pickupLocation: form.pickupLocation.trim(),
      pickupDate: form.pickupDate,
      pickupTime: form.pickupTime,
      returnDate: form.returnDate,
      returnTime: form.returnTime,
      driverAge: String(age),
      ...(form.category ? { category: form.category } : {}),
      ...(form.source ? { source: form.source } : {}),
      ...(form.useDifferentDropoff ? { returnLocation: form.dropoffLocation.trim() } : {}),
      ...(form.coupon.trim() ? { coupon: form.coupon.trim() } : {}),
    })
    window.location.assign(`/quote?${params.toString()}`)
  }

  return (
    <div className="bg-[#F7F4EF] pb-24 text-[#111111]">
      <section className="bg-[#111111]">
        <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 pt-8 pb-8 sm:px-6 lg:px-10 lg:pt-10 lg:pb-10 2xl:px-16">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <a href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">Rates &amp; Reservations</span>
          </nav>
          <h1 className="mt-4 text-3xl font-extrabold text-white lg:text-5xl">
            Rates &amp; <span className="text-[#FACC15]">Reservations</span>
          </h1>
          <p className="mt-2 mb-2 max-w-3xl text-sm text-white/80 sm:text-base">
            Choose your dates and find the best rate for your rental in Greece.
          </p>
          {form.source === 'early-bird' && (
            <p className="mt-3 inline-flex rounded-full bg-[#FACC15] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#111111]">
              Early bird request
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mt-8 grid items-start gap-6 md:mt-[4.75rem] lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl bg-white p-6 pt-4 shadow-xl ring-2 ring-[#FACC15] lg:col-span-12 lg:p-8 lg:pt-5">
            <div className="flex flex-col items-start gap-2 sm:min-h-[48px] sm:flex-row sm:items-center sm:justify-between">
              <h2 className="mb-0 text-2xl font-extrabold leading-tight text-[#111111]">Find your car</h2>
              <a
                href="/manage-booking"
                className="inline-flex items-center gap-2 text-base font-semibold text-[#111111] underline underline-offset-4 decoration-[#FACC15] decoration-2 hover:decoration-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 sm:ml-auto"
              >
                <BookingIcon name="calendar-check" size={16} />
                Already booked? Manage your booking
              </a>
            </div>

            <form aria-label="Rates and reservations search" className="mt-3" onSubmit={handleSubmit} noValidate>
              <section aria-labelledby="booking-step-where">
                <StepHeading number="1"><span id="booking-step-where">Where</span></StepHeading>
                <BookingField id="booking-pickup-location" label="Pick-up location" icon="map-pin" error={errors.pickupLocation}>
                  <input
                    id="booking-pickup-location"
                    name="pickupLocation"
                    type="text"
                    required
                    value={form.pickupLocation}
                    onChange={(event) => updateField('pickupLocation', event.target.value)}
                    placeholder="Enter an airport, city or address"
                    className={fieldClassName}
                    list="booking-location-options"
                  />
                  <datalist id="booking-location-options">
                    {locationOptions.map((location) => <option key={location} value={location} />)}
                  </datalist>
                </BookingField>
                {locationLookupError && <p className="mt-1 text-xs text-red-600" role="status">{locationLookupError}</p>}
                <label className="mt-3 flex flex-row items-center justify-start gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.useDifferentDropoff}
                    onChange={(event) => updateField('useDifferentDropoff', event.target.checked)}
                    className="h-4 w-4 accent-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
                  />
                  Use different drop-off location
                </label>
                <div
                  className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 motion-reduce:transition-none ${form.useDifferentDropoff ? 'mt-4 max-h-32 opacity-100' : 'mt-0 max-h-0 opacity-0'}`}
                  aria-hidden={!form.useDifferentDropoff}
                  inert={!form.useDifferentDropoff}
                >
                  <BookingField id="booking-dropoff-location" label="Drop-off location" icon="map-pin" error={errors.dropoffLocation}>
                    <input
                      id="booking-dropoff-location"
                      name="returnLocation"
                      type="text"
                      value={form.dropoffLocation}
                      onChange={(event) => updateField('dropoffLocation', event.target.value)}
                      placeholder="Enter an airport, city or address"
                      className={fieldClassName}
                      list="booking-location-options"
                    />
                  </BookingField>
                </div>
              </section>

              <section aria-labelledby="booking-step-when" className="mt-6 border-t border-slate-100 pt-6">
                <StepHeading number="2"><span id="booking-step-when">When</span></StepHeading>
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset>
                    <div className="grid grid-cols-[3fr_2fr] gap-3">
                      <BookingField id="booking-pickup-date" label="Pick-up date" icon="calendar-days" iconClassName="left-3.5 z-10 h-5 w-5" error={errors.pickupDate}>
                        <input id="booking-pickup-date" name="pickupDate" type="date" required value={form.pickupDate} onChange={(event) => updateField('pickupDate', event.target.value)} className={`${fieldClassName} booking-native-input pl-11`} />
                      </BookingField>
                      <BookingField id="booking-pickup-time" label="Pick-up time" icon="clock">
                        <select id="booking-pickup-time" name="pickupTime" value={form.pickupTime} onChange={(event) => updateField('pickupTime', event.target.value)} className={`${fieldClassName} appearance-none pr-10`}>
                          {times.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
                          <BookingIcon name="chevron-down" size={16} />
                        </span>
                      </BookingField>
                    </div>
                  </fieldset>
                  <fieldset>
                    <div className="grid grid-cols-[3fr_2fr] gap-3">
                      <BookingField id="booking-return-date" label="Drop-off date" icon="calendar-days" iconClassName="left-3.5 z-10 h-5 w-5" error={errors.returnDate}>
                        <input id="booking-return-date" name="returnDate" type="date" required value={form.returnDate} onChange={(event) => updateField('returnDate', event.target.value)} className={`${fieldClassName} booking-native-input pl-11`} />
                      </BookingField>
                      <BookingField id="booking-return-time" label="Drop-off time" icon="clock">
                        <select id="booking-return-time" name="returnTime" value={form.returnTime} onChange={(event) => updateField('returnTime', event.target.value)} className={`${fieldClassName} appearance-none pr-10`}>
                          {times.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
                          <BookingIcon name="chevron-down" size={16} />
                        </span>
                      </BookingField>
                    </div>
                  </fieldset>
                </div>
              </section>

              <section aria-labelledby="booking-step-driver" className="mt-6 border-t border-slate-100 pt-6">
                <StepHeading number="3"><span id="booking-step-driver">Driver</span></StepHeading>
                <div className="grid gap-4 sm:grid-cols-2">
                  <BookingField id="booking-driver-age" label="Driver's age" icon="user" error={errors.driverAge}>
                    <input id="booking-driver-age" name="driverAge" type="number" min="23" max="75" required value={form.driverAge} onChange={(event) => updateField('driverAge', event.target.value)} className={fieldClassName} />
                  </BookingField>
                  <BookingField id="booking-coupon" label="Coupon (optional)" icon="ticket-percent">
                    <input id="booking-coupon" name="coupon" type="text" value={form.coupon} onChange={(event) => updateField('coupon', event.target.value)} className={fieldClassName} />
                  </BookingField>
                </div>
              </section>

              <button
                type="submit"
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] text-base font-extrabold uppercase tracking-wide text-[#111111] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EAB308] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <BookingIcon name="search" />
                Search cars
              </button>
            </form>
          </section>

        </div>

        <section aria-labelledby="rates-include-heading" className="py-16 lg:py-20">
          <div className="mb-8 text-center">
            <h2 id="rates-include-heading" className="text-3xl font-extrabold text-[#111111] lg:text-4xl">
              Our rates <span className="text-[#FACC15]">include</span>
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Everything you need for a worry-free rental in Greece.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rateGroups.map(({ icon, title, benefits }) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-[#FACC15] hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none lg:p-8"
              >
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-[#111111]" aria-hidden="true">
                    <BookingIcon name={icon} size={24} />
                  </span>
                  <h3 className="mb-0 text-xl font-extrabold text-[#111111]">{title}</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {benefits.map(({ text, detail }) => (
                    <li key={text} className="flex items-start gap-3 py-4 text-base leading-relaxed text-slate-700 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-[#111111]" aria-hidden="true">
                        <BookingIcon name="check" size={16} />
                      </span>
                      <span>
                        <span className="block">{text}</span>
                        {detail && <span className="mt-1 block text-sm text-slate-500">{detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

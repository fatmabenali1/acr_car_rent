import { useEffect, useState } from 'react'
import {
  CarFront,
  Check,
  DoorOpen,
  Fuel,
  Mail,
  Phone,
  Users,
  Truck,
} from 'lucide-react'
import { getCheckoutLocations, submitInquiry } from '../api/checkout'
import { ContactField, ContactHero } from './ContactPage'

const vans = [
  {
    name: 'Category V Manual - Small Van',
    example: 'Renault Trafic L1H1 or similar',
    volume: '5.8 m³',
    payload: 'up to 1,100 kg',
    image: '/images/categoryv.jpg',
    details: '/fleet/category-v-manual-small-van',
  },
  {
    name: 'Category V1 Manual - Large Van',
    example: 'Renault Trafic L2H1 or similar',
    volume: '7.7 m³',
    payload: 'up to 1,100 kg',
    image: '/images/categoryv1.jpg',
    details: '/fleet/category-v1-manual-large-van',
  },
]

const inclusions = [
  'Civil liability and third party liability insurance',
  'C.D.W. insurance (800.00 to 2000.00 Euros deductible)',
  'Theft and fire insurance',
  'Ferry insurance (the vehicle is insured even while boarded on a ferry)',
  'Unlimited mileage for rentals exceeding 3 days',
  'Additional drivers',
  '24-hour road assistance',
  'Delivery & collection at Athens International Airport and 24% VAT',
]

const inputClass = 'h-12 w-full rounded-xl border border-[#D8D2C7] bg-white px-4 text-sm text-[#111111] focus-visible:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none'

function VanCard({ van }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="rounded-2xl bg-[#1C1C1C] p-4 ring-1 ring-white/15">
      <div className="flex items-start gap-4">
        <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2A2A2A]">
          {!imageFailed ? (
            <img
              src={van.image}
              alt={`${van.name} - ${van.example}`}
              width={160}
              height={110}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain"
            />
          ) : (
            <CarFront size={40} className="h-10 w-10 shrink-0 text-[#FACC15]" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold leading-snug text-white">{van.name}</h3>
          <p className="mt-1 text-xs font-medium text-white/75">{van.example}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/80">
        {[
          [Truck, `Cargo ${van.volume}`],
          [Truck, `Payload ${van.payload}`],
          [Fuel, 'Diesel'],
          [Users, '3 seats'],
          [DoorOpen, '4 doors'],
          [CarFront, 'Manual'],
        ].map(([Icon, detail]) => (
          <li key={detail} className="flex items-center gap-2">
            <Icon size={16} className="h-4 w-4 shrink-0 text-[#FACC15]" aria-hidden="true" />
            {detail}
          </li>
        ))}
      </ul>
      <a
        href={van.details}
        className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-[#FACC15] underline decoration-[#FACC15] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none"
      >
        View details
      </a>
    </article>
  )
}

export function CargoVansPage() {
  const [locations, setLocations] = useState([])
  const [locationError, setLocationError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState({ type: '', message: '' })
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    van: '',
    pickupLocation: '',
    pickupDate: '',
    pickupTime: '',
    returnDate: '',
    returnTime: '',
    privacyAccepted: false,
    website: '',
  })

  useEffect(() => {
    let active = true
    getCheckoutLocations()
      .then((items) => {
        if (active) {
          setLocations(items.map((item) => item.name))
          setLocationError('')
        }
      })
      .catch((error) => {
        if (active) setLocationError(error.message || 'Unable to load locations. You can still enter an address.')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    document.title = 'Cargo Vans | Athens Car Rental'
  }, [])

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setResult({ type: '', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setResult({ type: '', message: '' })
    if (new Date(`${form.returnDate}T${form.returnTime}`) <= new Date(`${form.pickupDate}T${form.pickupTime}`)) {
      setResult({ type: 'error', message: 'Return date and time must be after pick-up.' })
      return
    }
    if (!form.privacyAccepted) {
      setResult({ type: 'error', message: 'Please accept the data processing notice to send your request.' })
      return
    }

    setBusy(true)
    try {
      await submitInquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        van: form.van,
        pickupLocation: form.pickupLocation,
        pickupAt: new Date(`${form.pickupDate}T${form.pickupTime}`).toISOString(),
        returnAt: new Date(`${form.returnDate}T${form.returnTime}`).toISOString(),
        message,
        privacyAccepted: form.privacyAccepted,
        website: form.website,
      })
      setResult({ type: 'success', message: 'Thank you, we reply within 24 hours' })
      setForm((current) => ({
        ...current,
        name: '',
        email: '',
        phone: '',
        van: '',
        pickupLocation: '',
        pickupDate: '',
        pickupTime: '',
        returnDate: '',
        returnTime: '',
        privacyAccepted: false,
      }))
      setMessage('')
    } catch (error) {
      setResult({ type: 'error', message: error.message || 'Your request could not be sent. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-[#F7F4EF] text-[#111111]">
      <ContactHero
        breadcrumb="Cargo vans"
        eyebrow="CARGO VANS"
        title="Cargo "
        highlight="vans"
        suffix=" for rent"
        subtitle="Spacious vans for moving, deliveries and business needs throughout Athens and Greece."
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl bg-white p-5 shadow-lg ring-2 ring-[#FACC15] sm:p-8 lg:col-span-7">
            <h2 className="text-2xl font-extrabold">Request a van quote</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactField id="cargo-name" label="Full name" autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
                <ContactField id="cargo-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
                <ContactField id="cargo-phone" label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} required />
                <div>
                  <label htmlFor="cargo-van" className="mb-1.5 block text-sm font-semibold">Van</label>
                  <select id="cargo-van" value={form.van} onChange={(event) => update('van', event.target.value)} required className={inputClass}>
                    <option value="">Select a van</option>
                    <option>Category V Manual - Small Van</option>
                    <option>Category V1 Manual - Large Van</option>
                    <option>Not sure yet</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <ContactField
                    id="cargo-pickup-location"
                    label="Pick-up location"
                    value={form.pickupLocation}
                    onChange={(event) => update('pickupLocation', event.target.value)}
                    placeholder="Choose a location or enter an address"
                    list="cargo-location-options"
                    required
                  />
                  <datalist id="cargo-location-options">
                    {locations.map((location) => <option key={location} value={location} />)}
                  </datalist>
                  {locationError && <p className="mt-1 text-xs text-[#5F5B53]" role="status">{locationError}</p>}
                </div>
                <ContactField id="cargo-pickup-date" label="Pick-up date" type="date" value={form.pickupDate} onChange={(event) => update('pickupDate', event.target.value)} required />
                <ContactField id="cargo-pickup-time" label="Pick-up time" type="time" value={form.pickupTime} onChange={(event) => update('pickupTime', event.target.value)} required />
                <ContactField id="cargo-return-date" label="Return date" type="date" value={form.returnDate} onChange={(event) => update('returnDate', event.target.value)} required />
                <ContactField id="cargo-return-time" label="Return time" type="time" value={form.returnTime} onChange={(event) => update('returnTime', event.target.value)} required />
              </div>

              <div>
                <label htmlFor="cargo-message" className="mb-1.5 block text-sm font-semibold">Message (optional)</label>
                <textarea
                  id="cargo-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value.slice(0, 600))}
                  maxLength={600}
                  rows={4}
                  className="w-full rounded-xl border border-[#D8D2C7] bg-white px-4 py-3 text-sm text-[#111111] focus-visible:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                />
                <p className="mt-1 text-right text-xs text-[#5F5B53]">{message.length}/600</p>
              </div>

              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="cargo-website">Leave this field empty</label>
                <input id="cargo-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} />
              </div>

              <label className="flex items-start gap-3 text-sm leading-relaxed text-[#37342F]">
                <input
                  type="checkbox"
                  checked={form.privacyAccepted}
                  onChange={(event) => update('privacyAccepted', event.target.checked)}
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
                />
                <span>I agree to the processing of my personal data to respond to this van quote request.</span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#E9B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none sm:w-auto"
              >
                {busy ? 'Sending…' : 'Send request'}
              </button>
              <p aria-live="polite" role={result.type === 'error' ? 'alert' : 'status'} className={`min-h-6 text-sm font-semibold ${result.type === 'success' ? 'text-green-800' : result.type === 'error' ? 'text-red-700' : ''}`}>
                {result.message}
              </p>
            </form>
          </section>

          <aside className="rounded-3xl border-2 border-[#FACC15] bg-[#111111] p-5 text-white shadow-xl sm:p-7 lg:sticky lg:top-8 lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">ATHENS CAR RENTAL</p>
            <h2 className="mt-2 text-2xl font-extrabold">Our vans</h2>
            <div className="mt-5 space-y-4">
              {vans.map((van) => <VanCard key={van.name} van={van} />)}
            </div>
            <div className="mt-6 border-t border-white/15 pt-5">
              <h3 className="text-lg font-extrabold">Need help?</h3>
              <a href="tel:+302106022220" className="mt-3 flex min-h-11 items-center gap-3 rounded-lg text-sm font-semibold text-white hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]">
                <Phone size={20} className="h-5 w-5 shrink-0 text-[#FACC15]" aria-hidden="true" />
                +30 210 6022220
              </a>
              <a href="mailto:info@athenscarrental.com" className="mt-2 flex min-h-11 items-center gap-3 rounded-lg text-sm font-semibold text-white hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]">
                <Mail size={20} className="h-5 w-5 shrink-0 text-[#FACC15]" aria-hidden="true" />
                info@athenscarrental.com
              </a>
              <a href="https://wa.me/302106022220" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-[#FACC15] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]">
                WhatsApp
              </a>
            </div>
          </aside>
        </div>

        <section className="py-8 lg:py-10" aria-labelledby="van-inclusions-title">
          <h2 id="van-inclusions-title" className="text-2xl font-extrabold">Included with every van</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {inclusions.map((item) => (
              <li key={item} className="flex min-h-16 items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5DFD4]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#111111]">
                  <Check size={16} className="h-4 w-4 shrink-0" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-[#37342F]">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, CreditCard, Lock, MapPin, ShieldCheck } from 'lucide-react'
import {
  createCheckout,
  getBooking,
  getCheckoutStatus,
  getReservationPaymentInfo,
} from '../api/checkout'

const pageContainer = 'mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16'
const fieldClass = 'mt-1 h-12 w-full rounded-xl border border-[#D8D2C7] bg-white px-4 text-sm text-[#111111] outline-none transition focus-visible:border-[#FACC15] focus-visible:ring-2 focus-visible:ring-[#FACC15]/50'

function formatAmount(cents) {
  if (!Number.isInteger(cents)) return '—'
  return (cents / 100).toFixed(2)
}

function formatDate(value, lang = 'en') {
  if (!value) return '—'
  return new Date(value).toLocaleString(lang === 'el' ? 'el-GR' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Athens',
  })
}

function createIdempotencyKey() {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

function getPaymentErrorMessage(error, lang = 'en') {
  const isGreek = lang === 'el'
  switch (error.status) {
    case 400:
      return isGreek ? 'Δεν ήταν δυνατή η επαλήθευση του αιτήματος πληρωμής. Ελέγξτε τα στοιχεία της κράτησής σας.' : 'We could not verify the payment request. Please check your reservation details.'
    case 404:
      return isGreek ? 'Δεν βρέθηκε αυτή η κράτηση. Ελέγξτε τον κωδικό αναφοράς και τη διεύθυνση email σας.' : 'We could not find this reservation. Please check your reference and email address.'
    case 429:
      return isGreek ? 'Έγιναν πολλές προσπάθειες πληρωμής. Περιμένετε λίγο πριν δοκιμάσετε ξανά.' : 'Too many payment attempts. Please wait a moment before trying again.'
    case 500:
      return isGreek ? 'Δεν ήταν δυνατή η έναρξη της πληρωμής λόγω προσωρινού σφάλματος. Δοκιμάστε ξανά αργότερα.' : 'We could not start your payment due to a temporary error. Please try again later.'
    case 503:
      return isGreek ? 'Η ηλεκτρονική πληρωμή δεν είναι προσωρινά διαθέσιμη. Επικοινωνήστε μαζί μας στο +30 210 6022220 ή στο info@athenscarrental.com.' : 'Online payment is temporarily unavailable. Please contact us on +30 210 6022220 or info@athenscarrental.com.'
    default:
      return isGreek ? 'Δεν ήταν δυνατή η έναρξη της πληρωμής. Δοκιμάστε ξανά αργότερα.' : 'We could not start your payment. Please try again later.'
  }
}

function PaymentHero({ lang }) {
  const isGreek = lang === 'el'
  return (
    <section className="bg-[#111111]">
      <div className={`${pageContainer} py-7 sm:py-9`}>
        <nav aria-label="Breadcrumb" className="text-sm text-white/70">
          <a className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]" href="/">{isGreek ? 'Αρχική' : 'Home'}</a>
          <span className="mx-2" aria-hidden="true">/</span>
          <span aria-current="page">{isGreek ? 'Ασφαλής πληρωμή' : 'Secure payment'}</span>
        </nav>
        <p className="mt-5 inline-flex rounded-full border border-[#FACC15]/50 px-3 py-1 text-[11px] font-bold tracking-[0.16em] text-[#FACC15]">
          {isGreek ? 'ΑΣΦΑΛΗΣ ΠΛΗΡΩΜΗ' : 'SECURE PAYMENT'}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
          {isGreek ? 'Πληρώστε την ' : 'Pay your '}<span className="text-[#FACC15]">{isGreek ? 'προκαταβολή' : 'deposit'}</span>
        </h1>
        <p className="mt-2 text-sm text-white/75 sm:text-base">
          {isGreek ? 'Επιβεβαιώστε την κράτησή σας με ασφαλή ηλεκτρονική πληρωμή.' : 'Confirm your reservation with a secure online payment.'}
        </p>
      </div>
    </section>
  )
}

function StepHeading({ number, children }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-extrabold text-[#111111]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-sm font-extrabold">{number}</span>
      {children}
    </h2>
  )
}

function BookingSummary({ booking, lang }) {
  const isGreek = lang === 'el'
  if (!booking) return null
  const remaining = Number.isInteger(booking.totalAmountCents)
    ? Math.max(0, booking.totalAmountCents - (booking.depositAmountCents ?? 0))
    : null
  return (
    <div className="mt-5 space-y-4 border-t border-white/15 pt-5 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{isGreek ? 'Κωδικός αναφοράς' : 'Reference'}</p>
        <p className="mt-1 font-bold">{booking.reference}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{isGreek ? 'Όχημα' : 'Vehicle'}</p>
        <p className="mt-1 font-semibold">{booking.categoryName || booking.category || '—'}</p>
        {booking.example && <p className="text-white/70">{booking.example}</p>}
      </div>
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
          <MapPin width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden="true" />
          {isGreek ? 'Τοποθεσία παραλαβής' : 'Pick-up location'}
        </p>
        <p className="mt-1">{booking.pickupLocation || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{isGreek ? 'Παραλαβή' : 'Pick-up'}</p>
        <p className="mt-1">{formatDate(booking.pickupAt, lang)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{isGreek ? 'Επιστροφή' : 'Drop-off'}</p>
        <p className="mt-1">{formatDate(booking.dropoffAt, lang)}</p>
      </div>
      <div className="flex justify-between gap-4 border-t border-white/15 pt-4 font-bold">
        <span>{isGreek ? 'Προκαταβολή' : 'Deposit'}</span>
        <span>€{formatAmount(booking.depositAmountCents)}</span>
      </div>
      {remaining !== null && (
        <div className="flex justify-between gap-4 text-white/75">
          <span>{isGreek ? 'Υπόλοιπο πληρωτέο κατά την παραλαβή' : 'Remaining to pay at pick-up'}</span>
          <span>€{formatAmount(remaining)}</span>
        </div>
      )}
    </div>
  )
}

function SecurePaymentDetails({ lang }) {
  const isGreek = lang === 'el'
  return (
    <section className="mt-5 rounded-3xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-base font-extrabold text-[#111111]">{isGreek ? 'Ασφαλής πληρωμή' : 'Pay safely'}</h2>
      <div className="mt-4 flex items-start gap-3 text-sm text-[#5F5B53]">
        <Lock width={20} height={20} className="h-5 w-5 shrink-0 text-[#111111]" aria-hidden="true" />
        <p>{isGreek ? 'Τα στοιχεία της κάρτας καταχωρίζονται στην ασφαλή σελίδα της Stripe. Δεν βλέπουμε ούτε αποθηκεύουμε τον αριθμό της κάρτας σας.' : 'Card details are entered on Stripe&apos;s secure page. We never see or store your card number.'}</p>
      </div>
      <div className="mt-3 flex items-start gap-3 text-sm text-[#5F5B53]">
        <ShieldCheck width={20} height={20} className="h-5 w-5 shrink-0 text-[#111111]" aria-hidden="true" />
        <p>{isGreek ? 'Πληρωμή με πιστωτική ή χρεωστική κάρτα χωρίς πρόσθετες χρεώσεις.' : 'Payment with credit or debit cards without any additional fees.'}</p>
      </div>
      <div className="mt-3 flex items-start gap-3 text-sm text-[#5F5B53]">
        <CreditCard width={20} height={20} className="h-5 w-5 shrink-0 text-[#111111]" aria-hidden="true" />
        <p>{isGreek ? 'Η πληρωμή σας διεκπεραιώνεται με ασφάλεια μέσω του Stripe Checkout.' : 'Your payment is processed securely by Stripe Checkout.'}</p>
      </div>
      <div className="mt-5 border-t border-[#E6E0D5] pt-4 text-sm">
        <p className="font-bold text-[#111111]">{isGreek ? 'Χρειάζεστε βοήθεια;' : 'Need help?'}</p>
        <a className="mt-1 inline-block font-semibold underline decoration-[#FACC15] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]" href="tel:+302106022220">
          +30 210 6022220
        </a>
      </div>
    </section>
  )
}

function ReservationLookup({ onFound, initialReference, initialEmail = '', lang }) {
  const isGreek = lang === 'el'
  const [reference, setReference] = useState(initialReference)
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    onFound(null, '')
    try {
      const booking = await getBooking(reference.trim(), email.trim())
      onFound(booking, email.trim())
    } catch (requestError) {
      setError(requestError.message || (isGreek ? 'Δεν βρέθηκε κράτηση με αυτά τα στοιχεία.' : 'We could not find a reservation with those details.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="reservation-reference" className="text-sm font-semibold text-[#111111]">{isGreek ? 'Κωδικός κράτησης' : 'Reservation reference'}</label>
        <input id="reservation-reference" autoComplete="off" required value={reference} onChange={(event) => setReference(event.target.value)} className={fieldClass} />
      </div>
      <div>
        <label htmlFor="reservation-email" className="text-sm font-semibold text-[#111111]">Email</label>
        <input id="reservation-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
      </div>
      {error && <p className="text-sm font-medium text-red-700" role="alert" aria-live="polite">{error}</p>}
      <button type="submit" disabled={busy || !reference.trim() || !email.trim()} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        {busy
          ? isGreek ? 'Αναζήτηση κράτησης…' : 'Finding reservation…'
          : isGreek ? 'Βρείτε την κράτησή μου' : 'Find my reservation'}
      </button>
    </form>
  )
}

function PaymentPrefillDetails({ info, lang }) {
  if (!info) return null
  const isGreek = lang === 'el'
  const fields = [
    [isGreek ? 'Όνομα' : 'First Name', info.firstName],
    [isGreek ? 'Επώνυμο' : 'Last Name', info.lastName],
    ['Email', info.email],
    [isGreek ? 'Χώρα' : 'Country', info.country],
    [isGreek ? 'Κινητό' : 'Mobile', info.mobile],
    [isGreek ? 'Αριθμός κράτησης' : 'Reservation Request Number', info.reservationReference],
    [isGreek ? 'Ημερομηνία παράδοσης' : 'Delivery Date', info.deliveryDate],
    [isGreek ? 'Σημειώσεις' : 'Notes', info.notes || ''],
    [isGreek ? 'Ποσό σε ευρώ' : 'Amount in Euros', formatAmount(Math.round(info.amount * 100))],
  ]
  return (
    <section className="mt-6 rounded-2xl border border-[#E6E0D5] bg-[#F7F4EF] p-4" aria-label={isGreek ? 'Στοιχεία πληρωμής κράτησης' : 'Reservation payment details'}>
      <h2 className="font-extrabold text-[#111111]">{isGreek ? 'Στοιχεία κράτησης' : 'Reservation details'}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <label key={label} className="text-xs font-semibold text-[#5F5B53]">
            {label}
            <input
              aria-label={label}
              readOnly
              value={value ?? ''}
              className="mt-1 h-11 w-full rounded-lg border border-[#D8D2C7] bg-white px-3 text-sm text-[#111111]"
            />
          </label>
        ))}
      </div>
    </section>
  )
}

function ReservationDetails({ booking, email, lang }) {
  const isGreek = lang === 'el'
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const paymentInFlight = useRef(false)
  const idempotency = useRef(null)
  const isPayable = ['quote', 'pending_payment'].includes(booking.status)
  const canPay = Number.isInteger(booking.depositAmountCents) && booking.depositAmountCents > 0

  async function pay() {
    if (paymentInFlight.current) return
    paymentInFlight.current = true
    setBusy(true)
    setError('')
    try {
      if (idempotency.current?.reference !== booking.reference) {
        idempotency.current = { reference: booking.reference, key: createIdempotencyKey() }
      }
      const result = await createCheckout(booking.reference, email, idempotency.current.key)
      window.location.assign(result.url)
    } catch (requestError) {
      setError(getPaymentErrorMessage(requestError, lang))
      paymentInFlight.current = false
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 border-t border-[#E6E0D5] pt-7">
      <StepHeading number="2">{isGreek ? 'Ελέγξτε τα στοιχεία σας' : 'Check your details'}</StepHeading>
      <dl className="mt-5 grid gap-4 rounded-2xl bg-[#F7F4EF] p-5 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Κατηγορία' : 'Category'}</dt><dd className="mt-1 font-bold">{booking.categoryName || booking.category} {booking.example ? `— ${booking.example}` : ''}</dd></div>
        <div><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Κωδικός αναφοράς' : 'Reference'}</dt><dd className="mt-1 font-bold">{booking.reference}</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold text-[#5F5B53]"><MapPin width={18} height={18} className="h-5 w-5 shrink-0" aria-hidden="true" />{isGreek ? 'Τοποθεσία παραλαβής' : 'Pick-up location'}</dt><dd className="mt-1 font-bold">{booking.pickupLocation}</dd></div>
        <div><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Τοποθεσία επιστροφής' : 'Drop-off location'}</dt><dd className="mt-1 font-bold">{booking.dropoffLocation}</dd></div>
        <div><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Ημερομηνία και ώρα παραλαβής' : 'Pick-up date &amp; time'}</dt><dd className="mt-1 font-bold">{formatDate(booking.pickupAt, lang)}</dd></div>
        <div><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Ημερομηνία και ώρα επιστροφής' : 'Drop-off date &amp; time'}</dt><dd className="mt-1 font-bold">{formatDate(booking.dropoffAt, lang)}</dd></div>
        <div className="sm:col-span-2"><dt className="font-semibold text-[#5F5B53]">{isGreek ? 'Προκαταβολή' : 'Deposit'}</dt><dd className="mt-1 text-lg font-extrabold">€{formatAmount(booking.depositAmountCents)}</dd></div>
      </dl>

      {booking.status === 'paid' && (
        <div className="mt-5 rounded-2xl border border-green-300 bg-green-50 p-4 text-sm text-green-900" role="status">
          <p className="flex items-center gap-2 font-extrabold"><CheckCircle2 width={20} height={20} className="h-5 w-5 shrink-0" aria-hidden="true" />{isGreek ? 'Ήδη πληρωμένη' : 'Already paid'}</p>
          <p className="mt-1">{isGreek ? 'Η πληρωμή σας επιβεβαιώθηκε. Η απόδειξη και τα στοιχεία επιβεβαίωσης θα σταλούν μέσω email.' : 'Your payment is confirmed. Your receipt and confirmation details will be sent by email.'}</p>
          {booking.receipt && (
            <p className="mt-2 font-semibold">
              {isGreek ? 'Απόδειξη' : 'Receipt'}: €{formatAmount(booking.receipt.amountPaidCents)}
              {booking.receipt.paidAt ? ` — ${formatDate(booking.receipt.paidAt, lang)}` : ''}
            </p>
          )}
        </div>
      )}
      {['expired', 'cancelled'].includes(booking.status) && (
        <p className="mt-5 rounded-2xl border border-amber-300 bg-[#FEF3C7] p-4 text-sm font-semibold text-[#111111]" role="status">
          {isGreek ? `Αυτή η κράτηση είναι ${booking.status}. Επικοινωνήστε με την Athens Car Rental για βοήθεια.` : `This reservation is ${booking.status}. Please contact Athens Car Rental for help.`}
        </p>
      )}
      {isPayable && (
        <section className="mt-7">
          <StepHeading number="3">{isGreek ? 'Ασφαλής πληρωμή' : 'Pay securely'}</StepHeading>
          {!canPay && <p className="mt-4 rounded-xl bg-[#FEF3C7] p-4 text-sm text-[#111111]">{isGreek ? 'Το γραφείο δεν έχει ορίσει ακόμη την προκαταβολή για αυτή την κράτηση.' : 'The agency has not set the deposit amount for this reservation yet.'}</p>}
          {canPay && (
            <>
              <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#5F5B53]">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2" />
                <span>{isGreek ? 'Αποδέχομαι τους ' : 'I accept the '}<a href="/rental-conditions" className="font-semibold underline decoration-[#FACC15] decoration-2 underline-offset-4">{isGreek ? 'όρους ενοικίασης' : 'rental conditions'}</a> {isGreek ? 'και την ' : 'and the '}<a href="/faq" className="font-semibold underline decoration-[#FACC15] decoration-2 underline-offset-4">{isGreek ? 'πολιτική ακύρωσης' : 'cancellation policy'}</a>.</span>
              </label>
              {error && <p className="mt-3 text-sm font-medium text-red-700" role="alert" aria-live="polite">{error}</p>}
              <button type="button" onClick={pay} disabled={!accepted || busy} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-5 py-3 font-extrabold text-[#111111] transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                <Lock width={20} height={20} className="h-5 w-5 shrink-0" aria-hidden="true" />
                {busy
                  ? isGreek ? 'Σύνδεση με τη Stripe…' : 'Connecting to Stripe…'
                  : isGreek ? `Πληρωμή €${formatAmount(booking.depositAmountCents)}` : `Pay €${formatAmount(booking.depositAmountCents)}`}
              </button>
            </>
          )}
        </section>
      )}
    </section>
  )
}

function PaymentResult({ kind, lang }) {
  const isGreek = lang === 'el'
  const reference = new URLSearchParams(window.location.search).get('ref') || ''
  const [status, setStatus] = useState(kind === 'cancel' ? 'cancelled' : reference ? 'checking' : 'invalid')
  const [pickupLocation, setPickupLocation] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (kind !== 'success' || !reference) return undefined
    let active = true
    let attempts = 0
    let timeoutId
    const retry = () => {
      if (attempts >= 15) return
      attempts += 1
      timeoutId = window.setTimeout(poll, 2000)
    }
    const poll = async () => {
      try {
        const result = await getCheckoutStatus(reference)
        if (!active) return
        setError('')
        setStatus(result.status)
        setPickupLocation(result.pickupLocation || '')
        if (result.status !== 'paid') retry()
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Payment status is not available yet.')
          retry()
        }
      }
    }
    void poll()
    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [kind, reference])

  const paid = status === 'paid'
  return (
    <main className={`${pageContainer} py-12 sm:py-16`}>
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-[#FACC15] bg-white p-6 text-center shadow-xl sm:p-10">
        {kind === 'success' && status === 'checking' && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#FACC15] border-t-transparent" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-extrabold">{isGreek ? 'Επαλήθευση πληρωμής' : 'Verifying your payment'}</h1>
            <p className="mt-2 text-[#5F5B53]">{isGreek ? 'Αυτό μπορεί να διαρκέσει λίγα λεπτά όσο η Stripe επιβεβαιώνει την πληρωμή σας.' : 'This may take a few moments while Stripe confirms your payment.'}</p>
          </>
        )}
        {kind === 'success' && paid && (
          <>
            <CheckCircle2 width={48} height={48} className="mx-auto h-12 w-12 text-green-700" aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-extrabold">{isGreek ? 'Η πληρωμή επιβεβαιώθηκε' : 'Payment confirmed'}</h1>
            <p className="mt-3 text-[#5F5B53]">{isGreek ? 'Η προκαταβολή σας καταβλήθηκε.' : 'Your deposit has been received.'}</p>
            {reference && <p className="mt-4 font-bold">{isGreek ? 'Κωδικός αναφοράς' : 'Reference'}: {reference}</p>}
            {pickupLocation && <p className="mt-2 flex items-center justify-center gap-2 text-sm"><MapPin width={18} height={18} className="h-5 w-5 shrink-0" aria-hidden="true" />{isGreek ? 'Παραλαβή:' : 'Pick-up:'} {pickupLocation}</p>}
          </>
        )}
        {kind === 'success' && !paid && status !== 'checking' && (
          <>
            <h1 className="text-3xl font-extrabold">
              {status === 'invalid'
                ? isGreek ? 'Λείπει ο κωδικός πληρωμής' : 'Payment reference missing'
                : ['expired', 'cancelled'].includes(status)
                  ? isGreek ? 'Η πληρωμή δεν ολοκληρώθηκε' : 'Payment not completed'
                  : isGreek ? 'Η πληρωμή επιβεβαιώνεται' : 'Payment is being confirmed'}
            </h1>
            <p className="mt-3 text-[#5F5B53]">
              {status === 'invalid'
                ? isGreek ? 'Δεν βρέθηκε κωδικός κράτησης κατά την επιστροφή από την πληρωμή.' : 'We could not find a reservation reference in this payment return.'
                : ['expired', 'cancelled'].includes(status)
                  ? isGreek ? 'Αυτή η συνεδρία πληρωμής δεν είναι πλέον ενεργή. Επικοινωνήστε με την Athens Car Rental για βοήθεια.' : 'This payment session is no longer active. Please contact Athens Car Rental for help.'
                  : isGreek ? 'Ο πάροχος πληρωμών δεν έχει επιβεβαιώσει ακόμη την πληρωμή. Ελέγξτε ξανά σύντομα.' : 'The payment provider has not confirmed the payment yet. Please check again shortly.'}
            </p>
            {reference && <p className="mt-4 font-bold">{isGreek ? 'Κωδικός αναφοράς' : 'Reference'}: {reference}</p>}
          </>
        )}
        {(kind === 'cancel' || ['expired', 'cancelled'].includes(status)) && (
          <>
            <h1 className="text-3xl font-extrabold">{isGreek ? 'Η πληρωμή ακυρώθηκε' : 'Payment cancelled'}</h1>
            <p className="mt-3 text-[#5F5B53]">{isGreek ? 'Η κράτησή σας δεν έχει καταχωριστεί ως πληρωμένη. Μπορείτε να δοκιμάσετε ξανά όποτε θέλετε.' : 'Your reservation has not been marked as paid. You can try again when ready.'}</p>
          </>
        )}
        {error && <p className="mt-4 text-sm text-red-700" role="status">{error}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {kind === 'cancel' && (
            <a href={`/pay?ref=${encodeURIComponent(reference)}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FACC15] px-6 py-3 font-bold text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2">
              <ArrowLeft width={20} height={20} className="mr-2 h-5 w-5 shrink-0" aria-hidden="true" />
              {isGreek ? 'Δοκιμάστε ξανά' : 'Try again'}
            </a>
          )}
          <a href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#111111] px-6 py-3 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2">
            {isGreek ? 'Επιστροφή στην αρχική' : 'Back to home'}
          </a>
        </div>
      </div>
    </main>
  )
}

export function SecurePaymentPage({ route = 'payment', reservationNotice, lang = 'en' }) {
  const isGreek = lang === 'el'
  const [booking, setBooking] = useState(null)
  const [bookingEmail, setBookingEmail] = useState('')
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentInfoError, setPaymentInfoError] = useState('')
  const prefilledReference = new URLSearchParams(window.location.search).get('ref') || ''

  useEffect(() => {
    const oldTitle = document.title
    document.title = `${isGreek ? 'Ασφαλής πληρωμή' : 'Secure Payment'} | Athens Car Rental`
    return () => { document.title = oldTitle }
  }, [isGreek])

  useEffect(() => {
    if (!prefilledReference) return undefined
    let active = true
    getReservationPaymentInfo(prefilledReference)
      .then(async (info) => {
        if (!active) return
        setPaymentInfo(info)
        setBookingEmail(info.email)
        const found = await getBooking(info.reservationReference, info.email)
        if (!active) return
        setBooking(found)
      })
      .catch(() => {
        if (active) setPaymentInfoError(isGreek
          ? 'Δεν ήταν δυνατή η φόρτωση της κράτησης. Μπορείτε να την αναζητήσετε παρακάτω.'
          : 'We could not load this reservation. You can find it manually below.')
      })
    return () => { active = false }
  }, [prefilledReference, isGreek])

  if (route === 'payment-success' || route === 'payment-cancel') {
    return <PaymentResult kind={route === 'payment-success' ? 'success' : 'cancel'} lang={lang} />
  }

  return (
    <>
      <PaymentHero lang={lang} />
      <main className={`${pageContainer} mt-[76px] pb-20`}>
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl border-2 border-[#FACC15] bg-white p-5 shadow-lg sm:p-8 lg:col-span-8">
            <StepHeading number="1">{isGreek ? 'Βρείτε την κράτησή σας' : 'Find your reservation'}</StepHeading>
            <ReservationLookup
              key={`${prefilledReference}:${paymentInfo?.email || ''}`}
              initialReference={prefilledReference}
              initialEmail={paymentInfo?.email || ''}
              lang={lang}
              onFound={async (result, email) => {
                setBooking(result)
                setBookingEmail(email)
                try {
                  setPaymentInfo(await getReservationPaymentInfo(result.reference))
                  setPaymentInfoError('')
                } catch {
                  setPaymentInfo(null)
                }
              }}
            />
            {reservationNotice?.reference === prefilledReference && reservationNotice.emailSent === false && (
              <p className="mt-4 rounded-xl bg-[#FEF3C7] p-4 text-sm text-[#111111]" role="alert">
                {isGreek ? 'Δεν ήταν δυνατή η αποστολή email επιβεβαίωσης. Επικοινωνήστε μαζί μας.' : 'We could not send the confirmation e-mail, please contact us'}
              </p>
            )}
            {paymentInfoError && <p className="mt-4 text-sm text-[#5F5B53]" role="status">{paymentInfoError}</p>}
            <PaymentPrefillDetails info={paymentInfo} lang={lang} />
            {booking && <ReservationDetails booking={booking} email={bookingEmail} lang={lang} />}
          </section>

          <aside className="lg:sticky lg:top-6 lg:col-span-4">
            <section className="rounded-3xl bg-[#111111] p-6 text-white shadow-xl">
              <h2 className="text-xl font-extrabold">{isGreek ? 'Η κράτησή σας' : 'Your booking'}</h2>
              {booking
                ? <BookingSummary booking={booking} lang={lang} />
                : <p className="mt-4 text-sm text-white/70">{isGreek ? 'Η σύνοψη της κράτησης θα εμφανιστεί εδώ αφού εντοπίσετε την κράτησή σας.' : 'Your reservation summary will appear here after you find your booking.'}</p>}
            </section>
            <SecurePaymentDetails lang={lang} />
          </aside>
        </div>
      </main>
    </>
  )
}

import { useState } from 'react'
import './PaymentPages.css'

const paymentMethods = [
  'VISA',
  'Mastercard ID Check',
  'Maestro',
  'Discover',
  'Diners Club',
  'Verified by Visa',
  'Alpha e-Commerce',
  'Alpha Bank',
]

function PaymentIcon({ name }) {
  const paths = {
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" />,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    address: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /><path d="M9 9h.01M15 9h.01" /></>,
    reservation: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 17h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spinner: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function PaymentField({ id, label, value, onChange, type = 'text', helper, min, step }) {
  return (
    <div className="payment-field">
      <label htmlFor={id}>{label}</label>
      <div className={`payment-input-wrap${id === 'payment-amount' ? ' has-currency' : ''}`}>
        {id === 'payment-amount' && <span className="payment-currency" aria-hidden="true">€</span>}
        <input
          id={id}
          type={type}
          value={value}
          min={min}
          step={step}
          readOnly={!onChange}
          aria-describedby={helper ? `${id}-help` : undefined}
          onChange={onChange}
        />
      </div>
      {helper && <span id={`${id}-help`} className="payment-field-helper">{helper}</span>}
    </div>
  )
}

function PaymentSection({ icon, title, children }) {
  return (
    <section className="payment-section-card">
      <header className="payment-section-heading">
        <span><PaymentIcon name={icon} /></span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}

function PaymentFooter() {
  return (
    <footer className="payment-footer">
      <div className="payment-footer-main">
        <section className="payment-footer-company">
          <h2>Athens Car Rental - ACR</h2>
          <p>3rd km Markopoulou Avenue - Paiania, (Koropi, PC 19400)</p>
          <p>Tel: <a href="tel:+302106022220">+30 2106022220</a>, <a href="tel:+302106624887">+30 210 6624887</a></p>
          <p>E-mail: <a href="mailto:info@acr.gr">info@acr.gr</a></p>
        </section>
        <section className="payment-footer-brand" aria-label="Payment provider">
          <h2>Alpha e-Commerce</h2>
          <span className="payment-footer-brand-pill">Alpha Bank</span>
          <p>Secure online payments</p>
        </section>
        <nav className="payment-footer-links" aria-label="Useful links">
          <h2>Useful links</h2>
          <a href="/rental-conditions">Rental Conditions</a>
          <a href="/rental-conditions">Terms of Service</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact us</a>
        </nav>
      </div>
      <div className="payment-footer-bottom">
        <p>Copyright © 2026 | <a href="https://www.athens-carrental.com">https://www.athens-carrental.com</a></p>
        <p>Powered by <a href="https://internetmarketing.gr">InternetMarketing.gr</a></p>
      </div>
    </footer>
  )
}

export function PaymentPages({ lang = 'en', loading, error, api }) {
  const [form, setForm] = useState(() => ({
    firstName: '',
    lastName: '',
    email: '',
    amount: '100',
    reservationReference: new URLSearchParams(window.location.search).get('ref') || '',
    deliveryDate: '',
    notes: '',
    acceptedTerms: false,
  }))
  const [statusText, setStatusText] = useState('')
  const [paymentResult, setPaymentResult] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.acceptedTerms) return
    setIsSubmitting(true)
    try {
      const result = await api.initPayment({
        ...form,
        country: 'GR',
        state: 'Athens',
        city: 'Athens',
        zipcode: '10431',
        address: 'ACR Office',
        mobile: '306912345678',
        acceptedTerms: true,
        recaptchaToken: 'demo-token',
      }, lang)
      setPaymentResult(result.data || null)
      setStatusText('Payment flow started.')
      if (result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl
      } else {
        setIsSubmitting(false)
      }
    } catch (err) {
      setStatusText(err.message || 'Payment could not be initiated.')
      setIsSubmitting(false)
    }
  }

  const amountValue = Number(form.amount)
  const summaryAmount = Number.isFinite(amountValue) && form.amount !== ''
    ? `${amountValue.toFixed(2)} €`
    : '—'

  return (
    <div className="payment-page">
      <section className="payment-hero">
        <div className="payment-hero-inner">
          <nav className="payment-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Secure Payment</span>
          </nav>
          <div className="payment-hero-copy">
            <p className="payment-eyebrow">ATHENS CAR RENTAL</p>
            <h1><span>Secure</span> <strong>Payment</strong></h1>
            <p className="payment-hero-subtitle">Pay your deposit safely through Alpha Bank&apos;s secure payment platform.</p>
            <p className="payment-security-badge"><PaymentIcon name="lock" />100% secure transaction (SSL 128bit)</p>
          </div>
        </div>
      </section>

      <div className="payment-main">

        <ol className="payment-steps" aria-label="Payment steps">
          <li className="is-complete"><span>1</span>Your details</li>
          <li className="is-complete"><span>2</span>Reservation</li>
          <li className="is-active" aria-current="step"><span>3</span>Payment</li>
        </ol>

        {loading && <div className="state-box">Loading payment form…</div>}
        {error && !loading && <div className="state-box error">{error}</div>}

        {!loading && !error && (
          <div className="payment-content">
            <form onSubmit={handleSubmit} className="payment-form">
              <div className="payment-form-sections">
                <PaymentSection icon="user" title="Personal details">
                  <div className="payment-field-grid">
                    <PaymentField
                      id="payment-first-name"
                      label="First name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                    <PaymentField
                      id="payment-last-name"
                      label="Last name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                    <PaymentField
                      id="payment-email"
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </PaymentSection>

                <PaymentSection icon="address" title="Address">
                  <p className="payment-address-note">Address details included with your payment request</p>
                  <div className="payment-field-grid payment-address-grid">
                    <PaymentField id="payment-country" label="Country" value="Greece" />
                    <PaymentField id="payment-state" label="State" value="Athens" />
                    <PaymentField id="payment-city" label="City" value="Athens" />
                    <PaymentField id="payment-zipcode" label="Zipcode" value="10431" />
                    <PaymentField id="payment-address" label="Address" value="ACR Office" />
                  </div>
                </PaymentSection>

                <PaymentSection icon="reservation" title="Reservation details">
                  <div className="payment-field-grid">
                    <PaymentField
                      id="payment-amount"
                      label="Amount (€)"
                      type="number"
                      min="50"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                    <PaymentField
                      id="payment-reservation-reference"
                      label="Reservation reference"
                      helper="As indicated on the email's subject of our quote. Example: 0203AC"
                      value={form.reservationReference}
                      onChange={(e) => setForm({ ...form, reservationReference: e.target.value })}
                    />
                    <PaymentField
                      id="payment-delivery-date"
                      label="Delivery date"
                      helper="Enter date as d/m/Y"
                      value={form.deliveryDate}
                      onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    />
                    <div className="payment-field payment-field-full">
                      <label htmlFor="payment-notes">Notes</label>
                      <textarea
                        id="payment-notes"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </PaymentSection>

                <div className="payment-info-sections">
                  <section className="payment-info-card">
                    <h2>Secure Payment</h2>
                    <div>
                      <p>Payment is initiated through the configured payment provider. If a hosted checkout is available, you will be redirected there to complete the transaction.</p>
                      <p>This website does not collect or store card details. Enter card information only on the payment provider’s secure checkout page.</p>
                      <p>Please confirm that you have read and agree to the Rental Conditions before proceeding.</p>
                    </div>
                  </section>
                  <section className="payment-info-card">
                    <h2>Terms and Conditions</h2>
                    <div>
                      <p>Your payment request is sent securely to the configured payment service. Payment methods and any card verification process are handled by the provider.</p>
                      <p>Athens Car Rental does not collect or store card numbers, security codes or other card data on this website. Do not enter card information into the payment form.</p>
                      <p>For the rental terms, please review our <a href="/rental-conditions">Rental Conditions</a>.</p>
                    </div>
                  </section>
                  <section className="payment-info-card">
                    <h2>Cancellation Policy</h2>
                    <div>
                      <p>You can cancel your reservation <strong className="payment-key-figure">7 days</strong> before the pick up date and in that case there is no cancellation fee. For late cancelations later than <strong className="payment-key-figure">7 days</strong> before your pick-up date, your deposit amount is not refundable.</p>
                      <a href="/rental-conditions">Read our detailed Terms &amp; Conditions</a>
                    </div>
                  </section>
                </div>
              </div>

              <aside className="payment-summary">
                <p className="payment-summary-eyebrow">REVIEW BEFORE CONTINUING</p>
                <h2>Payment summary</h2>
                <dl className="payment-summary-list">
                  <div><dt>Amount</dt><dd>{summaryAmount}</dd></div>
                  <div><dt>Reservation No.</dt><dd>{form.reservationReference || '—'}</dd></div>
                  <div><dt>Delivery date</dt><dd>{form.deliveryDate || '—'}</dd></div>
                </dl>

                <label className="payment-terms-check" htmlFor="payment-accepted-terms">
                  <input
                    id="payment-accepted-terms"
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) => setForm({ ...form, acceptedTerms: e.target.checked })}
                  />
                  <span>
                    Check here to indicate that you have read and agree to the{' '}
                    <a href="/rental-conditions">Rental Conditions</a> and{' '}
                    <a href="/rental-conditions">Terms of Service</a>
                  </span>
                </label>

                <div className="payment-submit-actions">
                  <button
                    className="payment-submit payment-submit-outline"
                    type="submit"
                    disabled={!form.acceptedTerms || isSubmitting}
                  >
                    {isSubmitting ? <PaymentIcon name="spinner" /> : null}
                    Pay with MasterPass
                  </button>
                  <button
                    className="payment-submit payment-submit-primary"
                    type="submit"
                    disabled={!form.acceptedTerms || isSubmitting}
                  >
                    {isSubmitting ? <PaymentIcon name="spinner" /> : <PaymentIcon name="lock" />}
                    Pay with Credit Card / Debit card
                  </button>
                </div>

                {statusText && <p className="payment-status" role="status">{statusText}</p>}
                {paymentResult && !paymentResult.redirectUrl && (
                  <pre className="payment-result">{JSON.stringify(paymentResult, null, 2)}</pre>
                )}

                <div className="payment-methods">
                  <p>Payment brand references</p>
                  <div>
                    {paymentMethods.map((method) => <span key={method}>{method}</span>)}
                  </div>
                </div>
              </aside>
            </form>
          </div>
        )}
      </div>

      <PaymentFooter />
    </div>
  )
}

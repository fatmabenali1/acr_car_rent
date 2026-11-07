import { useEffect, useState } from 'react'

export function PaymentPages({ lang = 'en', loading, error, api }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    amount: '100',
    reservationReference: '',
    deliveryDate: '',
    notes: '',
    acceptedTerms: false,
  })
  const [statusText, setStatusText] = useState('')
  const [paymentResult, setPaymentResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
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
      }
    } catch (err) {
      setStatusText(err.message || 'Payment could not be initiated.')
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setForm((current) => ({ ...current, reservationReference: ref }))
    }
  }, [])

  return (
    <section className="page page-payment">
      {loading && <div className="state-box">Loading payment form…</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <form onSubmit={handleSubmit} className="payment-form">
          <div className="field-row">
            <label>
              First name
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </label>
            <label>
              Last name
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Amount (€)
              <input type="number" min="50" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label>
              Reservation reference
              <input value={form.reservationReference} onChange={(e) => setForm({ ...form, reservationReference: e.target.value })} />
            </label>
            <label>
              Delivery date
              <input type="text" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
            </label>
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => setForm({ ...form, acceptedTerms: e.target.checked })} />
            I accept the rental terms.
          </label>

          <button type="submit">Pay deposit</button>
          {statusText && <div className="status-box">{statusText}</div>}
          {paymentResult && <pre>{JSON.stringify(paymentResult, null, 2)}</pre>}
        </form>
      )}
    </section>
  )
}

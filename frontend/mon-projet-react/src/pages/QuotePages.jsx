import { useMemo, useState } from 'react'

export function QuotePages({ locations = [], extras = [], vehicles = [], lang = 'en', loading, error, fallbackImage, api }) {
  const [quoteState, setQuoteState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    notes: '',
  })
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedPickup, setSelectedPickup] = useState('')
  const [selectedReturn, setSelectedReturn] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const vehicleOptions = useMemo(() => vehicles || [], [vehicles])

  async function onEstimate() {
    if (!selectedVehicle || !selectedPickup || !selectedReturn) return
    try {
      const result = await api.getPricingEstimate({
        vehicleSlug: selectedVehicle,
        pickupLocationSlug: selectedPickup,
        returnLocationSlug: selectedReturn,
        pickupAt: new Date(Date.now() + 86400000).toISOString(),
        returnAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        extras: [],
      }, lang)
      setEstimate(result.data || null)
      setStatusMessage('Estimate received.')
    } catch (err) {
      setStatusMessage(err.message || 'Unable to estimate price.')
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    try {
      const payload = {
        vehicleSlug: selectedVehicle,
        pickupLocationSlug: selectedPickup,
        returnLocationSlug: selectedReturn,
        pickupAt: new Date(Date.now() + 86400000).toISOString(),
        returnAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        customer: {
          firstName: quoteState.firstName,
          lastName: quoteState.lastName,
          email: quoteState.email,
          phone: quoteState.phone,
          country: quoteState.country,
        },
        driver: {
          age: 30,
          licenceYears: 5,
          countryCode: 'GR',
          hasInternationalPermit: false,
        },
        additionalDrivers: [],
        extras: extras.map((extra) => ({ extraId: extra.id, quantity: 1 })).slice(0, 1),
        language: lang,
        recaptchaToken: 'demo-token',
      }
      const result = await api.createQuote(payload, lang)
      setStatusMessage(result?.data?.reference ? `Quote created: ${result.data.reference}` : 'Quote created.')
    } catch (err) {
      setStatusMessage(err.message || 'Could not create quote.')
    }
  }

  return (
    <section className="page page-quote">
      {loading && <div className="state-box">Loading quote form…</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <form onSubmit={onSubmit} className="quote-form">
          <div className="field-row">
            <label>
              Vehicle
              <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                <option value="">Select vehicle</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id || vehicle.slug} value={vehicle.slug}>{vehicle.name || vehicle.slug}</option>
                ))}
              </select>
            </label>
            <label>
              Pickup location
              <select value={selectedPickup} onChange={(e) => setSelectedPickup(e.target.value)}>
                <option value="">Select pickup</option>
                {locations.map((location) => (
                  <option key={location.id || location.slug} value={location.slug}>{location.name || location.slug}</option>
                ))}
              </select>
            </label>
            <label>
              Return location
              <select value={selectedReturn} onChange={(e) => setSelectedReturn(e.target.value)}>
                <option value="">Select return</option>
                {locations.map((location) => (
                  <option key={location.id || location.slug} value={location.slug}>{location.name || location.slug}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label>
              First name
              <input value={quoteState.firstName} onChange={(e) => setQuoteState({ ...quoteState, firstName: e.target.value })} />
            </label>
            <label>
              Last name
              <input value={quoteState.lastName} onChange={(e) => setQuoteState({ ...quoteState, lastName: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label>
              Email
              <input type="email" value={quoteState.email} onChange={(e) => setQuoteState({ ...quoteState, email: e.target.value })} />
            </label>
            <label>
              Phone
              <input value={quoteState.phone} onChange={(e) => setQuoteState({ ...quoteState, phone: e.target.value })} />
            </label>
          </div>

          <div className="field-row">
            <label>
              Country
              <input value={quoteState.country} onChange={(e) => setQuoteState({ ...quoteState, country: e.target.value })} />
            </label>
            <label>
              Notes
              <textarea value={quoteState.notes} onChange={(e) => setQuoteState({ ...quoteState, notes: e.target.value })} />
            </label>
          </div>

          <div className="quote-actions">
            <button type="button" onClick={onEstimate}>Estimate</button>
            <button type="submit">Submit quote</button>
          </div>

          {estimate && (
            <div className="estimate-box">
              <h3>Estimated total</h3>
              <p>{estimate.totalEur ?? estimate.total ?? 'N/A'}</p>
            </div>
          )}

          {statusMessage && <div className="status-box">{statusMessage}</div>}
        </form>
      )}
    </section>
  )
}

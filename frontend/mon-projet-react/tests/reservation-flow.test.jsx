import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuotePages } from '../src/pages/QuotePages'

const checkoutApi = vi.hoisted(() => ({
  createBooking: vi.fn(),
  getBooking: vi.fn(),
  getReservationPaymentInfo: vi.fn(),
  createCheckout: vi.fn(),
  getCheckoutStatus: vi.fn(),
}));

vi.mock('../src/api/checkout', () => checkoutApi)
vi.mock('../src/data/categories', () => ({ categories: [] }))

import { SecurePaymentPage } from '../src/pages/SecurePaymentPage'

const vehicle = {
  id: 'vehicle-d1',
  code: 'D1',
  slug: 'standard-d1',
  name: 'Category D1',
  example: 'Skoda Scala',
}

function renderQuotePage(apiOverrides = {}, onReservationCreated = vi.fn()) {
  const api = {
    createBooking: checkoutApi.createBooking,
    getPricingEstimate: vi.fn(),
    ...apiOverrides,
  }
  return {
    api,
    onReservationCreated,
    ...render(
      <QuotePages
        locations={[{ slug: 'athens-international-airport', name: 'Athens Airport' }]}
        vehicles={[vehicle]}
        lang="en"
        api={api}
        onReservationCreated={onReservationCreated}
      />,
    ),
  }
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Vehicle category'), { target: { value: vehicle.slug } })
  fireEvent.change(screen.getByLabelText('Pick-up location'), { target: { value: 'Athens Airport' } })
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Fictional' } })
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Customer' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fictional@example.invalid' } })
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '+302100000000' } })
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'Greece' } })
}

describe('reservation and payment prefill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/quote')
  })

  it('renders the quote request form in Greek when Greek is selected', () => {
    render(
      <QuotePages
        locations={[{ slug: 'athens-international-airport', name: 'Διεθνής Αερολιμένας Αθηνών' }]}
        vehicles={[vehicle]}
        lang="el"
        api={{ createBooking: vi.fn(), getPricingEstimate: vi.fn() }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Ζητήστε προσφορά' })).toBeTruthy()
    expect(screen.getByLabelText('Κατηγορία οχήματος')).toBeTruthy()
    expect(screen.getByLabelText('Τοποθεσία παραλαβής')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Τα στοιχεία σας' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Υποβολή αιτήματος/ }).length).toBeGreaterThan(0)
  })

  it('requires personal-data consent before submitting the reservation', async () => {
    const { container, api } = renderQuotePage()
    fillRequiredFields()

    fireEvent.submit(container.querySelector('#quote-request-form'))

    expect(await screen.findByText('Please accept personal data processing.')).toBeTruthy()
    expect(api.createBooking).not.toHaveBeenCalled()
  })

  it('submits server-priced booking details, shows demo pricing, and navigates with only the reference', async () => {
    const navigate = vi.fn()
    checkoutApi.createBooking.mockResolvedValue({
      reservationNumber: '0203AC',
      total: 50,
      deposit: 50,
      currency: 'EUR',
      emailSent: false,
      demoPrices: true,
    })
    const { api, container } = renderQuotePage({}, navigate)
    expect(screen.getByText('Demo prices')).toBeTruthy()
    fillRequiredFields()
    fireEvent.click(screen.getByLabelText(/I accept the processing of my personal data/))
    fireEvent.submit(container.querySelector('#quote-request-form'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      reference: '0203AC',
      total: 50,
      deposit: 50,
      emailSent: false,
    })))
    const [payload] = api.createBooking.mock.calls[0]
    expect(payload.carId).toBe('D1')
    expect(payload.privacyAccepted).toBe(true)
    expect(payload.amount).toBeUndefined()
    expect(payload.total).toBeUndefined()
  })

  it('loads reservation details from ref and pre-fills locked payment fields', async () => {
    window.history.replaceState({}, '', '/pay?ref=0203AC')
    checkoutApi.getReservationPaymentInfo.mockResolvedValue({
      firstName: 'Fictional',
      lastName: 'Customer',
      email: 'fictional@example.invalid',
      country: 'GR',
      mobile: '+302100000000',
      reservationReference: '0203AC',
      deliveryDate: '19/11/2026',
      notes: 'No special requests',
      amount: 50,
      currency: 'EUR',
    })
    checkoutApi.getBooking.mockResolvedValue({
      reference: '0203AC',
      status: 'pending_payment',
      categoryName: 'Category D1',
      pickupAt: '2026-11-19T09:00:00.000Z',
      dropoffAt: '2026-11-21T09:00:00.000Z',
      totalAmountCents: 5000,
      depositAmountCents: 5000,
      currency: 'eur',
    })
    render(<SecurePaymentPage />)

    const amount = await screen.findByLabelText('Amount in Euros')
    expect(amount.value).toBe('50.00')
    expect(amount.hasAttribute('readonly')).toBe(true)
    expect((await screen.findByLabelText('First Name')).value).toBe('Fictional')
    expect((await screen.findByLabelText('Reservation Request Number')).value).toBe('0203AC')
    expect((await screen.findByLabelText('Delivery Date')).value).toBe('19/11/2026')
    expect(checkoutApi.getReservationPaymentInfo).toHaveBeenCalledWith('0203AC')
    expect(checkoutApi.getBooking).toHaveBeenCalledWith('0203AC', 'fictional@example.invalid')
  })

  it('sends one checkout request for repeated clicks and shows the customer-safe 503 message', async () => {
    window.history.replaceState({}, '', '/pay?ref=0203AC')
    checkoutApi.getReservationPaymentInfo.mockResolvedValue({
      firstName: 'Fictional',
      lastName: 'Customer',
      email: 'fictional@example.invalid',
      country: 'GR',
      mobile: '+302100000000',
      reservationReference: '0203AC',
      deliveryDate: '19/11/2026',
      amount: 50,
    })
    checkoutApi.getBooking.mockResolvedValue({
      reference: '0203AC',
      status: 'pending_payment',
      categoryName: 'Category D1',
      pickupAt: '2026-11-19T09:00:00.000Z',
      dropoffAt: '2026-11-21T09:00:00.000Z',
      totalAmountCents: 5000,
      depositAmountCents: 5000,
      currency: 'eur',
    })
    let rejectCheckout
    checkoutApi.createCheckout.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectCheckout = reject
    }))
    render(<SecurePaymentPage />)

    const payButton = await screen.findByRole('button', { name: 'Pay €50.00' })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(payButton)
    fireEvent.click(payButton)
    expect(checkoutApi.createCheckout).toHaveBeenCalledTimes(1)
    expect(payButton.disabled).toBe(true)

    rejectCheckout(Object.assign(new Error('payment_not_configured'), { status: 503 }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Online payment is temporarily unavailable. Please contact us on +30 210 6022220 or info@athenscarrental.com.',
    )
    expect(checkoutApi.createCheckout).toHaveBeenCalledTimes(1)
  })

  it.each([
    [400, 'We could not verify the payment request. Please check your reservation details.'],
    [404, 'We could not find this reservation. Please check your reference and email address.'],
    [429, 'Too many payment attempts. Please wait a moment before trying again.'],
    [500, 'We could not start your payment due to a temporary error. Please try again later.'],
  ])('shows a clear customer message for HTTP %i', async (status, message) => {
    window.history.replaceState({}, '', '/pay?ref=0203AC')
    checkoutApi.getReservationPaymentInfo.mockResolvedValue({
      firstName: 'Fictional',
      lastName: 'Customer',
      email: 'fictional@example.invalid',
      country: 'GR',
      mobile: '+302100000000',
      reservationReference: '0203AC',
      deliveryDate: '19/11/2026',
      amount: 50,
    })
    checkoutApi.getBooking.mockResolvedValue({
      reference: '0203AC',
      status: 'pending_payment',
      categoryName: 'Category D1',
      pickupAt: '2026-11-19T09:00:00.000Z',
      dropoffAt: '2026-11-21T09:00:00.000Z',
      totalAmountCents: 5000,
      depositAmountCents: 5000,
      currency: 'eur',
    })
    checkoutApi.createCheckout.mockRejectedValue(Object.assign(new Error('internal detail'), { status }))
    render(<SecurePaymentPage />)

    fireEvent.click(await screen.findByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Pay €50.00' }))

    expect((await screen.findByRole('alert')).textContent).toBe(message)
  })
})

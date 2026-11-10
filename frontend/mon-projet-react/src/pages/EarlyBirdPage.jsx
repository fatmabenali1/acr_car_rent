import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, CalendarX, Users } from 'lucide-react'
import { categories } from '../data/categories'
import { earlyBirdContent } from '../data/earlyBird'
import { VehicleCategoryCard } from './PricelistPage'

const filters = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'manual', label: 'Manual', matches: (category) => category.type === 'Manual' },
  { id: 'automatic', label: 'Automatic', matches: (category) => category.type === 'Automatic' },
  { id: 'luxury', label: 'Luxury', matches: (category) => category.type === 'Luxury' },
  { id: 'vans', label: 'Vans', matches: (category) => category.type === 'Van' },
  {
    id: '7-seats',
    label: '7+ seats',
    matches: (category) => Number.parseInt(category.specs?.seats, 10) >= 7,
  },
]

const benefits = [
  { label: 'Free cancellation up to 7 to 15 days before', Icon: CalendarX },
  { label: 'Free additional drivers', Icon: Users },
  { label: 'No hidden extras', Icon: BadgeCheck },
]

function getInitialFilter() {
  const requestedFilter = new URLSearchParams(window.location.search).get('filter')
  return filters.some(({ id }) => id === requestedFilter) ? requestedFilter : 'all'
}

export function EarlyBirdPage() {
  const [activeFilter, setActiveFilter] = useState(getInitialFilter)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Early Bird Discounts | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const visibleCategories = useMemo(() => {
    const filter = filters.find(({ id }) => id === activeFilter) ?? filters[0]
    return categories.filter(filter.matches)
  }, [activeFilter])

  const selectFilter = (filter) => {
    setActiveFilter(filter)
    const url = new URL(window.location.href)
    if (filter === 'all') url.searchParams.delete('filter')
    else url.searchParams.set('filter', filter)
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] pb-24 text-[#111111]">
      <section className="relative w-full bg-[#111111] py-10 text-white lg:py-14">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <a href="/" className="rounded-sm hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">Early Bird Discounts</span>
          </nav>
          <div className="mt-8">
            <span className="inline-flex rounded-full bg-[#FACC15] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#111111]">
              Early Bird
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Early Bird <span className="text-[#FACC15]">Discounts</span>
            </h1>
            <p className="mt-3 max-w-3xl text-base text-white/75 sm:text-lg">
              Book early and get our best prices.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mt-[76px]">
          <section className="rounded-3xl bg-white p-6 shadow-lg ring-2 ring-[#FACC15] lg:p-8" aria-labelledby="early-bird-how">
            <div className="max-w-3xl">
              <h2 id="early-bird-how" className="text-2xl font-extrabold text-[#111111]">{earlyBirdContent.title}</h2>
              <p className="mt-3 leading-relaxed text-slate-700">{earlyBirdContent.text}</p>
              {(earlyBirdContent.discountLabel || earlyBirdContent.validUntil || earlyBirdContent.conditions) && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
                  {earlyBirdContent.discountLabel && <p className="rounded-full bg-[#FEF3C7] px-4 py-2 font-semibold">{earlyBirdContent.discountLabel}</p>}
                  {earlyBirdContent.validUntil && <p className="rounded-full bg-[#FEF3C7] px-4 py-2 font-semibold">{earlyBirdContent.validUntil}</p>}
                  {earlyBirdContent.conditions && <p className="basis-full">{earlyBirdContent.conditions}</p>}
                </div>
              )}
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {benefits.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-sm font-bold text-[#111111]">
                  <Icon width={20} height={20} className="h-5 w-5 shrink-0" stroke="currentColor" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 rounded-3xl bg-white p-4 shadow-lg ring-2 ring-[#FACC15] lg:p-5" aria-label="Filter early bird vehicle categories">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="overflow-x-auto">
                <div className="flex min-w-max flex-nowrap gap-2">
                  {filters.map(({ id, label }) => {
                    const selected = id === activeFilter
                    const count = categories.filter((category) => filters.find((filter) => filter.id === id).matches(category)).length
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectFilter(id)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? 'bg-[#111111] text-[#FACC15]' : 'bg-[#F7F4EF] text-[#111111] ring-1 ring-black/10 hover:bg-[#FEF3C7]'}`}
                      >
                        {label}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-[#FACC15]/15' : 'bg-white'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="shrink-0 text-sm text-slate-600" aria-live="polite">
                {visibleCategories.length} {visibleCategories.length === 1 ? 'category' : 'categories'}
              </p>
            </div>
          </section>

          <section className="py-8 lg:py-10" aria-label="Vehicle categories">
            <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleCategories.map((category, index) => (
                <VehicleCategoryCard
                  key={category.slug}
                  category={category}
                  imageLoading={index < 4 ? 'eager' : 'lazy'}
                  earlyBird
                />
              ))}
            </div>
          </section>

          <section className="mb-10 rounded-3xl bg-[#111111] p-6 text-white ring-2 ring-[#FACC15] sm:p-8 lg:mb-14" aria-labelledby="early-bird-help">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <h2 id="early-bird-help" className="text-2xl font-extrabold sm:text-3xl">Not sure which category?</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="/booking"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FACC15] px-6 py-3 text-sm font-extrabold text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#EAB308] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  Request a quote
                </a>
                <a
                  href="tel:+302106022220"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#FACC15] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#FACC15] hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none"
                >
                  Call +30 210 6022220
                </a>
              </div>
            </div>
            <a href="mailto:info@athenscarrental.com" className="mt-4 inline-flex rounded-sm text-sm font-semibold text-[#FACC15] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]">
              info@athenscarrental.com
            </a>
          </section>
        </div>
      </main>
    </div>
  )
}

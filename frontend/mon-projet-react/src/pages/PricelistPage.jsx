import { useEffect, useMemo, useState } from 'react'
import { categories, categoryFilters } from '../data/categories'

const iconPaths = {
  'car-front': (
    <>
      <path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 11h18v7H3zM6 18v2m12-2v2M6 14h.01M18 14h.01" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="4" />
    </>
  ),
  'settings-2': (
    <>
      <path d="M20 7h-9m-4 0H4m16 10h-5m-4 0H4" strokeLinecap="round" />
      <circle cx="7" cy="7" r="3" />
      <circle cx="13" cy="17" r="3" />
    </>
  ),
  luggage: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2M8 11v6m4-6v6m4-6v6M7 21v1m10-1v1" strokeLinecap="round" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="m13 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

function CategoryIcon({ name, size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${size === 64 ? 'h-16 w-16' : size === 20 ? 'h-5 w-5' : 'h-4 w-4'} shrink-0 ${className}`}
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function CategoryImage({ category }) {
  const [failed, setFailed] = useState(!category.image)

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-300" aria-hidden="true">
        <CategoryIcon name="car-front" size={64} />
      </div>
    )
  }

  return (
    <img
      src={category.image}
      alt={`${category.model || category.name} rental vehicle`}
      width="640"
      height="480"
      loading="lazy"
      className="h-full w-full object-contain transition duration-500 group-hover:scale-105 motion-reduce:transition-none"
      onError={() => setFailed(true)}
    />
  )
}

export function VehicleCategoryCard({ category }) {
  return (
    <a
      href={`/fleet/${category.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F4EF] p-4">
        <CategoryImage category={category} />
        <span className="absolute left-4 top-4 rounded-full bg-[#111111] px-3 py-1 text-xs font-bold uppercase text-[#FACC15]">
          {category.type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-0 min-h-[3.5rem] text-lg font-extrabold uppercase leading-tight text-[#111111]">
          {category.name}
        </h2>
        {category.model && <p className="mt-1 text-sm text-slate-600">Example: {category.model} or similar</p>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {category.seats && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="users" />
              {category.seats} seats
            </span>
          )}
          {category.transmission && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="settings-2" />
              {category.transmission}
            </span>
          )}
          {category.luggage && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="luggage" />
              {category.luggage} bags
            </span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <p className="mb-3 text-sm font-semibold text-slate-600">{category.price}</p>
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2B2B2B]">
            View vehicle detail
            <CategoryIcon name="arrow-right" className="text-[#FACC15]" />
          </span>
        </div>
      </div>
    </a>
  )
}

export function PricelistPage() {
  const [activeFilter, setActiveFilter] = useState(() => {
    const filter = new URLSearchParams(window.location.search).get('filter')
    return categoryFilters.some(({ id }) => id === filter) ? filter : 'all'
  })
  const [gridVisible, setGridVisible] = useState(true)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Pricelist & Fleet | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [])

  const visibleCategories = useMemo(
    () => activeFilter === 'all'
      ? categories
      : categories.filter((category) => category.filters.includes(activeFilter)),
    [activeFilter],
  )

  const chooseFilter = (filter) => {
    setGridVisible(false)
    window.setTimeout(() => {
      setActiveFilter(filter)
      const url = new URL(window.location.href)
      if (filter === 'all') url.searchParams.delete('filter')
      else url.searchParams.set('filter', filter)
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
      window.requestAnimationFrame(() => setGridVisible(true))
    }, 100)
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] pb-24 text-[#111111]">
      <section className="relative isolate overflow-hidden bg-[#111111] pb-24 lg:pb-28">
        <img src="/images/image.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[75%_30%] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 pt-8 sm:px-6 lg:px-10 lg:pt-10 2xl:px-16">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <a href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">Pricelist &amp; Fleet</span>
          </nav>
          <h1 className="mt-4 text-3xl font-extrabold text-white lg:text-5xl">
            Pricelist &amp; <span className="text-[#FACC15]">Fleet</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/80 sm:text-base">
            Choose a category, compare vehicles and find the right car for your trip in Greece.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <section aria-label="Filter vehicle categories" className="relative z-10 -mt-10 rounded-3xl bg-white p-4 shadow-xl ring-2 ring-[#FACC15] lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="overflow-x-auto">
              <div className="flex min-w-max flex-nowrap gap-2">
                {categoryFilters.map(({ id, label }) => {
                  const selected = id === activeFilter
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseFilter(id)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? 'bg-[#111111] text-[#FACC15]' : 'bg-[#F7F4EF] text-[#111111] ring-1 ring-black/10 hover:bg-[#FEF3C7]'}`}
                    >
                      {label}
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

        <div
          className={`mt-8 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-300 motion-reduce:transition-none ${gridVisible ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          {visibleCategories.map((category) => <VehicleCategoryCard key={category.slug} category={category} />)}
        </div>
      </div>
    </div>
  )
}

export { CategoryIcon }

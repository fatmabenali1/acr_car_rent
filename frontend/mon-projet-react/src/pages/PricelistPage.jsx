import { useEffect, useMemo, useState } from 'react'
import {
  CarFront,
  CircleSlash,
  Disc3,
  DoorOpen,
  Fuel,
  Luggage,
  Settings2,
  ShieldCheck,
  Snowflake,
  Users,
} from 'lucide-react'
import { categories, categoryFilters } from '../data/categories'

const earlyBirdSpecItems = [
  { key: 'seats', label: 'Seats', icon: Users },
  { key: 'airBag', label: 'Air Bag', icon: ShieldCheck },
  { key: 'luggage', label: 'Luggage', icon: Luggage },
  { key: 'fuel', label: 'Fuel Type', icon: Fuel },
  { key: 'doors', label: 'Doors', icon: DoorOpen },
  { key: 'cdPlayer', label: 'CD Player', icon: Disc3 },
  { key: 'abs', label: 'ABS', icon: CircleSlash },
  { key: 'ac', label: 'A/C', icon: Snowflake },
  { key: 'gear', label: 'Gear', icon: Settings2 },
]

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

function CategoryImage({
  category,
  loading,
  fallbackSize = 48,
  exactAlt = false,
  fallbackBackground = 'bg-[#F7F4EF]',
  lucideFallback = false,
}) {
  const [failed, setFailed] = useState(!category.image)

  if (failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${fallbackBackground} text-slate-500`}>
        {lucideFallback ? (
          <CarFront
            width={fallbackSize}
            height={fallbackSize}
            className={`${fallbackSize === 64 ? 'h-16 w-16' : 'h-12 w-12'} shrink-0 text-slate-300`}
            stroke="currentColor"
            aria-hidden="true"
          />
        ) : (
          <CategoryIcon name="car-front" size={fallbackSize} className="text-slate-300" />
        )}
      </div>
    )
  }

  const imageAlt = exactAlt
    ? `${category.name} - ${category.example || ''}`
    : `${category.name} - ${category.example}, car rental Athens`

  return (
    <img
      src={category.image}
      alt={imageAlt}
      width="810"
      height="500"
      loading={loading}
      className="h-full w-full object-contain motion-reduce:transition-none"
      onError={() => {
        console.warn(`Unable to load vehicle category image for "${category.name}": ${category.image}`)
        setFailed(true)
      }}
    />
  )
}

export function VehicleCategoryCard({ category, imageLoading = 'lazy', earlyBird = false, lang = 'en' }) {
  const isGreek = lang === 'el'
  const vehicleType = isGreek
    ? ({ Manual: 'Χειροκίνητο', Automatic: 'Αυτόματο', Luxury: 'Πολυτελές', Van: 'Φορτηγάκι' }[category.type] || category.type)
    : category.type
  const specLabels = isGreek
    ? { seats: 'Θέσεις', airBag: 'Αερόσακος', luggage: 'Αποσκευές', fuel: 'Καύσιμο', doors: 'Πόρτες', cdPlayer: 'CD player', abs: 'ABS', ac: 'Κλιματισμός', gear: 'Κιβώτιο' }
    : { seats: 'Seats', airBag: 'Air Bag', luggage: 'Luggage', fuel: 'Fuel Type', doors: 'Doors', cdPlayer: 'CD Player', abs: 'ABS', ac: 'A/C', gear: 'Gear' }
  if (earlyBird) {
    return (
      <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white p-6 shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none">
        <div className="relative mt-4 aspect-[4/3] rounded-2xl bg-white">
          <CategoryImage category={category} loading={imageLoading} fallbackSize={64} exactAlt fallbackBackground="bg-white" lucideFallback />
          <span className="absolute left-3 top-3 rounded-full bg-[#111111] px-3 py-1 text-xs font-bold uppercase text-[#FACC15]">
            {vehicleType}
          </span>
        </div>
        <div className="flex flex-1 flex-col pt-5">
          <h3 className="text-xl font-extrabold text-[#111111]">{category.name}</h3>
          <p className="mt-1 min-h-[2.5rem] text-sm text-slate-600">{category.example || ''}</p>
          <div className="mt-5 grid grid-cols-2 gap-x-4">
            {earlyBirdSpecItems.map(({ key, label, icon: SpecIcon }) => {
              const value = category.specs?.[key]
              if (value === null || value === undefined || value === '') return null
              const itemLabel = key === 'luggage' && category.specs?.luggageLabel
                ? category.specs.luggageLabel
                : specLabels[key] || label
              return (
                <div key={key} className="flex items-center gap-3 border-b border-slate-200 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#111111]" aria-hidden="true">
                    <SpecIcon width={16} height={16} className="h-4 w-4 shrink-0" stroke="currentColor" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[#111111]">{itemLabel}</span>
                    <span className="block text-xs text-slate-700">{value}</span>
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-auto pt-6">
            <a
              href={`/booking?category=${encodeURIComponent(category.slug)}&source=early-bird`}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FACC15] font-extrabold text-[#111111] shadow-md transition hover:-translate-y-0.5 hover:bg-[#EAB308] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {isGreek ? 'Ζητήστε προσφορά' : 'Request a quote'}
            </a>
            <a
              href={`/fleet/${category.slug}`}
              className="mt-3 inline-flex w-full justify-center rounded-lg py-1 text-sm font-semibold text-[#111111] underline decoration-[#FACC15] decoration-2 underline-offset-4 hover:bg-[#FEF3C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              {isGreek ? 'Προβολή στοιχείων οχήματος' : 'View vehicle details'}
            </a>
          </div>
        </div>
      </article>
    )
  }

  return (
    <a
      href={`/fleet/${category.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F4EF]">
        <CategoryImage category={category} loading={imageLoading} />
        <span className="absolute left-4 top-4 rounded-full bg-[#111111] px-3 py-1 text-xs font-bold uppercase text-[#FACC15]">
          {vehicleType}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-0 min-h-[3.5rem] text-lg font-extrabold uppercase leading-tight text-[#111111]">
          {category.name}
        </h2>
        {category.example && <p className="mt-1 text-sm text-slate-600">{isGreek ? 'Ενδεικτικό μοντέλο:' : 'Example:'} {category.example}</p>}
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{isGreek ? (category.descriptionEl || category.description) : category.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {category.specs?.seats && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="users" />
              {category.specs.seats} {isGreek ? 'θέσεις' : ''}
            </span>
          )}
          {category.specs?.gear && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="settings-2" />
              {isGreek ? ({ Manual: 'Χειροκίνητο', Automatic: 'Αυτόματο' }[category.specs.gear] || category.specs.gear) : category.specs.gear}
            </span>
          )}
          {category.specs?.luggage && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon name="luggage" />
              {category.specs.luggage}
            </span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2B2B2B]">
            {isGreek ? 'Προβολή λεπτομερειών' : 'View details'}
            <CategoryIcon name="arrow-right" className="text-[#FACC15]" />
          </span>
        </div>
      </div>
    </a>
  )
}

export function PricelistPage({ lang = 'en' }) {
  const isGreek = lang === 'el'
  const [activeFilter, setActiveFilter] = useState(() => {
    const filter = new URLSearchParams(window.location.search).get('filter')
    return categoryFilters.some(({ id }) => id === filter) ? filter : 'all'
  })
  const [gridVisible, setGridVisible] = useState(true)

  useEffect(() => {
    const previousTitle = document.title
    document.title = isGreek ? 'Τιμοκατάλογος και Στόλος | Athens Car Rental' : 'Pricelist & Fleet | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [isGreek])

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
    <div className="min-h-screen bg-[#F7F4EF] pb-24 text-[#111111]" lang={lang}>
      <section className="relative isolate overflow-hidden bg-[#111111] pb-24 lg:pb-28">
        <img src="/images/image.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[75%_30%] opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-[1760px] px-4 pt-8 sm:px-6 lg:px-10 lg:pt-10 2xl:px-16">
          <nav aria-label={isGreek ? 'Διαδρομή πλοήγησης' : 'Breadcrumb'} className="text-sm text-white/70">
            <a href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">{isGreek ? 'Αρχική' : 'Home'}</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">{isGreek ? 'Τιμοκατάλογος και στόλος' : 'Pricelist &amp; Fleet'}</span>
          </nav>
          <h1 className="mt-4 text-3xl font-extrabold text-white lg:text-5xl">
            {isGreek ? 'Τιμοκατάλογος και ' : 'Pricelist &amp; '}<span className="text-[#FACC15]">{isGreek ? 'στόλος' : 'Fleet'}</span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/80 sm:text-base">
            {isGreek ? 'Επιλέξτε κατηγορία, συγκρίνετε οχήματα και βρείτε το κατάλληλο αυτοκίνητο για το ταξίδι σας στην Ελλάδα.' : 'Choose a category, compare vehicles and find the right car for your trip in Greece.'}
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <section aria-label={isGreek ? 'Φιλτράρισμα κατηγοριών οχημάτων' : 'Filter vehicle categories'} className="relative z-10 -mt-10 rounded-3xl bg-white p-4 shadow-xl ring-2 ring-[#FACC15] lg:p-5">
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
                      {isGreek ? ({
                        all: 'Όλες',
                        standard: 'Στάνταρ',
                        automatic: 'Αυτόματα',
                        minivans: 'Μίνι βαν',
                        minivanAutomatic: 'Αυτόματα μίνι βαν',
                        suv: 'SUV',
                        luxury: 'Πολυτελή',
                        vans: 'Φορτηγάκια',
                      }[id] || label) : label}
                    </button>
                  )
                })}
              </div>
            </div>
            <p className="shrink-0 text-sm text-slate-600" aria-live="polite">
              {visibleCategories.length} {isGreek ? (visibleCategories.length === 1 ? 'κατηγορία' : 'κατηγορίες') : (visibleCategories.length === 1 ? 'category' : 'categories')}
            </p>
          </div>
        </section>

        <div
          className={`mt-8 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-300 motion-reduce:transition-none ${gridVisible ? 'opacity-100' : 'opacity-0'}`}
          aria-live="polite"
        >
          {visibleCategories.map((category, index) => (
            <VehicleCategoryCard
              key={category.slug}
              category={category}
              imageLoading={index < 4 ? 'eager' : 'lazy'}
              lang={lang}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export { CategoryIcon }

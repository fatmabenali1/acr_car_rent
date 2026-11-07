import { useEffect, useRef, useState } from 'react'
import { categories } from '../data/categories'
import { VehicleCategoryCard } from './PricelistPage'

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
  'door-open': (
    <>
      <path d="M13 4h6v17h-6m0-17-8 2v13l8 2M9 12h.01" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  luggage: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2M8 11v6m4-6v6m4-6v6M7 21v1m10-1v1" strokeLinecap="round" />
    </>
  ),
  fuel: (
    <>
      <path d="M3 22V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v17M2 22h16M7 7h6v5H7zM17 8h2l2 2v7a2 2 0 0 1-4 0v-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'settings-2': (
    <>
      <path d="M20 7h-9m-4 0H4m16 10h-5m-4 0H4" strokeLinecap="round" />
      <circle cx="7" cy="7" r="3" />
      <circle cx="13" cy="17" r="3" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2v20m8.66-15-17.32 10m17.32 0L3.34 7" strokeLinecap="round" />
      <path d="m8 4 4 2 4-2m-8 16 4-2 4 2M4 10l.5-4L8 4m8 16 3.5-2 .5-4M4 14l.5 4L8 20m8-16 3.5 2 .5 4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'circle-slash': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </>
  ),
  'disc-3': (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="1" />
      <path d="m15.4 15.4 5.2 5.2M8.6 8.6 3.4 3.4m12 6.2 5.2-5.2m-12 12-5.2 5.2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.69A2 2 0 0 1 22 16.92Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
}

const specRows = [
  { key: 'seats', label: 'Seats', icon: 'users', suffix: ' seats' },
  { key: 'doors', label: 'Doors', icon: 'door-open', suffix: ' doors' },
  { key: 'luggage', label: 'Luggage', icon: 'luggage' },
  { key: 'fuel', label: 'Fuel Type', icon: 'fuel' },
  { key: 'gear', label: 'Gear', icon: 'settings-2' },
  { key: 'ac', label: 'A/C', icon: 'snowflake' },
  { key: 'airBag', label: 'Air Bag', icon: 'shield-check' },
  { key: 'abs', label: 'ABS', icon: 'circle-slash' },
  { key: 'cdPlayer', label: 'CD Player', icon: 'disc-3' },
]

function DetailIcon({ name, size = 20, className = '' }) {
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
      className={`${size === 96 ? 'h-24 w-24' : size === 16 ? 'h-4 w-4' : 'h-5 w-5'} shrink-0 ${className}`}
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

function CategoryPhoto({ category, src, index, total, selected, onSelect }) {
  const [failed, setFailed] = useState(!src)
  const alt = category.code === 'B'
    ? 'Fiat Panda or similar, Category B Manual car rental Athens'
    : `${category.name} car rental Athens, photo ${index + 1}/${total}`

  return (
    <button
      type="button"
      aria-label={`Show photo ${index + 1} of ${total} for ${category.name}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={`relative block h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F7F4EF] p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none ${selected ? 'ring-2 ring-[#FACC15]' : 'ring-1 ring-slate-200'}`}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center text-slate-300" aria-hidden="true">
          <DetailIcon name="car-front" size={20} />
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          width="96"
          height="64"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  )
}

function MainCategoryImage({ category, src, index, total, visible }) {
  const [failed, setFailed] = useState(!src)
  const alt = category.code === 'B'
    ? 'Fiat Panda or similar, Category B Manual car rental Athens'
    : `${category.name} car rental Athens, photo ${index + 1}/${total}`

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-slate-300" aria-hidden="true">
        <DetailIcon name="car-front" size={96} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width="960"
      height="600"
      loading="eager"
      className={`h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
      onError={() => setFailed(true)}
    />
  )
}

function CategoryHero({ category }) {
  const highlightAt = category.name.lastIndexOf(category.transmission)
  const titleStart = highlightAt >= 0 ? category.name.slice(0, highlightAt) : category.name
  const titleEnd = highlightAt >= 0 ? category.name.slice(highlightAt) : ''

  return (
    <section className="relative w-full bg-[#111111] py-8 lg:py-14">
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <nav aria-label="Breadcrumb" className="text-sm text-white/70">
          <a href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
          <span className="mx-2" aria-hidden="true">/</span>
          <a href="/pricelist" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Pricelist &amp; Fleet</a>
          <span className="mx-2" aria-hidden="true">/</span>
          <span aria-current="page">{category.name}</span>
        </nav>
        <h1 className="mt-4 max-w-4xl break-words text-3xl font-extrabold text-white lg:text-5xl">
          {titleStart}<span className="text-[#FACC15]">{titleEnd}</span>
        </h1>
        {category.example && <p className="mt-2 max-w-3xl break-words text-sm text-white/80 sm:text-base">{category.example}</p>}
      </div>
    </section>
  )
}

function Specification({ row, value }) {
  if (!value) return null
  const displayValue = row.suffix ? `${value}${row.suffix}` : value

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#FEF3C7] p-3 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111111] text-[#FACC15]" aria-hidden="true">
        <DetailIcon name={row.icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-slate-600">{row.label}</span>
        <span className="block break-words text-sm font-extrabold text-[#111111]">{displayValue}</span>
      </span>
    </div>
  )
}

function IncludedRate({ text }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FACC15] text-[#111111]" aria-hidden="true">
        <DetailIcon name="check" size={16} />
      </span>
      <span>{text}</span>
    </li>
  )
}

export function CategoryDetailPage({ slug }) {
  const category = categories.find((item) => item.slug === slug)
  const [galleryState, setGalleryState] = useState(() => ({ slug, index: 0, visible: true }))
  const selectedImage = galleryState.slug === slug ? galleryState.index : 0
  const imageVisible = galleryState.slug === slug ? galleryState.visible : true
  const touchStartX = useRef(null)
  const images = category?.images?.length ? category.images : category?.image ? [category.image] : []

  useEffect(() => {
    const previousTitle = document.title
    document.title = category ? `${category.name} | Athens Car Rental` : 'Category not found | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [category])

  if (!category) {
    return (
      <div className="min-h-[50vh] bg-[#F7F4EF] px-4 py-20 text-center text-[#111111]">
        <h1 className="text-3xl font-extrabold text-[#111111]">Category not found</h1>
        <a href="/pricelist" className="mt-6 inline-flex rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2">
          Back to all categories
        </a>
      </div>
    )
  }

  const categoryUrl = `/booking?category=${encodeURIComponent(category.slug)}${category.carId ? `&car_id=${category.carId}` : ''}`
  const displayedOthers = categories.filter((item) => item.slug !== category.slug)
  const selectImage = (index) => {
    if (index === selectedImage || index < 0 || index >= images.length) return
    setGalleryState({ slug, index: selectedImage, visible: false })
    window.setTimeout(() => {
      setGalleryState({ slug, index, visible: true })
    }, 100)
  }
  const handleGalleryKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectImage((selectedImage + 1) % images.length)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectImage((selectedImage - 1 + images.length) % images.length)
    }
  }
  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return
    const delta = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40 || images.length < 2) return
    selectImage((selectedImage + (delta < 0 ? 1 : -1) + images.length) % images.length)
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] pb-24 text-[#111111]">
      <CategoryHero category={category} />
      <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mt-8 grid items-start gap-6 lg:mt-[76px] lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl bg-white p-6 shadow-xl ring-2 ring-[#FACC15] lg:col-span-8 lg:p-8">
            <div
              role="group"
              aria-label={`${category.name} photo gallery`}
              tabIndex={0}
              onKeyDown={handleGalleryKeyDown}
              onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX }}
              onTouchEnd={handleTouchEnd}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#F7F4EF] p-6">
                <span className="absolute left-4 top-4 z-10 rounded-full bg-[#111111] px-3 py-1 text-xs font-bold uppercase text-[#FACC15]">
                  {category.transmission}
                </span>
                <MainCategoryImage
                  key={`${category.slug}-${selectedImage}`}
                  category={category}
                  src={images[selectedImage]}
                  index={selectedImage}
                  total={images.length}
                  visible={imageVisible}
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous photo"
                      onClick={() => selectImage((selectedImage - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111111] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
                    >
                      <DetailIcon name="chevron-left" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next photo"
                      onClick={() => selectImage((selectedImage + 1) % images.length)}
                      className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111111] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
                    >
                      <DetailIcon name="chevron-right" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto">
                  {images.map((image, index) => (
                    <CategoryPhoto
                      key={image}
                      category={category}
                      src={image}
                      index={index}
                      total={images.length}
                      selected={index === selectedImage}
                      onSelect={() => selectImage(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            <section className="mt-8">
              <h2 className="text-xl font-extrabold text-[#111111]">About this category</h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">{category.description}</p>
              {category.priceNote && (
                <p className="mt-5 border-l-4 border-[#FACC15] pl-4 font-semibold text-[#111111]">
                  {category.priceNote}
                </p>
              )}
            </section>

            {category.specs && (
              <section className="mt-8">
                <h2 className="text-xl font-extrabold text-[#111111]">Specifications</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {specRows.map((row) => <Specification key={row.key} row={row} value={category.specs[row.key]} />)}
                </div>
              </section>
            )}

            {category.ratesInclude?.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-extrabold text-[#111111]">Our rates include</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {category.ratesInclude.map((text) => <IncludedRate key={text} text={text} />)}
                </ul>
              </section>
            )}

            <p className="mt-8 flex items-center gap-2 text-sm text-slate-600">
              <DetailIcon name="info" size={16} />
              Fleet renewed regularly: average age 18 months, maximum 5 years.
            </p>
          </section>

          <aside className="rounded-3xl bg-[#111111] p-6 text-white shadow-xl ring-2 ring-[#FACC15] lg:sticky lg:top-28 lg:col-span-4 lg:p-8">
            <h2 className="text-xl font-extrabold">
              Interested in this <span className="text-[#FACC15]">car?</span>
            </h2>
            <p className="mt-5 break-words text-base font-bold text-white">{category.name}</p>
            {category.example && <p className="mt-1 break-words text-sm text-white/75">{category.example}</p>}
            <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/90">
              {category.specs?.seats && (
                <span className="inline-flex items-center gap-1.5">
                  <DetailIcon name="users" size={16} />
                  {category.specs.seats} seats
                </span>
              )}
              {category.specs?.doors && (
                <span className="inline-flex items-center gap-1.5">
                  <DetailIcon name="door-open" size={16} />
                  {category.specs.doors} doors
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <DetailIcon name="settings-2" size={16} />
                {category.specs?.gear || category.transmission}
              </span>
            </div>
            <a href={categoryUrl} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] text-base font-extrabold uppercase text-[#111111] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EAB308] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
              Reserve this vehicle
            </a>
            <a href={`${categoryUrl}&intent=quote`} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white/10 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">
              Request a quote
            </a>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <h3 className="font-bold text-white">Need help?</h3>
              <a href="tel:+302106022220" className="mt-2 inline-flex items-center gap-2 text-sm text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">
                <DetailIcon name="phone" size={16} />
                +30 210 6022220
              </a>
            </div>
          </aside>
        </div>

        <section className="mt-10 py-8 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold text-[#111111]">Other fleet options</h2>
            <a href="/pricelist" className="inline-flex items-center rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2">
              View all categories
            </a>
          </div>
          <div className="mt-6 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {displayedOthers.map((item) => <VehicleCategoryCard key={item.slug} category={item} />)}
          </div>
        </section>
      </div>
    </div>
  )
}

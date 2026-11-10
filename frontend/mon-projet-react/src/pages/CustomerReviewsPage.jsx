import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ratingBadges, reviews } from 'virtual:reviewsData.js'

const platformLabels = {
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  trustpilot: 'Trustpilot',
  facebook: 'Facebook',
  'reviews-center': 'Reviews Center',
}
const PAGE_SIZE = 12

function platformLabel(platform) {
  return platformLabels[platform] ?? platform
}

function warnImageLoad(imagePath) {
  if (!import.meta.env.DEV) return
  const filename = decodeURIComponent(imagePath.split('/').pop() ?? imagePath)
  console.warn(`[Customer Reviews] Unable to load image "${filename}" at "${imagePath}"`)
}

function ReviewCard({ review, index, onOpen, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-label={`Open ${review.alt}`}
      className="group relative mb-5 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[#EEE] bg-white p-0 text-left shadow-[0_8px_24px_rgba(17,17,17,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#FACC15] hover:shadow-[0_12px_30px_rgba(17,17,17,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <img
        src={review.src}
        alt={review.alt}
        width={review.width}
        height={review.height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full"
        onError={() => warnImageLoad(review.src)}
      />
      <span className="sr-only">Review {index + 1}</span>
    </button>
  )
}

export function CustomerReviewsPage() {
  const [activePlatform, setActivePlatform] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeReviewId, setActiveReviewId] = useState(null)
  const cardRefs = useRef(new Map())
  const closeButtonRef = useRef(null)
  const touchStartX = useRef(null)
  const returnFocusId = useRef(null)
  const reviewsGridRef = useRef(null)

  const platforms = useMemo(() => {
    const counts = new Map()
    reviews.forEach(({ platform }) => counts.set(platform, (counts.get(platform) ?? 0) + 1))
    return [
      { id: 'all', label: 'All', count: reviews.length },
      ...Object.keys(platformLabels)
        .filter((platform) => counts.has(platform))
        .map((platform) => ({ id: platform, label: platformLabel(platform), count: counts.get(platform) })),
    ]
  }, [])

  const filteredReviews = useMemo(
    () => activePlatform === 'all' ? reviews : reviews.filter((review) => review.platform === activePlatform),
    [activePlatform],
  )
  const visibleReviews = filteredReviews.slice(0, visibleCount)
  const activeIndex = filteredReviews.findIndex((review) => review.id === activeReviewId)
  const activeReview = activeIndex >= 0 ? filteredReviews[activeIndex] : null
  const isLightboxOpen = activeReviewId !== null && activeIndex >= 0

  useEffect(() => {
    document.title = 'Customer Reviews | Athens Car Rental'
    let description = document.querySelector('meta[name="description"]')
    const created = !description
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    const previousDescription = description.content
    description.content = 'Customer Reviews | Athens Car Rental'
    return () => {
      description.content = previousDescription
      if (created) description.remove()
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const counts = Object.fromEntries(
      Object.keys(platformLabels).map((platform) => [
        platform,
        reviews.filter((review) => review.platform === platform).length,
      ]),
    )
    console.info('[Customer Reviews] Detected captures by platform:', counts)
  }, [])

  useEffect(() => {
    if (!isLightboxOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const reviewCardRefs = cardRefs.current
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      requestAnimationFrame(() => reviewCardRefs.get(returnFocusId.current)?.focus())
    }
  }, [isLightboxOpen])

  useEffect(() => {
    if (!isLightboxOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveReviewId(null)
      } else if (event.key === 'ArrowRight' && filteredReviews.length > 1) {
        setActiveReviewId(filteredReviews[(activeIndex + 1) % filteredReviews.length].id)
      } else if (event.key === 'ArrowLeft' && filteredReviews.length > 1) {
        setActiveReviewId(filteredReviews[(activeIndex - 1 + filteredReviews.length) % filteredReviews.length].id)
      } else if (event.key === 'Tab') {
        const dialog = document.querySelector('[role="dialog"]')
        const buttons = dialog?.querySelectorAll('button:not(:disabled)')
        const firstButton = buttons?.[0]
        const lastButton = buttons?.[buttons.length - 1]
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault()
          lastButton?.focus()
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault()
          firstButton?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, activeIndex, filteredReviews])

  const openReview = (review) => {
    returnFocusId.current = review.id
    setActiveReviewId(review.id)
  }

  const moveReview = (direction) => {
    const nextIndex = (activeIndex + direction + filteredReviews.length) % filteredReviews.length
    setActiveReviewId(filteredReviews[nextIndex].id)
  }

  const closeLightbox = () => setActiveReviewId(null)

  const selectPlatform = (platform) => {
    setActivePlatform(platform)
    setVisibleCount(PAGE_SIZE)
    setActiveReviewId(null)
    window.requestAnimationFrame(() => {
      reviewsGridRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <div className="bg-[#F7F4EF] text-[#111111]">
      <section className="bg-[#111111] py-10 text-white lg:py-14">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <a href="/" className="rounded-sm hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">Customer Reviews</span>
          </nav>
          <div className="mt-8 text-center">
            <p className="mx-auto w-fit rounded-full border border-[#FACC15]/50 bg-[#FACC15]/10 px-4 py-1 text-xs font-extrabold tracking-[0.2em] text-[#FACC15]">
              ATHENS CAR RENTAL
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Customer <span className="text-[#FACC15]">Reviews</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-white/75 sm:text-lg">
              Our experience and professionalism sets very high standards for the quality of service we provide.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <section className="py-12 lg:py-16" aria-labelledby="reviews-intro">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto block h-1 w-12 rounded-full bg-[#FACC15]" aria-hidden="true" />
            <h2 id="reviews-intro" className="mt-5 text-lg font-medium italic leading-relaxed text-[#45413A] sm:text-xl">
              Read below just a few of customers' personal experiences!
            </h2>
          </div>

          {ratingBadges.length > 0 && (
            <div className="mx-auto mt-7 flex max-w-full snap-x snap-mandatory justify-start gap-4 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible lg:gap-6" aria-label="Review platform rating badges">
              {ratingBadges.map((badge) => {
                const badgeContents = (
                  <img
                    src={badge.src}
                    alt={badge.alt}
                    width={badge.width}
                    height={badge.height}
                    loading="lazy"
                    decoding="async"
                    onError={() => warnImageLoad(badge.src)}
                    className="h-auto max-h-[52px] w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:max-h-[64px] lg:max-h-[88px] motion-reduce:transition-none"
                  />
                )
                const badgeClass = 'group flex h-[84px] shrink-0 snap-start items-center justify-center rounded-[20px] border border-[#EEE] bg-white p-4 shadow-[0_8px_24px_rgba(17,17,17,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#FACC15] hover:shadow-[0_12px_30px_rgba(17,17,17,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:h-24 lg:h-[120px]'
                return badge.platform ? (
                  <button
                    key={badge.src}
                    type="button"
                    aria-label={`Show ${platformLabel(badge.platform)} reviews`}
                    onClick={() => selectPlatform(badge.platform)}
                    className={badgeClass}
                  >
                    {badgeContents}
                  </button>
                ) : (
                  <div key={badge.src} className={badgeClass}>
                    {badgeContents}
                  </div>
                )
              })}
            </div>
          )}

            {reviews.length === 0 ? (
            <div className="mt-10 rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-[#E9E3D8]">
              <p className="text-lg font-semibold text-[#45413A]">Customer reviews coming soon</p>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label="Filter reviews by platform">
                  {platforms.map((platform) => {
                    const selected = activePlatform === platform.id
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setActivePlatform(platform.id)
                          setVisibleCount(PAGE_SIZE)
                          setActiveReviewId(null)
                        }}
                        className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none ${
                          selected
                            ? 'border-[#FACC15] bg-[#FACC15] text-[#111111]'
                            : 'border-[#D9D3C9] bg-white text-[#28251F] hover:border-[#FACC15]'
                        }`}
                      >
                        {platform.label}
                        <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? 'bg-[#111111]/10' : 'bg-[#F7F4EF]'}`}>
                          {platform.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-4 text-sm text-[#5F5B53]" aria-live="polite">
                  Showing {visibleReviews.length} of {filteredReviews.length} reviews
                </p>
              </div>

              {filteredReviews.length ? (
                <>
                  <div ref={reviewsGridRef} id="customer-reviews-grid" className="mt-5 columns-1 gap-5 scroll-mt-8 sm:columns-2 lg:columns-3">
                    {visibleReviews.map((review, index) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        index={index}
                        onOpen={() => openReview(review)}
                        buttonRef={(element) => {
                          if (element) cardRefs.current.set(review.id, element)
                          else cardRefs.current.delete(review.id)
                        }}
                      />
                    ))}
                  </div>
                  {visibleCount < filteredReviews.length && (
                    <div className="mt-8 text-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FACC15] px-7 py-3 text-sm font-extrabold text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#E9B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-5 rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-[#E9E3D8]">
                  <p className="text-[#5F5B53]">Customer reviews coming soon</p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="mb-10 rounded-3xl bg-[#111111] px-6 py-9 text-center text-white sm:px-10 lg:mb-14 lg:py-11">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to join our happy customers?</h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/quote"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#FACC15] px-6 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#E9B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none"
            >
              Request a quote
            </a>
            <a
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#FACC15] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#FACC15] hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none"
            >
              Contact us
            </a>
          </div>
        </section>
      </main>

      {activeReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLightbox()
          }}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return
            const distance = event.changedTouches[0].clientX - touchStartX.current
            touchStartX.current = null
            if (Math.abs(distance) > 50) moveReview(distance < 0 ? 1 : -1)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Customer review image"
            className="relative flex max-h-full max-w-full flex-col items-center"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close"
              className="absolute -right-2 -top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:-right-12 sm:-top-2"
            >
              <X size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
            </button>
            {filteredReviews.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveReview(-1)}
                  aria-label="Previous review"
                  className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:-left-14"
                >
                  <ChevronLeft size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveReview(1)}
                  aria-label="Next review"
                  className="absolute right-0 top-1/2 z-10 flex h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:-right-14"
                >
                  <ChevronRight size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
                </button>
              </>
            )}
            <img
              src={activeReview.src}
              alt={activeReview.alt}
              width={activeReview.width}
              height={activeReview.height}
              className="max-h-[calc(100vh-7rem)] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <p className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white" aria-live="polite">
              {activeIndex + 1} / {filteredReviews.length}
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

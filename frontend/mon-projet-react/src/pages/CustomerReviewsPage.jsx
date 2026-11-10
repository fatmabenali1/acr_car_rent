import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageSquareQuote, Star, X } from 'lucide-react'
import { ratingBadges, reviews } from 'virtual:reviewsData.js'
import { getReviews } from '../api/reviews.js'
import './CustomerReviewsPage.css'

const platformLabels = {
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  trustpilot: 'Trustpilot',
  facebook: 'Facebook',
  'reviews-center': 'Reviews Center',
}
const PAGE_SIZE = 12
const tripadvisorUrl = import.meta.env.VITE_TRIPADVISOR_URL
  || 'https://www.tripadvisor.com/Search?q=Athens%20Car%20Rental%20ACR'

function platformLabel(platform) {
  return platformLabels[platform] ?? platform
}

function warnImageLoad(imagePath) {
  if (!import.meta.env.DEV) return
  const filename = decodeURIComponent(imagePath.split('/').pop() ?? imagePath)
  console.warn(`[Customer Reviews] Unable to load image "${filename}" at "${imagePath}"`)
}

const CAPTURE_META = {
  'review1.png': { platform: 'google', author: 'Kevin G', rating: 5 },
  'review2.png': { platform: 'google', author: 'nir blu', rating: 5 },
  'review3.png': { platform: 'google', author: 'John Saliba', rating: 5 },
  'review4.png': { platform: 'google', author: 'Stephen Nolan', rating: 5 },
  'review5.png': { platform: 'google', author: 'Justin Carnegie', rating: 5 },
  'review6.png': { platform: 'google', author: 'Michael J Betel', rating: 5 },
  'review7.png': { platform: 'trustpilot', author: 'Phil (Dison)', rating: 5 },
}

const platformOrder = ['google', 'tripadvisor', 'trustpilot', 'facebook']

function firstNameOf(author) {
  return (author ?? '').trim().split(/\s+/)[0] ?? ''
}

function captureFilename(src = '') {
  return decodeURIComponent(src.split('/').pop() ?? '').toLowerCase()
}

function SourceLogo({ platform }) {
  if (platform === 'google') {
    return (
      <svg viewBox="0 0 48 48" width="14" height="14" aria-hidden="true" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      </svg>
    )
  }
  if (platform === 'trustpilot') {
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#00B67A" aria-hidden="true" focusable="false">
        <path d="M24 9.5h-9.2L12 0 9.2 9.5H0l7.4 5.4-2.8 9.1L12 18.6l7.4 5.4-2.8-9.1L24 9.5Z" />
      </svg>
    )
  }
  return <MessageSquareQuote size={14} aria-hidden="true" />
}

function StarRating({ rating = 5, lang = 'en' }) {
  const filled = Math.round(Number(rating) || 0)
  return (
    <span
      className="customer-review-stars"
      aria-label={lang === 'el' ? `${rating} από 5 αστέρια` : `${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={13}
          aria-hidden="true"
          fill={index < filled ? 'currentColor' : 'none'}
          strokeWidth={index < filled ? 0 : 1.6}
        />
      ))}
    </span>
  )
}

function SourceBadge({ platform }) {
  return (
    <span className={`customer-review-source customer-review-source--${platform ?? 'other'}`}>
      <SourceLogo platform={platform} />
      {platformLabel(platform)}
    </span>
  )
}

function ReviewCard({ review, onOpen, buttonRef, lang }) {
  const isGreek = lang === 'el'
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-label={isGreek ? `Άνοιγμα: ${review.altEl || review.alt}` : `Open ${review.alt}`}
      className="customer-review-card group"
    >
      <span className="customer-review-card-head">
        <SourceBadge platform={review.platform} />
        {review.author && <span className="customer-review-author">{firstNameOf(review.author)}</span>}
        {review.rating != null && <StarRating rating={review.rating} lang={lang} />}
      </span>
      <span className="customer-review-capture">
        <span className="customer-review-shot">
          <img
            src={review.src}
            alt={isGreek ? review.altEl || `Κριτική πελάτη για την Athens Car Rental ACR${review.platform ? ` στο ${platformLabel(review.platform)}` : ''}` : review.alt}
            width={review.width}
            height={review.height}
            loading="lazy"
            decoding="async"
            onError={() => warnImageLoad(review.src)}
          />
        </span>
        <span className="customer-review-fade" aria-hidden="true" />
        <span className="customer-review-open-label">
          {isGreek ? 'Διαβάστε όλη την κριτική' : 'Read full review'} <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </span>
    </button>
  )
}

function TextReviewCard({ review, lang }) {
  const text = typeof review.text === 'string'
    ? review.text
    : review.text?.[lang] ?? review.text?.en ?? ''
  const author = review.author || 'Customer'
  const initials = author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <article className="customer-review-text-card">
      <div className="customer-review-card-head">
        <SourceBadge platform={review.platform} />
        {review.rating != null && <StarRating rating={review.rating} lang={lang} />}
      </div>
      <div className="customer-review-text-body">
        <div className="customer-review-text-person">
          <span className="customer-review-avatar" aria-hidden="true">{initials}</span>
          <div>
            <h3>{author}</h3>
            <p>{platformLabel(review.platform)}{review.date ? ` · ${review.date}` : ''}</p>
          </div>
        </div>
        {text && <p className="customer-review-text-copy">{text}</p>}
        {review.imageUrl && (
          <a
            className="customer-review-original-link"
            href={review.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lang === 'el' ? 'Προβολή αρχικής κριτικής' : 'View original review'} <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

export function CustomerReviewsPage({ lang = 'en' }) {
  const [activePlatform, setActivePlatform] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeReviewId, setActiveReviewId] = useState(null)
  const [apiReviews, setApiReviews] = useState([])
  const [apiError, setApiError] = useState('')
  const cardRefs = useRef(new Map())
  const closeButtonRef = useRef(null)
  const touchStartX = useRef(null)
  const returnFocusId = useRef(null)
  const reviewsGridRef = useRef(null)
  const allReviews = useMemo(() => {
    const captureReviews = reviews.map((review) => {
      const meta = CAPTURE_META[captureFilename(review.src)]
      if (!meta) return review
      const source = platformLabel(meta.platform)
      return {
        ...review,
        platform: meta.platform,
        author: meta.author,
        rating: meta.rating,
        alt: `Customer review of Athens Car Rental ACR on ${source}${meta.author ? ` by ${meta.author}` : ''}`,
        altEl: `Κριτική πελάτη για την Athens Car Rental ACR στο ${source}${meta.author ? ` από ${meta.author}` : ''}`,
      }
    })
    return [...captureReviews, ...apiReviews]
  }, [apiReviews])
  const isGreek = lang === 'el'

  const platforms = useMemo(() => {
    const counts = new Map()
    allReviews.forEach(({ platform }) => {
      if (platform === 'reviews-center') return
      counts.set(platform, (counts.get(platform) ?? 0) + 1)
    })
    const rankedPlatforms = [...counts.keys()].sort((left, right) => {
      const leftRank = platformOrder.indexOf(left)
      const rightRank = platformOrder.indexOf(right)
      return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank)
    })
    const captureCount = allReviews.filter((review) => review.src).length
    return [
      { id: 'all', label: isGreek ? 'Όλες' : 'All', count: allReviews.length },
      ...rankedPlatforms.map((platform) => ({
        id: platform,
        label: platformLabel(platform),
        count: counts.get(platform),
      })),
      ...(captureCount > 0
        ? [{ id: 'reviews-center', label: platformLabel('reviews-center'), count: captureCount }]
        : []),
    ]
  }, [allReviews, isGreek])

  const filteredReviews = useMemo(() => {
    if (activePlatform === 'all') return allReviews
    if (activePlatform === 'reviews-center') return allReviews.filter((review) => review.src)
    return allReviews.filter((review) => review.platform === activePlatform)
  }, [activePlatform, allReviews])

  const averageRating = useMemo(() => {
    const ratings = allReviews
      .map((review) => Number(review.rating))
      .filter((rating) => Number.isFinite(rating))
    if (!ratings.length) return null
    return (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
  }, [allReviews])
  const lightboxReviews = filteredReviews.filter((review) => review.src)
  const visibleReviews = filteredReviews.slice(0, visibleCount)
  const activeIndex = lightboxReviews.findIndex((review) => review.id === activeReviewId)
  const activeReview = activeIndex >= 0 ? lightboxReviews[activeIndex] : null
  const isLightboxOpen = activeReviewId !== null && activeIndex >= 0

  useEffect(() => {
    document.title = isGreek ? 'Κριτικές πελατών | Athens Car Rental ACR' : 'Customer Reviews | Athens Car Rental ACR'
    let description = document.querySelector('meta[name="description"]')
    const created = !description
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    const previousDescription = description.content
    description.content = isGreek
      ? 'Διαβάστε τις κριτικές πελατών της Athens Car Rental ACR και δείτε γιατί οι ταξιδιώτες μάς επιλέγουν στην Αθήνα.'
      : 'Read customer reviews of Athens Car Rental ACR and see why travelers choose our cars in Athens.'
    return () => {
      description.content = previousDescription
      if (created) description.remove()
    }
  }, [isGreek])

  useEffect(() => {
    let active = true

    getReviews({}, lang)
      .then(({ data }) => {
        if (!active) return
        if (!Array.isArray(data)) {
          setApiError(isGreek ? 'Δεν ήταν δυνατή η φόρτωση των κριτικών: ο διακομιστής επέστρεψε μη έγκυρη απάντηση.' : 'Customer reviews could not be loaded because the server returned an invalid response.')
          return
        }
        setApiReviews(data.map((review) => ({
          ...review,
          id: `api-${review.id}`,
          platform: review.source,
          src: review.imageUrl || null,
          alt: `Customer review of Athens Car Rental ACR on ${platformLabel(review.source)}${review.author ? ` by ${review.author}` : ''}`,
          altEl: `Κριτική πελάτη για την Athens Car Rental ACR στο ${platformLabel(review.source)}${review.author ? ` από ${review.author}` : ''}`,
        })))
        setApiError('')
      })
      .catch(() => {
        if (active) setApiError(isGreek ? 'Δεν ήταν δυνατή η φόρτωση των κριτικών. Δοκιμάστε ξανά αργότερα.' : 'Customer reviews could not be loaded. Please try again later.')
      })

    return () => {
      active = false
    }
  }, [lang, isGreek])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const counts = Object.fromEntries(
      Object.keys(platformLabels).map((platform) => [
        platform,
        allReviews.filter((review) => review.platform === platform).length,
      ]),
    )
    console.info('[Customer Reviews] Detected captures by platform:', counts)
  }, [allReviews])

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
      } else if (event.key === 'ArrowRight' && lightboxReviews.length > 1) {
        setActiveReviewId(lightboxReviews[(activeIndex + 1) % lightboxReviews.length].id)
      } else if (event.key === 'ArrowLeft' && lightboxReviews.length > 1) {
        setActiveReviewId(lightboxReviews[(activeIndex - 1 + lightboxReviews.length) % lightboxReviews.length].id)
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
  }, [isLightboxOpen, activeIndex, lightboxReviews])

  const openReview = (review) => {
    returnFocusId.current = review.id
    setActiveReviewId(review.id)
  }

  const moveReview = (direction) => {
    const nextIndex = (activeIndex + direction + lightboxReviews.length) % lightboxReviews.length
    setActiveReviewId(lightboxReviews[nextIndex].id)
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
    <div className="customer-reviews-page" lang={lang}>
      <section className="customer-reviews-hero text-white">
        <div className="customer-reviews-container customer-reviews-hero-inner">
          <nav aria-label={isGreek ? 'Διαδρομή πλοήγησης' : 'Breadcrumb'} className="customer-reviews-breadcrumb">
            <a href="/">{isGreek ? 'Αρχική' : 'Home'}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{isGreek ? 'Κριτικές πελατών' : 'Customer Reviews'}</span>
          </nav>
          <div className="customer-reviews-hero-grid">
            <div>
              <p className="customer-reviews-eyebrow"><MessageSquareQuote size={15} aria-hidden="true" />{isGreek ? 'ATHENS CAR RENTAL · ΠΡΑΓΜΑΤΙΚΕΣ ΕΜΠΕΙΡΙΕΣ' : 'ATHENS CAR RENTAL · REAL EXPERIENCES'}</p>
              <h1 className="customer-reviews-title">
                {isGreek ? <>Κριτικές <span>πελατών</span></> : <>Customer <span>Reviews</span></>}
              </h1>
              <p className="customer-reviews-subtitle">
                {isGreek
                  ? 'Αυθεντικές εμπειρίες ταξιδιωτών που επέλεξαν την ACR στην Αθήνα. Δείτε τις κριτικές και μάθετε πώς κάναμε το ταξίδι τους ευκολότερο.'
                  : 'Honest experiences from travelers who chose ACR for their journey in Athens. Browse the reviews and see what made their trip easier.'}
              </p>
            </div>
            <aside className="customer-reviews-count-card" aria-label={isGreek ? `${allReviews.length} κριτικές πελατών` : `${allReviews.length} customer reviews`}>
              <span className="customer-reviews-count-icon"><MessageSquareQuote size={22} aria-hidden="true" /></span>
              <span className="customer-reviews-count">{allReviews.length}</span>
              <span className="customer-reviews-count-label">{isGreek ? <>εμπειρίες πελατών<br />που μοιράστηκαν με την ACR</> : <>customer experiences<br />shared with ACR</>}</span>
            </aside>
          </div>
        </div>
      </section>

      <div className="customer-reviews-container customer-reviews-main">
        <section aria-labelledby="reviews-intro">
          <div className="customer-reviews-intro">
            <div>
              <span className="customer-reviews-section-label">{isGreek ? 'Σχόλια πελατών' : 'Guest feedback'}</span>
              <h2 id="reviews-intro" className="customer-reviews-section-title">{isGreek ? 'Μια πιο κοντινή ματιά στην εμπειρία' : 'A closer look at the experience'}</h2>
            </div>
            <p className="customer-reviews-section-copy">
              {isGreek ? 'Δείτε στιγμιότυπα κριτικών και σχόλια από τις πλατφόρμες όπου οι ταξιδιώτες μοιράστηκαν την εμπειρία τους.' : 'Explore customer review captures and feedback from the platforms where travelers shared their experience.'}
            </p>
          </div>

          {apiError && (
            <p className="customer-reviews-alert" role="alert">
              {apiError}
            </p>
          )}

          {ratingBadges.length > 0 && (
            <div className="customer-reviews-badges" aria-label={isGreek ? 'Σήματα αξιολόγησης πλατφορμών κριτικών' : 'Review platform rating badges'}>
              {ratingBadges.map((badge) => {
                const badgeContents = (
                  <img
                    src={badge.src}
                    alt={isGreek ? `Σήμα αξιολόγησης ${badge.platform ? platformLabel(badge.platform) : ''}` : badge.alt}
                    width={badge.width}
                    height={badge.height}
                    loading="lazy"
                    decoding="async"
                    onError={() => warnImageLoad(badge.src)}
                    className="h-auto max-h-[64px] w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] lg:max-h-[88px]"
                  />
                )
                const badgeClass = 'customer-reviews-badge group'
                return badge.platform ? (
                  <button
                    key={badge.src}
                    type="button"
                    aria-label={isGreek ? `Προβολή κριτικών στο ${platformLabel(badge.platform)}` : `Show ${platformLabel(badge.platform)} reviews`}
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

          {allReviews.length === 0 ? (
            <div className="customer-reviews-empty">
              <p>{isGreek ? 'Οι κριτικές πελατών θα είναι σύντομα διαθέσιμες' : 'Customer reviews coming soon'}</p>
            </div>
          ) : (
            <>
              <div>
                <div className="customer-reviews-filters" aria-label={isGreek ? 'Φιλτράρισμα κριτικών ανά πλατφόρμα' : 'Filter reviews by platform'}>
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
                        className="customer-reviews-filter"
                      >
                        {platform.label}
                        <span className="customer-reviews-filter-count">
                          {platform.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="customer-reviews-showing" aria-live="polite">
                  {isGreek ? `Εμφανίζονται ${visibleReviews.length} από ${filteredReviews.length} κριτικές` : `Showing ${visibleReviews.length} of ${filteredReviews.length} reviews`}
                </p>
              </div>

              {filteredReviews.length ? (
                <>
                  <div ref={reviewsGridRef} id="customer-reviews-grid" className="customer-reviews-grid scroll-mt-8">
                    {visibleReviews.map((review) => review.src ? (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        onOpen={() => openReview(review)}
                        lang={lang}
                        buttonRef={(element) => {
                          if (element) cardRefs.current.set(review.id, element)
                          else cardRefs.current.delete(review.id)
                        }}
                      />
                    ) : <TextReviewCard key={review.id} review={review} lang={lang} />)}
                  </div>
                  {visibleCount < filteredReviews.length && (
                    <div className="customer-reviews-load-more">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      >
                        {isGreek ? 'Φόρτωση περισσότερων' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="customer-reviews-empty">
                  <p>{isGreek ? 'Οι κριτικές πελατών θα είναι σύντομα διαθέσιμες' : 'Customer reviews coming soon'}</p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="customer-reviews-cta">
          <div>
            <span className="customer-reviews-section-label">{isGreek ? 'Το ταξίδι σας στην Αθήνα ξεκινά εδώ' : 'Your Athens trip starts here'}</span>
            {averageRating && (
              <p className="customer-reviews-rating-summary">
                <strong>{averageRating}</strong>
                <Star size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                <span>– {isGreek ? 'Αξιολογημένο ως εξαιρετικό από τους πελάτες μας' : 'Rated excellent by our customers'}</span>
              </p>
            )}
            <h2>{isGreek ? 'Έτοιμοι να δημιουργήσετε τις δικές σας αναμνήσεις;' : 'Ready to make your own memories?'}</h2>
            <p>{isGreek ? 'Πείτε μας τι χρειάζεστε και η ομάδα μας θα σας βοηθήσει να οργανώσετε την ενοικίασή σας.' : 'Tell us what you need and our team will help plan your rental.'}</p>
          </div>
          <div className="customer-reviews-cta-actions">
            <a
              href={tripadvisorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="customer-reviews-cta-secondary"
            >
              {isGreek ? 'Δείτε περισσότερα στο Tripadvisor' : 'Read more on Tripadvisor'} <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a
              href="/quote"
              className="customer-reviews-cta-primary"
            >
              {isGreek ? 'Ζητήστε προσφορά' : 'Request a quote'}
            </a>
          </div>
        </section>
      </div>

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
            aria-label={isGreek ? 'Εικόνα κριτικής πελάτη' : 'Customer review image'}
            className="relative flex max-h-full max-w-full flex-col items-center"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              aria-label={isGreek ? 'Κλείσιμο' : 'Close'}
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
            </button>
            {lightboxReviews.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveReview(-1)}
                  aria-label={isGreek ? 'Προηγούμενη κριτική' : 'Previous review'}
                  className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => moveReview(1)}
                  aria-label={isGreek ? 'Επόμενη κριτική' : 'Next review'}
                  className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#FACC15] text-[#111111] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight size={24} className="h-6 w-6 shrink-0" aria-hidden="true" />
                </button>
              </>
            )}
            <div className="customer-reviews-lightbox-frame">
              <img
                src={activeReview.src}
                alt={isGreek ? activeReview.altEl || `Κριτική πελάτη για την Athens Car Rental ACR${activeReview.platform ? ` στο ${platformLabel(activeReview.platform)}` : ''}` : activeReview.alt}
                width={activeReview.width}
                height={activeReview.height}
                decoding="async"
                className="customer-reviews-lightbox-image"
              />
            </div>
            <div className="customer-reviews-lightbox-caption" aria-live="polite">
              <SourceBadge platform={activeReview.platform} />
              {activeReview.author && <span className="customer-reviews-lightbox-author">{activeReview.author}</span>}
              <span className="customer-reviews-lightbox-hint">
                {isGreek ? '← → για πλοήγηση · Esc για κλείσιμο' : '← → to navigate · Esc to close'}
              </span>
              <span className="customer-reviews-lightbox-counter">{activeIndex + 1} / {lightboxReviews.length}</span>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

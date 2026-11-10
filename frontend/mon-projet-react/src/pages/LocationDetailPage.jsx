import { useEffect, useMemo } from 'react'
import locationsData from '../data/locationsData'
import './LocationDetailPage.css'

function DetailIcon({ name }) {
  const paths = {
    airport: <><path d="m3 11 18-5-7 7 3 8-4-2-3-7-7-1Z" /><path d="m10 14-4 5" /></>,
    city: <><path d="M4 21V5l8-3v19M12 9h8v12M2 21h20" /><path d="M7 7h2M7 11h2M7 15h2M16 13h2M16 17h2" /></>,
    metro: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 21h8M9 18l-2 3M15 18l2 3M8 10h8" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></>,
    port: <><path d="M3 16h18l-2 4H5l-2-4ZM12 3v13M12 4l6 3H12M3 13l4 3 5-3 5 3 4-3" /></>,
    coast: <><path d="M3 15c2.25-2 4.5-2 6.75 0s4.5 2 6.75 0 4.5-2 6.5 0M3 20c2.25-2 4.5-2 6.75 0s4.5 2 6.75 0 4.5-2 6.5 0" /><circle cx="17" cy="6" r="3" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" />,
    external: <><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.pin}
    </svg>
  )
}

function handleInternalLink(event, action) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  action()
}

function updateMetaDescription(description) {
  let meta = document.querySelector('meta[name="description"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'description'
    document.head.append(meta)
  }
  meta.content = description
}

function LocationHero({ location, lang }) {
  const isGreek = lang === 'el'
  const title = isGreek ? location.titleEl : location.title
  const lastSpace = title.lastIndexOf(' ')
  const titleStart = lastSpace < 0 ? '' : title.slice(0, lastSpace + 1)
  const titleEnd = title.slice(lastSpace + 1)

  return (
    <section className="location-detail-hero">
      <div className="location-detail-hero-inner">
        <nav className="location-detail-breadcrumb" aria-label={isGreek ? 'Διαδρομή πλοήγησης' : 'Breadcrumb'}>
          <a href="/">{isGreek ? 'Αρχική' : 'Home'}</a>
          <span aria-hidden="true">/</span>
          <a href="/locations" data-location-route="list">{isGreek ? 'Τοποθεσίες' : 'Locations'}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <div className="location-detail-hero-copy">
          <p className="location-detail-eyebrow">ATHENS CAR RENTAL</p>
          <h1>{titleStart}<span>{titleEnd}</span></h1>
          <p>{isGreek ? 'Ενοικίαση αυτοκινήτου από την Athens Car Rental Greece.' : 'Car rental by Athens Car Rental Greece.'}</p>
        </div>
      </div>
    </section>
  )
}

function LocationNotFound({ onBackToLocations, lang }) {
  const isGreek = lang === 'el'
  return (
    <div className="location-not-found">
      <h1>{isGreek ? 'Η τοποθεσία δεν βρέθηκε' : 'Location not found'}</h1>
      <p>{isGreek ? 'Δεν ήταν δυνατή η εύρεση της τοποθεσίας που αναζητάτε.' : 'The location you are looking for could not be found.'}</p>
      <button type="button" onClick={onBackToLocations}>{isGreek ? 'Επιστροφή στις τοποθεσίες' : 'Back to locations'}</button>
    </div>
  )
}

export function LocationDetailPage({ slug, lang = 'en', onLocationNavigate, onBackToLocations, onRequestQuote, onContactUs }) {
  const isGreek = lang === 'el'
  const location = locationsData.find((item) => item.slug === slug)
  const localizedLocation = useMemo(() => (location && isGreek
    ? { ...location, name: location.nameEl, title: location.titleEl, address: location.addressEl, description: location.descriptionEl }
    : location), [location, isGreek])
  const otherLocations = useMemo(() => locationsData.filter((item) => item.slug !== slug), [slug])

  useEffect(() => {
    const originalTitle = document.title
    const existingMeta = document.querySelector('meta[name="description"]')
    const originalDescription = existingMeta?.content

    if (!localizedLocation) {
      document.title = isGreek ? 'Η τοποθεσία δεν βρέθηκε | Athens Car Rental' : 'Location not found | Athens Car Rental'
      updateMetaDescription(isGreek ? 'Η τοποθεσία δεν βρέθηκε. Δείτε τις τοποθεσίες της Athens Car Rental.' : 'Location not found. Browse Athens Car Rental locations.')
    } else {
      document.title = isGreek
        ? `Ενοικίαση αυτοκινήτου: ${localizedLocation.title} | Athens Car Rental`
        : `Car Rental in ${localizedLocation.title} | Athens Car Rental`
      updateMetaDescription(localizedLocation.description)
    }

    return () => {
      document.title = originalTitle
      if (originalDescription === undefined) {
        document.querySelector('meta[name="description"]')?.remove()
      } else {
        updateMetaDescription(originalDescription)
      }
    }
  }, [localizedLocation, isGreek])

  if (!localizedLocation) return <LocationNotFound onBackToLocations={onBackToLocations} lang={lang} />

  const hasCoordinates = Number.isFinite(localizedLocation.lat) && Number.isFinite(localizedLocation.lng)
  const mapSrc = hasCoordinates
    ? `https://www.google.com/maps?q=${localizedLocation.lat},${localizedLocation.lng}(${encodeURIComponent(localizedLocation.title)})&z=${localizedLocation.mapZoom}&output=embed&hl=${lang}`
    : `https://www.google.com/maps?q=Greece&z=6&output=embed&hl=${lang}`
  const directionsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${localizedLocation.lat},${localizedLocation.lng}`
    : 'https://www.google.com/maps/search/?api=1&query=Greece'
  const getLocationHref = (item) => `/locations/${item.slug}?lang=${lang}`
  const navigateToLocation = (event, item) => handleInternalLink(event, () => onLocationNavigate(item))
  const navigateBack = (event) => handleInternalLink(event, onBackToLocations)

  return (
    <div className="location-detail-page" lang={lang}>
      <LocationHero location={localizedLocation} lang={lang} />

      <div className="location-detail-main">
        <section className="location-detail-grid" aria-label={isGreek ? `Πληροφορίες τοποθεσίας: ${localizedLocation.title}` : `${localizedLocation.title} location information`}>
          <div className="location-detail-map">
            <iframe
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={isGreek ? `Χάρτης της τοποθεσίας ${localizedLocation.title}` : `Map of ${localizedLocation.title}`}
            />
            <a className="location-detail-map-link" href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <DetailIcon name="external" />
              {isGreek ? 'Άνοιγμα στους Χάρτες Google' : 'Open in Google Maps'}
            </a>
          </div>

          <section className="location-detail-card">
            <div className="location-detail-badge">
              <span><DetailIcon name={localizedLocation.icon} /></span>
              <p>{isGreek ? 'Σημείο παραλαβής και επιστροφής' : 'Pick-up &amp; drop-off point'}</p>
            </div>
            <h2>{localizedLocation.title}</h2>
            <div className="location-detail-contact-row">
              <DetailIcon name="map" />
              <span>{localizedLocation.address}</span>
            </div>
            <div className="location-detail-contact-row">
              <DetailIcon name="phone" />
              <a href="tel:+302106624887">{localizedLocation.phone}</a>
            </div>
            <p className="location-detail-description">{localizedLocation.description}</p>
            <div className="location-detail-actions">
              <a
                className="location-detail-quote"
                href="/quote"
                onClick={(event) => handleInternalLink(event, onRequestQuote)}
              >
                {isGreek ? 'Ζητήστε προσφορά' : 'Request a quote'}
              </a>
              <a className="location-detail-call" href="tel:+302106624887">
                <DetailIcon name="phone" />
                {isGreek ? 'Καλέστε μας' : 'Call us'}
              </a>
            </div>
          </section>
        </section>

        <section className="location-benefits" aria-labelledby="location-benefits-heading">
          <header className="location-detail-section-heading">
            <p className="location-detail-eyebrow">{isGreek ? 'Η ΔΙΑΦΟΡΑ ΤΗΣ ACR' : 'THE ACR DIFFERENCE'}</p>
            <h2 id="location-benefits-heading">{isGreek ? 'Γιατί να μας επιλέξετε' : 'Why rent with us'}</h2>
          </header>
          <div className="location-benefit-grid">
            {[
              ...(isGreek
                ? ['Δωρεάν επιπλέον οδηγοί', 'Δωρεάν ακύρωση της προκαταβολής σύμφωνα με την πολιτική μας', 'Οδική βοήθεια όλο το 24ωρο']
                : ['Free additional drivers', 'Free cancellation of your deposit as per our policy', '24-hour road assistance']),
            ].map((benefit) => (
              <article className="location-benefit-card" key={benefit}>
                <span><DetailIcon name="check" /></span>
                <h3>{benefit}</h3>
              </article>
            ))}
          </div>
        </section>

        <nav className="location-other-nav" aria-label={isGreek ? 'Άλλες τοποθεσίες' : 'Other locations'}>
          <div>
            <p className="location-detail-eyebrow">{isGreek ? 'ΕΞΕΡΕΥΝΗΣΤΕ ΠΕΡΙΣΣΟΤΕΡΑ' : 'EXPLORE MORE'}</p>
            <h2>{isGreek ? 'Άλλες τοποθεσίες' : 'Other locations'}</h2>
          </div>
          <div className="location-other-pills">
            {otherLocations.map((item) => (
              <a
                key={item.id}
                href={getLocationHref(item)}
                onClick={(event) => navigateToLocation(event, item)}
              >
                {isGreek ? item.titleEl : item.title}
              </a>
            ))}
          </div>
          <a className="location-back-link" href="/locations" onClick={navigateBack}>
            {isGreek ? 'Επιστροφή σε όλες τις τοποθεσίες' : 'Back to all locations'}
            <DetailIcon name="arrow" />
          </a>
        </nav>

        <aside className="location-detail-banner">
          <span><DetailIcon name="info" /></span>
          <p>{isGreek ? 'Η παράδοση και παραλαβή στο Διεθνές Αεροδρόμιο Αθηνών είναι διαθέσιμη όλο το 24ωρο, κατόπιν συνεννόησης.' : 'Delivery and collection at Athens International Airport is available 24/7 by appointment.'}</p>
          <a href="/contact" onClick={(event) => handleInternalLink(event, onContactUs)}>{isGreek ? 'Επικοινωνία' : 'Contact us'}</a>
        </aside>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import locationsData from '../data/locationsData'
import './LocationsPage.css'

const locations = locationsData.filter((location) => location.lat !== null && location.lng !== null)
const phoneLink = 'tel:+302106624887'

function LocationIcon({ name }) {
  const paths = {
    airport: <><path d="m3 11 18-5-7 7 3 8-4-2-3-7-7-1Z" /><path d="m10 14-4 5" /></>,
    city: <><path d="M4 21V5l8-3v19M12 9h8v12M2 21h20" /><path d="M7 7h2M7 11h2M7 15h2M16 13h2M16 17h2" /></>,
    metro: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 21h8M9 18l-2 3M15 18l2 3M8 10h8" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></>,
    port: <><path d="M3 16h18l-2 4H5l-2-4ZM12 3v13M12 4l6 3H12M3 13l4 3 5-3 5 3 4-3" /></>,
    coast: <><path d="M3 15c2.25-2 4.5-2 6.75 0s4.5 2 6.75 0 4.5-2 6.5 0M3 20c2.25-2 4.5-2 6.75 0s4.5 2 6.75 0 4.5-2 6.5 0" /><circle cx="17" cy="6" r="3" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    map: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.pin}
    </svg>
  )
}

const markerIcon = L.divIcon({
  className: 'locations-marker-wrapper',
  html: '<span class="locations-marker"><span class="locations-marker-dot"></span></span>',
  iconSize: [36, 44],
  iconAnchor: [18, 42],
  popupAnchor: [0, -38],
})

function MapController({ onReady }) {
  const map = useMap()

  useEffect(() => {
    onReady(map)
    const bounds = L.latLngBounds(locations.map(({ lat, lng }) => [lat, lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, onReady])

  useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
  })

  return null
}

function LocationMarker({ location, markerRefs, onSelect, lang }) {
  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={markerIcon}
      keyboard
      ref={(marker) => {
        if (marker) markerRefs.current.set(location.id, marker)
        else markerRefs.current.delete(location.id)
      }}
      eventHandlers={{
        click: () => onSelect(location.id),
        keypress: () => onSelect(location.id),
      }}
    >
      <Popup className="locations-popup">
        <div className="locations-popup-content">
          <strong>{lang === 'el' ? location.nameEl : location.name}</strong>
          <span>{lang === 'el' ? location.addressEl : location.address}</span>
          <a href={phoneLink}>{location.phone}</a>
          <a
            className="locations-directions"
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lang === 'el' ? 'Οδηγίες διαδρομής' : 'Get directions'}
            <LocationIcon name="arrow" />
          </a>
        </div>
      </Popup>
    </Marker>
  )
}

export function LocationsPage({ lang = 'en', onRequestQuote, onLocationNavigate }) {
  const isGreek = lang === 'el'
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const markerRefs = useRef(new Map())
  const [activeLocationId, setActiveLocationId] = useState(null)
  const locationsBounds = useMemo(() => L.latLngBounds(locations.map(({ lat, lng }) => [lat, lng])), [])

  const mapReady = useCallback((map) => {
    mapRef.current = map
  }, [])

  const selectLocation = (locationId) => {
    setActiveLocationId(locationId)
  }

  const focusLocation = (location) => {
    const map = mapRef.current
    const marker = markerRefs.current.get(location.id)
    if (!map || !marker) return

    selectLocation(location.id)
    map.flyTo([location.lat, location.lng], 15, { duration: 0.8 })
    marker.openPopup()
    mapElementRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center',
    })
  }

  const navigateToLocation = (event, location) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onLocationNavigate(location)
  }

  return (
    <div className="locations-page" lang={lang}>
      <section className="locations-hero">
        <div className="locations-hero-inner">
          <nav className="locations-breadcrumb" aria-label={isGreek ? 'Διαδρομή πλοήγησης' : 'Breadcrumb'}>
            <a href="/">{isGreek ? 'Αρχική' : 'Home'}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{isGreek ? 'Τοποθεσίες' : 'Locations'}</span>
          </nav>
          <div className="locations-hero-copy">
            <p className="locations-eyebrow">ATHENS CAR RENTAL</p>
            <h1>{isGreek ? <>Οι <span>τοποθεσίες μας</span></> : <>Our <span>Locations</span></>}</h1>
            <p>{isGreek ? 'Παραλάβετε και επιστρέψτε το αυτοκίνητό σας σε όποιο σημείο της Αθήνας σας εξυπηρετεί.' : 'Pick up and return your car wherever it suits you in Athens.'}</p>
          </div>
        </div>
      </section>

      <div className="locations-main">
        <div className="locations-map-wrap" ref={mapElementRef}>
          <MapContainer
            className="locations-map"
            bounds={locationsBounds}
            boundsOptions={{ padding: [40, 40] }}
            scrollWheelZoom={false}
            zoomControl
            keyboard
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <MapController onReady={mapReady} />
            {locations.map((location) => (
              <LocationMarker
                key={location.id}
                location={location}
                markerRefs={markerRefs}
                onSelect={selectLocation}
                lang={lang}
              />
            ))}
          </MapContainer>
        </div>

        <section className="locations-list-section" aria-labelledby="locations-section-heading">
          <header className="locations-section-heading">
            <p className="locations-eyebrow">{isGreek ? 'ΒΡΕΙΤΕ ΤΟΝ ΔΡΟΜΟ ΣΑΣ' : 'FIND YOUR WAY'}</p>
            <h2 id="locations-section-heading">{isGreek ? 'Επιλέξτε τοποθεσία' : 'Choose your location'}</h2>
            <span aria-hidden="true" />
          </header>

          <div className="locations-grid">
            {locationsData.map((location, index) => {
              const isOther = location.lat === null || location.lng === null
              const isActive = activeLocationId === location.id

              return (
                <article
                  key={location.id}
                  className={`location-card${isActive ? ' is-active' : ''}${isOther ? ' location-card-other' : ''}`}
                  style={{ '--location-index': index }}
                >
                  <div className="location-card-top">
                    <span className="location-card-icon"><LocationIcon name={location.icon} /></span>
                    <span className="location-card-number">{String(location.id).padStart(2, '0')}</span>
                  </div>
                  <h3>{isGreek ? location.nameEl : location.name}</h3>
                  <div className="location-card-detail">
                    <LocationIcon name="map" />
                    <span>{isGreek ? location.addressEl : location.address}</span>
                  </div>
                  <div className="location-card-detail">
                    <LocationIcon name="phone" />
                    <a href={phoneLink}>{location.phone}</a>
                  </div>
                  {isOther ? (
                    <button className="location-other-cta" type="button" onClick={onRequestQuote}>
                      {isGreek ? 'Ζητήστε προσφορά' : 'Request a quote'}
                      <LocationIcon name="arrow" />
                    </button>
                  ) : (
                    <button
                      className="location-map-link"
                      type="button"
                      aria-label={isGreek ? `Προβολή της τοποθεσίας ${location.nameEl} στον χάρτη` : `View ${location.name} on map`}
                      onClick={() => focusLocation(location)}
                    >
                      {isGreek ? 'Προβολή στον χάρτη' : 'View on map'}
                      <LocationIcon name="arrow" />
                    </button>
                  )}
                  <a
                    className="location-read-more"
                    href={`/locations/${location.slug}`}
                    onClick={(event) => navigateToLocation(event, location)}
                    aria-label={isGreek ? `Περισσότερα για την τοποθεσία ${location.nameEl}` : `Read more about ${location.name}`}
                  >
                    {isGreek ? 'Μάθετε περισσότερα' : 'Read more'}
                    <LocationIcon name="arrow" />
                  </a>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="locations-info-banner">
          <span className="locations-info-icon"><LocationIcon name="info" /></span>
          <p>
            {isGreek
              ? 'Η παράδοση και παραλαβή στο Διεθνές Αεροδρόμιο Αθηνών είναι διαθέσιμη όλο το 24ωρο, κατόπιν συνεννόησης. Για ενοικιάσεις κάτω των 5 ημερών, η παράδοση και παραλαβή είναι δωρεάν μόνο στο Αεροδρόμιο ή στον σταθμό Μετρό Κορωπίου. Άλλες τοποθεσίες είναι διαθέσιμες για ενοικιάσεις 5 ημερών και άνω, με πρόσθετη χρέωση από 30 ευρώ.'
              : 'Delivery and collection at Athens International Airport is available 24/7 by appointment. For rentals shorter than 5 days, delivery and collection are free of charge at the Airport or Koropi Metro Station only. Other locations are available for rentals of 5 days or more, for an additional fee starting from 30 euros.'}
          </p>
        </aside>
      </div>
    </div>
  )
}

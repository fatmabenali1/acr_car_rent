import './ContactPage.css'

const mapEmbedUrl = 'https://www.google.com/maps?q=37.9010973,23.9004058(Athens+Car+Rental+-+ACR)&z=17&output=embed&hl=en'
const mapSearchUrl = 'https://www.google.com/maps/search/?api=1&query=37.9010973,23.9004058'

export function ContactIcon({ name }) {
  const paths = {
    address: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.08 4.18 2 2 0 0 1 5.06 2h3a2 2 0 0 1 2 1.72l.43 2.68a2 2 0 0 1-1.26 2.15l-1.29.48a16 16 0 0 0 8.8 8.8l.48-1.29a2 2 0 0 1 2.15-1.26l2.68.43A2 2 0 0 1 22 16.92Z" />,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    hours: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    external: <><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /></>,
  }

  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function ContactHero({ breadcrumb, eyebrow, title, highlight, suffix = '', subtitle }) {
  return (
    <section className="contact-hero">
      <div className="contact-hero-inner">
        <nav className="contact-breadcrumb" aria-label="Breadcrumb">
          <a href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{breadcrumb}</span>
        </nav>
        <div className="contact-hero-copy">
          <p className="contact-eyebrow">{eyebrow}</p>
          <h1>{title}<span>{highlight}</span>{suffix}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </section>
  )
}

export function ContactField({ id, label, type = 'text', value, onChange, required = false, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#111111]">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="h-12 w-full rounded-xl border border-[#D8D2C7] bg-white px-4 text-sm text-[#111111] focus-visible:border-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
        {...props}
      />
    </div>
  )
}

export function ContactPage() {
  return (
    <div className="contact-page">
      <ContactHero
        breadcrumb="Contact us"
        eyebrow="ATHENS CAR RENTAL"
        title="Contact "
        highlight="us"
        subtitle="We are here to help you plan your rental in Greece."
      />

      <div className="contact-main">
        <div className="contact-grid">
          <section className="contact-map-card" aria-label="Map showing Athens Car Rental location">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Athens Car Rental location"
            />
            <a
              className="contact-map-link"
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ContactIcon name="external" />
              Open in Google Maps
            </a>
          </section>

          <section className="contact-information">
            <header className="contact-information-heading">
              <p className="contact-eyebrow">GET IN TOUCH</p>
              <h2>Contact information</h2>
              <span aria-hidden="true" />
              <p className="contact-company-name">Athens Car Rental - ACR</p>
            </header>

            <div className="contact-details">
              <div className="contact-detail">
                <span className="contact-detail-icon"><ContactIcon name="address" /></span>
                <div>
                  <span className="contact-detail-label">Address</span>
                  <a
                    className="contact-detail-value"
                    href={mapSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    3rd km Markopoulou - Paianias Avenue, Koropi, PC 19441
                  </a>
                </div>
              </div>

              <div className="contact-detail">
                <span className="contact-detail-icon"><ContactIcon name="phone" /></span>
                <div>
                  <span className="contact-detail-label">Phone</span>
                  <div className="contact-detail-values">
                    <a className="contact-detail-value" href="tel:+302106022220">+30 210 6022220</a>
                    <a className="contact-detail-value" href="tel:+302106624887">+30 210 6624887</a>
                  </div>
                </div>
              </div>

              <div className="contact-detail">
                <span className="contact-detail-icon"><ContactIcon name="email" /></span>
                <div>
                  <span className="contact-detail-label">E-mail</span>
                  <a className="contact-detail-value" href="mailto:info@acr.gr">info@acr.gr</a>
                </div>
              </div>

              <div className="contact-detail">
                <span className="contact-detail-icon"><ContactIcon name="hours" /></span>
                <div>
                  <span className="contact-detail-label">Opening hours</span>
                  <span className="contact-detail-value">Airport delivery &amp; collection 24/7 by appointment</span>
                </div>
              </div>
            </div>

            <div className="contact-actions">
              <a className="contact-action contact-action-primary" href="tel:+302106022220">
                <ContactIcon name="phone" />
                Call us
              </a>
              <a className="contact-action contact-action-secondary" href="/booking">
                Request a quote
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

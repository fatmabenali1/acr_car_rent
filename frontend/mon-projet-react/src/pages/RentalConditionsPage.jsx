import { useEffect, useState } from 'react'
import { rentalTermsData } from '../data/rentalTermsData'
import './RentalConditionsPage.css'

function TermsIcon({ name }) {
  const paths = {
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function RentalConditionsPage() {
  const [preview, setPreview] = useState(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)

  useEffect(() => {
    if (!preview || previewFailed || previewLoaded) return undefined

    const timeout = window.setTimeout(() => setPreviewFailed(true), 8000)
    return () => window.clearTimeout(timeout)
  }, [preview, previewFailed, previewLoaded])

  const openPreview = (item) => {
    setPreview(item)
    setPreviewFailed(false)
    setPreviewLoaded(false)
  }

  const closePreview = () => {
    setPreview(null)
    setPreviewFailed(false)
    setPreviewLoaded(false)
  }

  return (
    <div className="rental-conditions-page">
      <section className="rental-conditions-hero">
        <div className="rental-conditions-hero-inner">
          <nav className="rental-conditions-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Rental Conditions</span>
          </nav>
          <div className="rental-conditions-hero-copy">
            <p className="rental-conditions-eyebrow">ATHENS CAR RENTAL</p>
            <h1><span>Rental</span> <strong>Conditions</strong></h1>
            <p>Everything you need to know about your rental agreement.</p>
          </div>
        </div>
      </section>

      <div className="rental-conditions-main">
        <p className="rental-conditions-intro">Please select your preferred language to preview or download the corresponding Terms and Conditions PDF file.</p>

        <div className="rental-terms-grid">
          {rentalTermsData.map((item) => (
            <article className="rental-terms-card" key={item.id}>
              <div className="rental-terms-card-top">
                <span className="rental-terms-file-icon"><TermsIcon name="file" /></span>
                <span className="rental-terms-language">{item.lang}</span>
              </div>
              <div className="rental-terms-card-copy">
                <h2>{item.title}</h2>
                {item.subtitle && <p className="rental-terms-subtitle" lang="el">{item.subtitle}</p>}
                <p className="rental-terms-format">PDF document</p>
              </div>
              <div className="rental-terms-actions">
                <a
                  className="rental-terms-button rental-terms-preview"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Preview ${item.id === 'english' ? 'English' : 'Greek'} terms PDF`}
                  onClick={() => openPreview(item)}
                >
                  <TermsIcon name="eye" />
                  Preview
                </a>
                <a
                  className="rental-terms-button rental-terms-download"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  aria-label={`Download ${item.id === 'english' ? 'English' : 'Greek'} terms PDF`}
                >
                  <TermsIcon name="download" />
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>

        {preview && (
          <section className="rental-terms-preview-panel" aria-label={`${preview.lang} terms PDF preview`}>
            <div className="rental-terms-preview-header">
              <h2>{preview.title}</h2>
              <button type="button" onClick={closePreview} aria-label="Close preview">
                <TermsIcon name="close" />
                Close preview
              </button>
            </div>
            {previewFailed ? (
              <p className="rental-terms-preview-fallback" role="status">
                Preview unavailable, <a href={preview.url} target="_blank" rel="noopener noreferrer">open the PDF in a new tab</a>.
              </p>
            ) : (
              <>
                <iframe
                  src={preview.url}
                  title={`${preview.title} PDF preview`}
                  height="700"
                  onLoad={() => setPreviewLoaded(true)}
                  onError={() => setPreviewFailed(true)}
                />
                <p className="rental-terms-preview-hint">
                  If the preview is unavailable, <a href={preview.url} target="_blank" rel="noopener noreferrer">open the PDF in a new tab</a>.
                </p>
              </>
            )}
          </section>
        )}

        <aside className="rental-conditions-help">
          <div className="rental-conditions-help-copy">
            <TermsIcon name="info" />
            <p>Questions about our rental conditions? Check our FAQ or contact us.</p>
          </div>
          <div className="rental-conditions-help-actions">
            <a href="/faq">Read the FAQ</a>
            <a href="/contact">Contact us</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

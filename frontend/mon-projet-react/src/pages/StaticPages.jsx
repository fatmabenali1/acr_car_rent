export function StaticPages({ faq = [], rentalInfo = {}, contactInfo = {}, staticPage, setStaticPage, lang = 'en', loading, error }) {
  return (
    <section className="page page-static">
      {loading && <div className="state-box">Loading information…</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="faq-list">
            {faq.length ? (
              faq.map((item) => (
                <details key={item.id || item.key}>
                  <summary>{item.question || item.key || 'Question'}</summary>
                  <p>{item.answer || ''}</p>
                </details>
              ))
            ) : (
              <div className="state-box">No FAQ entries.</div>
            )}
          </div>

          <div className="rental-info-box">
            <h3>Rental info</h3>
            <pre>{JSON.stringify(rentalInfo, null, 2)}</pre>
          </div>

          <div className="contact-info-box">
            <h3>Contact</h3>
            <pre>{JSON.stringify(contactInfo, null, 2)}</pre>
          </div>

          {staticPage && (
            <div className="static-page-box">
              <h3>{staticPage}</h3>
            </div>
          )}
        </>
      )}
    </section>
  )
}

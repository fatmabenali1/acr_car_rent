export function StaticPages({ faq = [], rentalInfo = {}, contactInfo = {}, staticPage, lang = 'en', loading, error }) {
  const isGreek = lang === 'el'
  return (
    <section className="page page-static">
      {loading && <div className="state-box">{isGreek ? 'Φόρτωση πληροφοριών…' : 'Loading information…'}</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="faq-list">
            {faq.length ? (
              faq.map((item) => (
                <details key={item.id || item.key}>
                  <summary>{item.question || item.key || (isGreek ? 'Ερώτηση' : 'Question')}</summary>
                  <p>{item.answer || ''}</p>
                </details>
              ))
            ) : (
              <div className="state-box">{isGreek ? 'Δεν υπάρχουν συχνές ερωτήσεις.' : 'No FAQ entries.'}</div>
            )}
          </div>

          <div className="rental-info-box">
            <h3>{isGreek ? 'Πληροφορίες ενοικίασης' : 'Rental info'}</h3>
            <pre>{JSON.stringify(rentalInfo, null, 2)}</pre>
          </div>

          <div className="contact-info-box">
            <h3>{isGreek ? 'Επικοινωνία' : 'Contact'}</h3>
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

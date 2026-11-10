export function FleetPages({ groups = [], vehicles = [], lang = 'en', loading, error, fallbackImage }) {
  return (
    <section className="page page-fleet">
      {loading && <div className="state-box">{lang === 'el' ? 'Φόρτωση στόλου…' : 'Loading fleet…'}</div>}
      {error && !loading && <div className="state-box error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="tab-group">
            {groups.length ? (
              groups.map((group) => (
                <button key={group.slug || group.name?.[lang] || group.name} type="button" className="tab-button">
                  {group.name?.[lang] || group.name || group.slug || 'Group'}
                </button>
              ))
            ) : (
              <div className="state-box">{lang === 'el' ? 'Δεν υπάρχουν διαθέσιμες ομάδες οχημάτων.' : 'No vehicle groups available.'}</div>
            )}
          </div>

          <div className="fleet-grid">
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <article key={vehicle.id || vehicle.slug} className="vehicle-card">
                  <img src={vehicle.imageUrl || fallbackImage} alt={vehicle.name || 'Vehicle'} />
                  <h3>{vehicle.name || vehicle.slug || 'Vehicle'}</h3>
                  <p>{vehicle.description || ''}</p>
                  <ul>
                    <li>{vehicle.transmission || 'Manual'}</li>
                    <li>{vehicle.seats || 0} {lang === 'el' ? 'θέσεις' : 'seats'}</li>
                    <li>{vehicle.luggageMaxLitres || 0} {lang === 'el' ? 'αποσκευές' : 'luggage'}</li>
                  </ul>
                </article>
              ))
            ) : (
              <div className="state-box">{lang === 'el' ? 'Δεν υπάρχουν διαθέσιμα οχήματα.' : 'No vehicles available.'}</div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

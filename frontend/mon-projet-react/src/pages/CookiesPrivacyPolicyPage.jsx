import { useEffect, useState } from 'react'
import { ArrowUp, Printer } from 'lucide-react'
import {
  configuredCookieServices,
  defaultCookiePreferences,
  readCookiePreferences,
  saveCookiePreferences,
} from '../api/cookie-preferences.js'
import './CookiesPrivacyPolicyPage.css'

const sections = [
  { id: 'owner-and-data-controller', title: 'Owner and Data Controller', titleEl: 'Υπεύθυνος επεξεργασίας δεδομένων' },
  { id: 'types-of-data-collected', title: 'Types of Data collected', titleEl: 'Τύποι δεδομένων που συλλέγονται' },
  { id: 'how-we-secure-your-personal-information', title: 'How we secure your personal information', titleEl: 'Πώς προστατεύουμε τα προσωπικά σας δεδομένα' },
  { id: 'retention-time', title: 'Retention time', titleEl: 'Χρόνος διατήρησης' },
  { id: 'the-rights-of-users', title: 'The rights of Users', titleEl: 'Τα δικαιώματα των χρηστών' },
  { id: 'use-of-cookies', title: 'Use of cookies', titleEl: 'Χρήση cookies' },
  { id: 'system-logs-and-maintenance', title: 'System logs and maintenance', titleEl: 'Αρχεία καταγραφής και συντήρηση συστήματος' },
]

const rights = [
  { en: 'to correct your personal information', el: 'να διορθώσετε τα προσωπικά σας δεδομένα' },
  { en: 'to have your personal information deleted', el: 'να ζητήσετε τη διαγραφή των προσωπικών σας δεδομένων' },
  { en: 'to restrict the use of your personal information', el: 'να περιορίσετε τη χρήση των προσωπικών σας δεδομένων' },
  { en: 'to object to the use of your personal information', el: 'να αντιταχθείτε στη χρήση των προσωπικών σας δεδομένων' },
  { en: 'to complain to a supervisory authority', el: 'να υποβάλετε καταγγελία σε εποπτική αρχή' },
  { en: 'to withdraw your consent to the use of your personal information', el: 'να ανακαλέσετε τη συγκατάθεσή σας για τη χρήση των προσωπικών σας δεδομένων' },
]

const cookieServices = [
  {
    id: 'googleAds',
    title: 'Google Ads',
    titleEl: 'Google Ads',
    description: 'Google Ads is an advertising service by Google for businesses that want to display ads on Google search results and its advertising network.',
    descriptionEl: 'Το Google Ads είναι μια διαφημιστική υπηρεσία της Google για επιχειρήσεις που θέλουν να προβάλλουν διαφημίσεις στα αποτελέσματα αναζήτησης και στο διαφημιστικό της δίκτυο.',
    policyUrl: 'https://policies.google.com/technologies/ads?hl=en',
  },
  {
    id: 'googleAnalytics',
    title: 'Google Analytics',
    titleEl: 'Google Analytics',
    description: 'Google Analytics is a web analytics service offered by Google that tracks and reports website traffic.',
    descriptionEl: 'Το Google Analytics είναι μια υπηρεσία ανάλυσης ιστού της Google που παρακολουθεί και αναφέρει την επισκεψιμότητα ενός ιστοτόπου.',
    policyUrl: 'https://policies.google.com/privacy?hl=en',
  },
  {
    id: 'recaptcha',
    title: 'Google reCaptcha',
    titleEl: 'Google reCaptcha',
    description: 'Google reCaptcha enables web hosts to distinguish between human and automated access to websites.',
    descriptionEl: 'Το Google reCaptcha βοηθά τους διαχειριστές ιστοτόπων να διακρίνουν την ανθρώπινη από την αυτοματοποιημένη πρόσβαση.',
    policyUrl: 'https://policies.google.com/privacy?hl=en',
  },
]

function getInitialCookiePreferences() {
  try {
    return {
      preferences: readCookiePreferences() || defaultCookiePreferences,
      error: '',
    }
  } catch {
    return {
      preferences: defaultCookiePreferences,
      error: 'Cookie preferences could not be read from this browser.',
    }
  }
}

function CookieToc({ activeSection, lang }) {
  const isGreek = lang === 'el'
  return (
    <>
      <nav className="cookies-toc cookies-toc--desktop" aria-label={isGreek ? 'Ενότητες πολιτικής απορρήτου' : 'Privacy policy sections'}>
        <p>{isGreek ? 'ΣΕ ΑΥΤΗ ΤΗ ΣΕΛΙΔΑ' : 'ON THIS PAGE'}</p>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={activeSection === section.id ? 'location' : undefined}
            className={activeSection === section.id ? 'is-active' : ''}
          >
            {isGreek ? section.titleEl : section.title}
          </a>
        ))}
      </nav>
      <details className="cookies-toc-mobile">
        <summary>{isGreek ? 'Σε αυτή τη σελίδα' : 'On this page'}</summary>
        <nav aria-label={isGreek ? 'Ενότητες πολιτικής απορρήτου' : 'Privacy policy sections'}>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined}>
              {isGreek ? section.titleEl : section.title}
            </a>
          ))}
        </nav>
      </details>
    </>
  )
}

function CookiePreferenceCard({ service, enabled, configured, onChange, lang }) {
  const isGreek = lang === 'el'
  const toggleId = `cookie-toggle-${service.id}`

  return (
    <article className="cookies-service-card">
      <h3>{isGreek ? service.titleEl : service.title}</h3>
      <p>{isGreek ? service.descriptionEl : service.description}</p>
      <a href={isGreek ? service.policyUrl.replace('hl=en', 'hl=el') : service.policyUrl} target="_blank" rel="noreferrer">{isGreek ? 'Πολιτική απορρήτου' : 'Privacy Policy'}</a>
      <div className="cookies-switch-row">
        <span>{isGreek ? `${enabled ? 'Αποδοχή' : 'Απόρριψη'} ${service.titleEl}` : `${enabled ? 'Allow' : 'Reject'} ${service.title}`}</span>
        <button
          id={toggleId}
          className="cookies-switch"
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={isGreek ? `${enabled ? 'Αποδοχή' : 'Απόρριψη'} ${service.titleEl}` : `${enabled ? 'Allow' : 'Reject'} ${service.title}`}
          onClick={() => onChange(service.id, !enabled)}
        >
          <span />
        </button>
      </div>
      {!configured && <small className="cookies-service-note">{isGreek ? 'Δεν έχει ρυθμιστεί αναγνωριστικό υπηρεσίας· δεν θα φορτωθεί κανένα script.' : 'No service ID is configured; no script will be loaded.'}</small>}
    </article>
  )
}

export function CookiesPrivacyPolicyPage({ lang = 'en', onSavePreferences }) {
  const isGreek = lang === 'el'
  const [initialPreferences] = useState(getInitialCookiePreferences)
  const [preferences, setPreferences] = useState(initialPreferences.preferences)
  const [activeSection, setActiveSection] = useState(sections[0].id)
  const [saveMessage, setSaveMessage] = useState(
    isGreek && initialPreferences.error
      ? 'Δεν ήταν δυνατή η ανάγνωση των προτιμήσεων cookies από αυτό το πρόγραμμα περιήγησης.'
      : initialPreferences.error,
  )
  const [saving, setSaving] = useState(false)
  const configured = configuredCookieServices()

  useEffect(() => {
    const previousTitle = document.title
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta')
    const createdMeta = !meta.isConnected
    const previousDescription = createdMeta ? undefined : meta.content

    if (createdMeta) {
      meta.name = 'description'
      document.head.append(meta)
    }
    document.title = isGreek ? 'Πολιτική Cookies και Απορρήτου | Athens Car Rental ACR' : 'Cookies & Privacy Policy | Athens Car Rental ACR'
    meta.content = isGreek
      ? 'Διαβάστε την πολιτική Cookies και Απορρήτου της Athens Car Rental ACR και διαχειριστείτε τις προτιμήσεις σας για cookies.'
      : 'Read the Athens Car Rental ACR cookies and privacy policy, manage cookie preferences, and learn how personal data is used.'

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveSection(visible.target.id)
      }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 })
      : null

    for (const section of sections) {
      const element = document.getElementById(section.id)
      if (observer && element) observer.observe(element)
    }

    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
      })
    }

    return () => {
      observer?.disconnect()
      document.title = previousTitle
      if (previousDescription === undefined) meta.remove()
      else meta.content = previousDescription
    }
  }, [isGreek])

  const updatePreference = (id, value) => {
    setPreferences((current) => ({ ...current, [id]: value }))
    setSaveMessage('')
  }

  const saveChoices = async (nextPreferences) => {
    setSaving(true)
    try {
      const saved = onSavePreferences
        ? await onSavePreferences(nextPreferences)
        : saveCookiePreferences(nextPreferences)
      setPreferences(saved)
      setSaveMessage(isGreek ? 'Οι επιλογές σας για τα cookies αποθηκεύτηκαν.' : 'Your cookie choices have been saved.')
    } catch {
      setSaveMessage(isGreek ? 'Δεν ήταν δυνατή η αποθήκευση των επιλογών σας για τα cookies. Δοκιμάστε ξανά.' : 'Your cookie choices could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cookies-page" lang={lang}>
      <header className="cookies-hero">
        <div className="cookies-container">
          <nav className="cookies-breadcrumb" aria-label={isGreek ? 'Διαδρομή πλοήγησης' : 'Breadcrumb'}>
            <a href="/">{isGreek ? 'Αρχική' : 'Home'}</a><span aria-hidden="true">›</span><span aria-current="page">{isGreek ? 'Πολιτική Cookies και Απορρήτου' : 'Cookies &amp; Privacy Policy'}</span>
          </nav>
          <p className="cookies-eyebrow">ATHENS CAR RENTAL · ACR</p>
          <h1>{isGreek ? 'Πολιτική Cookies και Απορρήτου' : 'Cookies &amp; Privacy Policy'}</h1>
          <div className="cookies-toolbar" aria-label={isGreek ? 'Ρυθμίσεις προτιμήσεων cookies' : 'Cookie preference controls'}>
            <button type="button" className="cookies-print-button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />{isGreek ? 'Εκτύπωση σελίδας' : 'Print this page'}</button>
          </div>
          {saveMessage && <p className="cookies-save-message" role="status">{saveMessage}</p>}
        </div>
      </header>

      <div className="cookies-container cookies-layout">
        <CookieToc activeSection={activeSection} lang={lang} />
        <article className="cookies-article">
          <p className="cookies-policy-subtitle">{isGreek ? 'Πολιτική προστασίας προσωπικών δεδομένων και cookies του www.athens-carrental.com' : 'Data Protection Privacy &amp; Cookies Policy of www.athens-carrental.com'}</p>
          <p>{isGreek
            ? 'Αυτός ο ιστότοπος συλλέγει ορισμένα προσωπικά δεδομένα και cookies του προγράμματος περιήγησης από τους χρήστες του. Η παρούσα Πολιτική Απορρήτου περιγράφει τον τρόπο με τον οποίο λαμβάνουμε, αποθηκεύουμε και χρησιμοποιούμε τα προσωπικά σας δεδομένα όταν χρησιμοποιείτε ή αλληλεπιδράτε με τον ιστότοπό μας ή όταν συλλέγουμε με άλλο τρόπο τα προσωπικά σας δεδομένα. Διαβάστε προσεκτικά την παρούσα Πολιτική Απορρήτου. Συνιστούμε να εκτυπώσετε ένα αντίγραφο της παρούσας Πολιτικής Απορρήτου και κάθε μελλοντικής έκδοσης που θα ισχύει κατά καιρούς, για το αρχείο σας.'
            : 'This Website collects some Personal Data and Browser Cookies from its Users. This Privacy Policy sets out how we obtain, store and use your personal information when you use or interact with our website or where we otherwise obtain or collect your personal information. Please read this Privacy Policy carefully. We recommend that you print off a copy of this Privacy Policy and any future versions in force from time to time for your records.'}</p>

          <section id="owner-and-data-controller" className="cookies-section">
            <h2>{isGreek ? 'Υπεύθυνος επεξεργασίας δεδομένων' : 'Owner and Data Controller'}</h2>
            <div className="cookies-owner-card">
              <p>KGH TOURISM CORPORATION LIMITED<br />
                VAT ID : 998797132<br />
                Athens Car Rental - ACR<br />
                {isGreek ? '3ο χλμ. Λεωφόρου Μαρκοπούλου - Παιανίας' : '3rd km Markopoulou Avenue - Paiania'}<br />
                {isGreek ? '(Κορωπί, Τ.Κ. 19400)' : '(Koropi, PC 19400)'}</p>
              <p>{isGreek ? 'Τηλ:' : 'Tel:'} <a href="tel:+302106022220">+30 2106022220</a><br />
                {isGreek ? 'Φαξ:' : 'Fax:'} <a href="tel:+302106624887">+30 2106624887</a><br />
                {isGreek ? 'Email:' : 'E-mail:'} <a href="mailto:info@acr.gr">info@acr.gr</a></p>
            </div>
          </section>

          <section id="types-of-data-collected" className="cookies-section">
            <h2>{isGreek ? 'Τύποι δεδομένων που συλλέγονται' : 'Types of Data collected'}</h2>
            <p>{isGreek
              ? 'Όταν υποβάλλετε παραγγελία ή αίτημα στον ιστότοπό μας, ζητάμε το όνομά σας, τη διεύθυνση, τον αριθμό τηλεφώνου, τη διεύθυνση email και άλλα προσωπικά δεδομένα. Αυτά μας βοηθούν να επεξεργαστούμε την αίτηση ή την κράτησή σας, να επικοινωνήσουμε μαζί σας αν προκύψει κάποιο πρόβλημα με το αίτημά σας ή να σας στείλουμε επιβεβαίωση κουπονιού ή απόδειξη αγοράς.'
              : 'When placing an order or a request on our website we ask for your name, address, telephone number, e-mail address and other personal information. This helps us to process your application or reservation, to contact you if we have any problems with your request or to send you an voucher confirmation or receipt for your purchase.'}</p>
            <p>{isGreek
              ? 'Οι χρήστες που δεν είναι βέβαιοι ποια προσωπικά δεδομένα είναι υποχρεωτικά μπορούν να επικοινωνήσουν με τον Υπεύθυνο Επεξεργασίας. Οι χρήστες μπορούν ανά πάσα στιγμή να δουν τις πληροφορίες που τηρούνται για αυτούς και να κάνουν τις απαραίτητες διορθώσεις ώστε να παραμένουν ενημερωμένες.'
              : 'Users who are uncertain about which Personal Data is mandatory are welcome to contact the Owner. Users are welcome to see the information held about them at any time and to make the necessary amendments to keep the information up to date.'}</p>
          </section>

          <section id="how-we-secure-your-personal-information" className="cookies-section">
            <h2>{isGreek ? 'Πώς προστατεύουμε τα προσωπικά σας δεδομένα' : 'How we secure your personal information'}</h2>
            <p>{isGreek
              ? 'Για την προστασία των πληροφοριών εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα, όπως αποθήκευση των προσωπικών σας δεδομένων σε ασφαλείς διακομιστές, κρυπτογράφηση των μεταφορών δεδομένων προς και από τους διακομιστές μας, κρυπτογράφηση πληρωμών στον ιστότοπό μας μέσω Secure Sockets Layer (SSL)] και πρόσβαση στα προσωπικά σας δεδομένα μόνο όταν είναι απαραίτητη. Αν για οποιονδήποτε λόγο χρειαστεί να μεταφέρουμε τα προσωπικά σας δεδομένα εκτός του Ευρωπαϊκού Οικονομικού Χώρου, θα διασφαλίσουμε ότι εφαρμόζονται οι κατάλληλες εγγυήσεις.'
              : 'If any security is needed to protect information we use the appropriate technical and organizational measures such as storing your personal information on secure servers, encrypting transfers of data to or from our servers, encrypting payments on our site through Secure Sockets Layer (SSL)] and only granting access to your personal information where necessary. If for any reason we need to transfer your personal information outside of the European Economic Area we will ensure appropriate safeguards are in place.'}</p>
          </section>

          <section id="retention-time" className="cookies-section">
            <h2>{isGreek ? 'Χρόνος διατήρησης' : 'Retention time'}</h2>
            <p>{isGreek
              ? 'Τα προσωπικά δεδομένα υποβάλλονται σε επεξεργασία και αποθηκεύονται για όσο διάστημα απαιτείται για τον σκοπό για τον οποίο συλλέχθηκαν. Διατηρούμε τα προσωπικά δεδομένα που παρέχουν οι πελάτες μας στα αρχεία μας, ώστε να υποστηρίζουμε και να βελτιώνουμε την επιχείρησή μας.'
              : 'Personal Data shall be processed and stored for as long as required by the purpose they have been collected for. We will maintain the personal information provided by our customers as part of our records to assist us to maintain and improve our business.'}</p>
            <p>{isGreek
              ? 'Διατηρούμε τα προσωπικά σας δεδομένα μόνο για όσο διάστημα είναι απαραίτητο, λαμβάνοντας υπόψη τυχόν νομικές υποχρεώσεις μας (π.χ. τήρηση αρχείων για φορολογικούς σκοπούς) και κάθε άλλη νόμιμη βάση για τη χρήση τους, όπως η συγκατάθεσή σας, η εκτέλεση σύμβασης μαζί σας ή τα έννομα επιχειρηματικά συμφέροντά μας.'
              : 'We retain your personal information for no longer than necessary, taking into account any legal obligations we have (e.g. to maintain records for Tax purposes) and any other legal basis we have for using your personal information e.g. your agreement, performance of a contract with you or our legitimate interests as a business.'}</p>
          </section>

          <section id="the-rights-of-users" className="cookies-section">
            <h2>{isGreek ? 'Τα δικαιώματα των χρηστών' : 'The rights of Users'}</h2>
            <p>{isGreek ? 'Οι χρήστες μπορούν να ασκήσουν ορισμένα δικαιώματα σχετικά με τα δεδομένα που επεξεργάζεται ο Υπεύθυνος Επεξεργασίας.' : 'Users may exercise certain rights regarding their Data processed by the Owner.'}</p>
            <p>{isGreek ? 'Τα δικαιώματά σας σχετικά με τα προσωπικά σας δεδομένα περιλαμβάνουν την πρόσβαση σε αυτά και την ενημέρωση για τη χρήση τους:' : 'Your rights in relation to your personal information to access your personal information and to be informed about its use :'}</p>
            <ul className="cookies-rights-list">
              {rights.map((right) => <li key={right.en}>{isGreek ? right.el : right.en}</li>)}
            </ul>
          </section>

          <section id="use-of-cookies" className="cookies-section">
            <h2>{isGreek ? 'Χρήση cookies' : 'Use of cookies'}</h2>
            <p>{isGreek
              ? 'Αυτός ο ιστότοπος χρησιμοποιεί cookies για τη βελτίωση της εμπειρίας των χρηστών. Όπου εφαρμόζεται, διαθέτει σύστημα ελέγχου cookies που επιτρέπει στον χρήστη, κατά την πρώτη επίσκεψη, να επιτρέψει ή να απορρίψει τη χρήση cookies στον υπολογιστή ή τη συσκευή του.'
              : 'This website uses cookies to better the users experience while visiting the website. Where applicable this website uses a cookie control system allowing the user on their first visit to the website to allow or disallow the use of cookies on their computer / device.'}</p>
            <p>{isGreek
              ? <>Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες συλλογής πληροφοριών, όπως το Google Analytics. Για περισσότερες πληροφορίες σχετικά με τη χρήση cookies από το Google Analytics, επισκεφθείτε τον ιστότοπο της Google. Για διευκόλυνσή σας, παρέχεται σύνδεσμος προς τις πληροφορίες απορρήτου του προϊόντος: <a href="https://business.safety.google/privacy/">https://business.safety.google/privacy/</a>. Τα cookies είναι σύνολα δεδομένων που αποθηκεύει ο διακομιστής ενός ιστοτόπου στον υπολογιστή σας. Επιτρέπουν στον ιστότοπο να αναγνωρίζει τον υπολογιστή σας και να «θυμάται» τις καταχωρίσεις σας κατά την πλοήγηση μεταξύ σελίδων ή σε επόμενες επισκέψεις από την ίδια συσκευή. Το πρόγραμμα περιήγησής σας ή άλλο λογισμικό μπορεί να σας επιτρέπει να περιορίσετε τη χρήση μόνιμων ή όλων των cookies. Μπορείτε να διαχειριστείτε τους περιορισμούς μέσω του προγράμματος περιήγησής σας.</>
              : <>We use cookies and similar information-gathering technologies such as Google analytics. For more information on the usage of cookies by Google Analytics please see the Google website. A link to the privacy advice for this product is provided below for your convenience. <a href="https://business.safety.google/privacy/">https://business.safety.google/privacy/</a>. Cookies is a set of data that a website server stores on your computer. Cookies enable website to recognize your computer and to &quot;remember&quot; your entries as you move from page to page, or even when you visit the site from time to time using the same computer. Your browser or other software you install may permit you to restrict the use of persistent cookies or all cookies. If you would like to restrict the use of cookies you can control this in your Internet browser.</>}</p>
            <p>{isGreek ? 'Τα cookies που χρησιμοποιούνται στον ιστότοπο ταξινομούνται σε κατηγορίες. Παρακάτω μπορείτε να διαβάσετε για καθεμία και να επιτρέψετε ή να απορρίψετε ορισμένες ή όλες.' : 'Cookies used on the site are categorized and below you can read about each category and allow or deny some or all of them.'}</p>
            <div className="cookies-service-actions">
              <button type="button" disabled={saving} onClick={() => saveChoices({ googleAds: true, googleAnalytics: true, recaptcha: true })}>{isGreek ? 'Αποδοχή όλων' : 'Accept all'}</button>
              <button type="button" className="cookies-button-secondary" disabled={saving} onClick={() => saveChoices(defaultCookiePreferences)}>{isGreek ? 'Απόρριψη όλων' : 'Reject all'}</button>
              <button type="button" className="cookies-button-secondary" disabled={saving} onClick={() => saveChoices(preferences)}>{isGreek ? 'Αποθήκευση επιλογών' : 'Save my choices'}</button>
            </div>
            <div id="cookie-categories" className="cookies-service-grid">
              {cookieServices.map((service) => (
                <CookiePreferenceCard
                  key={service.id}
                  service={service}
                  enabled={preferences[service.id]}
                  configured={configured[service.id]}
                  onChange={updatePreference}
                  lang={lang}
                />
              ))}
            </div>
          </section>

          <section id="system-logs-and-maintenance" className="cookies-section">
            <h2>{isGreek ? 'Αρχεία καταγραφής και συντήρηση συστήματος' : 'System logs and maintenance'}</h2>
            <p>{isGreek
              ? 'Για σκοπούς λειτουργίας και συντήρησης, ο παρών ιστότοπος και υπηρεσίες τρίτων ενδέχεται να συλλέγουν αρχεία που καταγράφουν την αλληλεπίδραση με τον ιστότοπο (αρχεία καταγραφής συστήματος) και να χρησιμοποιούν άλλα προσωπικά δεδομένα (όπως τη διεύθυνση IP) για τον σκοπό αυτό. Συλλέγουμε τη διεύθυνση IP σας όταν επισκέπτεστε τον ιστότοπό μας. Αυτή προσδιορίζει μόνο τον πάροχο υπηρεσιών διαδικτύου σας (Internet Servi'
              : 'For operation and maintenance purposes, this Website and any third-party services may collect files that record interaction with this Website (System logs) use other Personal Data (such as the IP Address) for this purpose. We collect your IP address when you visit our site. This only identifies your ISP (Internet Servi'}</p>
          </section>
        </article>
      </div>

      <button className="cookies-back-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={isGreek ? 'Επιστροφή στην κορυφή' : 'Back to top'}>
        <ArrowUp size={19} aria-hidden="true" />
      </button>
    </div>
  )
}

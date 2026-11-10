import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import './AttikaRoutesPage.css'

const destinations = [
  {
    name: 'Sounion',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Attica_06-13_Sounion_19_Temple_of_Poseidon.jpg/1280px-Attica_06-13_Sounion_19_Temple_of_Poseidon.jpg',
    imageAlt: 'Temple of Poseidon at Cape Sounion overlooking the Aegean Sea',
    imageAltEl: 'Ο Ναός του Ποσειδώνα στο ακρωτήριο Σούνιο με θέα στο Αιγαίο Πέλαγος',
    credit: 'A.Savin · CC BY-SA 3.0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Attica_06-13_Sounion_19_Temple_of_Poseidon.jpg',
    text: "A short distance from our car rental office and Athens International Airport, on the southern tip of the Attica prefecture, is the popular seaside resort of Sounion. The area is famous for its impressive Temple of Poseidon, a great historical monument specimen of ancient Greek architecture and culture. The temple is situated above the Cape of Sounion overlooking the nig blue of the Aegean Sea. Recently, Sounion has become one of Attica's prime holiday spots, with sandy beaches, sparkling waters and an abundance of hotels, night clubs, posh restaurants and traditional taverns.",
    textEl: 'Σε μικρή απόσταση από το γραφείο ενοικίασης αυτοκινήτων μας και το Διεθνές Αεροδρόμιο Αθηνών, στο νότιο άκρο της περιφέρειας της Αττικής, βρίσκεται το δημοφιλές παραθαλάσσιο θέρετρο του Σουνίου. Η περιοχή είναι γνωστή για τον εντυπωσιακό Ναό του Ποσειδώνα, ένα σπουδαίο ιστορικό μνημείο της αρχαίας ελληνικής αρχιτεκτονικής και του πολιτισμού. Ο ναός βρίσκεται πάνω από το ακρωτήριο του Σουνίου και αγναντεύει το βαθύ μπλε του Αιγαίου. Τα τελευταία χρόνια, το Σούνιο έχει γίνει ένας από τους σημαντικότερους προορισμούς διακοπών της Αττικής, με αμμώδεις παραλίες, κρυστάλλινα νερά και πολλά ξενοδοχεία, νυχτερινά κέντρα, πολυτελή εστιατόρια και παραδοσιακές ταβέρνες.',
  },
  {
    name: 'Aegina Island',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Aegina_harbour_embankment.jpg/1280px-Aegina_harbour_embankment.jpg',
    imageAlt: 'Harbour embankment on Aegina Island, Greece',
    imageAltEl: 'Το παραλιακό μέτωπο του λιμανιού στην Αίγινα, Ελλάδα',
    credit: 'Jebulon · CC0',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Aegina_harbour_embankment.jpg',
    text: 'The island of Aegina is one of the Saronic Islands of Greece in the Saronic Gulf. It is surrounded by the islands of Agistri, Salamina, Methana, Poros and Trizina. The island\'s beauty is unique and the trip to Aegina from Piraeus lasts 1 hour and 15 minutes. Aegina is known for its rich history. Milestones are the Temple of Aphaia, the Monastery of Agios Nektarios, the statue of the first governor of Modern Greece, Ioannis Kapodistrias, and the Temple of Zeus Chellanios. The many beautiful churches with distinctive landscape that smoothes the visitors and the beautiful beaches constitute a unique destination, very close to Athens.',
    textEl: 'Η Αίγινα είναι ένα από τα νησιά του Σαρωνικού Κόλπου. Περιβάλλεται από τα νησιά Αγκίστρι, Σαλαμίνα, Μέθανα, Πόρο και Τροιζηνία. Η ομορφιά του νησιού είναι μοναδική και το ταξίδι από τον Πειραιά διαρκεί 1 ώρα και 15 λεπτά. Η Αίγινα είναι γνωστή για την πλούσια ιστορία της. Σημαντικά αξιοθέατα είναι ο Ναός της Αφαίας, το μοναστήρι του Αγίου Νεκταρίου, το άγαλμα του πρώτου κυβερνήτη της νεότερης Ελλάδας, Ιωάννη Καποδίστρια, και ο Ναός του Δία Ελλάνιου. Οι πολλές όμορφες εκκλησίες, το ξεχωριστό τοπίο και οι υπέροχες παραλίες συνθέτουν έναν μοναδικό προορισμό, πολύ κοντά στην Αθήνα.',
  },
]

export function AttikaRoutesPage({ lang = 'en' }) {
  const isGreek = lang === 'el'
  useEffect(() => {
    const previousTitle = document.title
    const descriptionMeta = document.querySelector('meta[name="description"]')
    const previousDescription = descriptionMeta?.content
    const meta = descriptionMeta || document.createElement('meta')

    if (!descriptionMeta) {
      meta.name = 'description'
      document.head.append(meta)
    }

    document.title = isGreek ? 'Διαδρομές Αττικής | Athens Car Rental' : 'Attika Routes | Athens Car Rental'
    meta.content = isGreek
      ? 'Εξερευνήστε το Σούνιο και την Αίγινα με την Athens Car Rental και οργανώστε τη διαδρομή σας από την Αθήνα.'
      : 'Explore Sounion and Aegina Island with Athens Car Rental. Discover Attika routes and plan your trip from Athens.'

    return () => {
      document.title = previousTitle
      if (previousDescription === undefined) meta.remove()
      else meta.content = previousDescription
    }
  }, [isGreek])

  return (
    <div className="attika-page" lang={lang}>
      <header className="attika-hero">
        <div className="attika-container">
          <p className="attika-eyebrow">ATHENS CAR RENTAL · GREECE</p>
          <h1>{isGreek ? 'Διαδρομές Αττικής' : 'Attika Routes'}</h1>
          <span className="attika-title-mark" aria-hidden="true" />
        </div>
      </header>

      <div className="attika-container attika-destinations">
        {destinations.map((destination, index) => (
          <article className={`attika-destination${index % 2 ? ' attika-destination--reverse' : ''}`} key={destination.name}>
            <figure className="attika-photo">
              <img src={destination.image} alt={isGreek ? destination.imageAltEl : destination.imageAlt} loading="lazy" />
              <figcaption>
                {isGreek ? 'Φωτογραφία: ' : 'Photo: '}<a href={destination.creditUrl} target="_blank" rel="noreferrer">{destination.credit}</a>
              </figcaption>
            </figure>
            <div className="attika-copy">
              <span className="attika-index">0{index + 1} / {isGreek ? 'ΠΡΟΟΡΙΣΜΟΣ' : 'DESTINATION'}</span>
              <h2>{destination.name}</h2>
              <p>{isGreek ? destination.textEl : destination.text}</p>
            </div>
          </article>
        ))}

        <div className="attika-cta">
          <a href="/quote">
            {isGreek ? 'Ζητήστε προσφορά' : 'Request a quote'} <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}

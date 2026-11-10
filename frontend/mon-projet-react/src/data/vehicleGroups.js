import { categories } from './categories.js'

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))

const groupDefinitions = [
  {
    slug: 'standard-cars',
    title: 'Standard Cars',
    titleEl: 'Αυτοκίνητα στάνταρ κατηγορίας',
    description: 'Browse the Category D Manual car available from Athens Car Rental.',
    descriptionEl: 'Δείτε το αυτοκίνητο Category D Manual που προσφέρει η Athens Car Rental.',
    featured: [
      { categorySlug: 'category-d-manual' },
    ],
  },
  {
    slug: 'automatic-cars',
    title: 'Automatic Cars',
    titleEl: 'Αυτόματα αυτοκίνητα',
    description: 'Explore Category E and Category E1 automatic cars available in Athens.',
    descriptionEl: 'Εξερευνήστε τα αυτόματα αυτοκίνητα Category E και Category E1 που διατίθενται στην Αθήνα.',
    featured: [
      { categorySlug: 'category-e-automatic' },
      { categorySlug: 'category-e1-automatic' },
    ],
  },
  {
    slug: 'luxury-cars',
    title: 'Luxury Cars',
    titleEl: 'Πολυτελή αυτοκίνητα',
    description: 'Explore luxury cars available for your Athens and Greece travels.',
    descriptionEl: 'Εξερευνήστε πολυτελή αυτοκίνητα για τα ταξίδια σας στην Αθήνα και την Ελλάδα.',
    categoryFilters: ['luxury'],
    featured: [
      { categorySlug: 'category-l1-luxury-automatic' },
      { categorySlug: 'category-l2-luxury-automatic' },
      { categorySlug: 'category-diesel-l5-automatic' },
    ],
  },
  {
    slug: 'mini-vans',
    title: 'Mini Vans',
    titleEl: 'Μίνι βαν',
    description: 'Compare the 7-seat manual and automatic mini vans available from Athens Car Rental.',
    descriptionEl: 'Συγκρίνετε τα χειροκίνητα και αυτόματα μίνι βαν 7 θέσεων που διαθέτει η Athens Car Rental.',
    introTitle: 'Mini Vans',
    introTitleEl: 'Μίνι βαν',
    intro: 'Mini Vans have high quality interior design and comfortable passenger cabin. Mini Vans with their impressive cutting edge technology engine offer fuel economy and are ideal for both long and short distances throughout Athens Region and Greece.',
    introEl: 'Τα μίνι βαν διαθέτουν ποιοτικό εσωτερικό σχεδιασμό και άνετη καμπίνα επιβατών. Οι σύγχρονοι κινητήρες τους προσφέρουν οικονομία καυσίμου και είναι ιδανικοί τόσο για μικρές όσο και για μεγάλες διαδρομές στην Αττική και σε όλη την Ελλάδα.',
    featured: [
      { categorySlug: 'category-f2-automatic' },
      { categorySlug: 'category-f-manual' },
    ],
  },
  {
    slug: 'suvs',
    title: "SUV's",
    titleEl: 'SUV',
    description: 'Discover SUVs available from Athens Car Rental for comfortable trips around Greece.',
    descriptionEl: 'Ανακαλύψτε τα SUV της Athens Car Rental για άνετες μετακινήσεις σε όλη την Ελλάδα.',
    introTitle: "SUV'S",
    introTitleEl: 'SUV',
    intro: "An SUV from our agency is the ideal vehicle for families or groups of people that need luggage space without any compromise on the passenger's legroom. These vehicles are equipped with turbo diesel or unleaded engines and are able to accommodate 5 to 7 passengers.",
    introEl: 'Ένα SUV από την εταιρεία μας είναι ιδανικό για οικογένειες ή παρέες που χρειάζονται χώρο αποσκευών χωρίς συμβιβασμούς στην άνεση των επιβατών. Τα οχήματα διαθέτουν κινητήρες turbo diesel ή βενζίνης και φιλοξενούν 5 έως 7 επιβάτες.',
    categoryFilters: ['suv'],
    featured: [
      { categorySlug: 'category-g2-automatic' },
      { categorySlug: 'category-g1-automatic' },
      { categorySlug: 'category-d3-manual' },
    ],
  },
]

function getCategory(categorySlug) {
  const category = categoryBySlug.get(categorySlug)
  if (!category) {
    throw new Error(`Unknown vehicle category in vehicleGroups data: ${categorySlug}`)
  }
  return category
}

export const vehicleGroups = groupDefinitions.map((group) => ({
  ...group,
  intro: group.intro ?? null,
  featured: group.featured.map(({ categorySlug }) => {
    const category = getCategory(categorySlug)
    return {
      slug: category.slug,
      name: category.name,
      example: category.example,
      specs: category.specs,
      image: category.image,
      carId: category.carId,
      href: `/quote?category=${encodeURIComponent(category.slug)}&car_id=${encodeURIComponent(category.carId ?? '')}`,
      detailsLabel: 'Request a quote',
      detailsLabelEl: 'Ζητήστε προσφορά',
    }
  }),
  categories: group.featured.map(({ categorySlug }) => getCategory(categorySlug)),
}))

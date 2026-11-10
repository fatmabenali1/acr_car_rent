import { categories } from './categories.js'

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))

const groupDefinitions = [
  {
    slug: 'luxury-cars',
    title: 'Luxury Cars',
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
    introTitle: 'Mini Vans',
    intro: 'Mini Vans have high quality interior design and comfortable passenger cabin. Mini Vans with their impressive cutting edge technology engine offer fuel economy and are ideal for both long and short distances throughout Athens Region and Greece.',
    categoryFilters: ['minivans', 'minivanAutomatic'],
    featured: [
      { categorySlug: 'category-f2-automatic' },
      { categorySlug: 'category-f-manual' },
      { categorySlug: 'category-f3-automatic' },
    ],
  },
  {
    slug: 'suvs',
    title: "SUV's",
    introTitle: "SUV'S",
    intro: "An SUV from our agency is the ideal vehicle for families or groups of people that need luggage space without any compromise on the passenger's legroom. These vehicles are equipped with turbo diesel or unleaded engines and are able to accommodate 5 to 7 passengers.",
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
      href: `/fleet/${category.slug}`,
      detailsLabel: 'View more details',
    }
  }),
  categories: categories.filter((category) =>
    category.filters.some((filter) => group.categoryFilters.includes(filter)),
  ),
}))

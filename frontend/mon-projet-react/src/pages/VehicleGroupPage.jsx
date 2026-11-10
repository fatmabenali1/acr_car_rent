import { useEffect, useState } from 'react'
import { CarFront, Luggage, Settings2, Users } from 'lucide-react'
import { vehicleGroups } from '../data/vehicleGroups.js'

const specs = [
  { key: 'seats', label: 'Seats', Icon: Users },
  { key: 'luggage', label: 'Luggage', Icon: Luggage },
  { key: 'gear', label: 'Gear', Icon: Settings2 },
]

function CategoryPhoto({ category }) {
  const [imageError, setImageError] = useState(!category.image)

  if (imageError) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-white p-4">
        <CarFront width={64} height={64} className="h-16 w-16 shrink-0 text-[#111111]/30" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={category.image}
      alt={`${category.name} - ${category.example}`}
      width={800}
      height={600}
      loading="lazy"
      onError={() => setImageError(true)}
      className="aspect-[4/3] w-full bg-white p-4 object-contain"
    />
  )
}

function VehicleCard({ category }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-2 ring-[#FACC15] transition duration-300 hover:-translate-y-1">
      <CategoryPhoto category={category} />
      <div className="flex flex-1 flex-col p-6">
        <span className="mb-3 inline-flex w-fit rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#111111]">
          {category.type}
        </span>
        <h2 className="text-xl font-extrabold text-[#111111]">{category.name}</h2>
        <p className="mt-2 text-sm leading-6 text-[#111111]/70">{category.example}</p>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-xs text-[#111111]">
          {specs.map(({ key, label, Icon }) => (
            <div key={key} className="flex min-w-0 flex-col items-center gap-2 rounded-xl bg-[#F7F4EF] p-3 text-center">
              <Icon width={16} height={16} className="h-4 w-4 shrink-0" aria-hidden="true" />
              <dt className="font-semibold">{label}</dt>
              <dd className="font-medium">{category.specs?.[key] || '—'}</dd>
            </div>
          ))}
        </dl>

        <a
          href={`/fleet/${category.slug}`}
          className="mt-auto inline-flex w-full justify-center rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2"
        >
          View more details
        </a>
      </div>
    </article>
  )
}

export function VehicleGroupPage({ slug }) {
  const group = vehicleGroups.find((item) => item.slug === slug)

  useEffect(() => {
    const previousTitle = document.title
    document.title = group ? `${group.title} | Athens Car Rental` : 'Vehicle group not found | Athens Car Rental'
    return () => {
      document.title = previousTitle
    }
  }, [group])

  if (!group) {
    return (
      <section className="min-h-[50vh] bg-[#F7F4EF] px-4 py-20 text-center text-[#111111]">
        <h1 className="text-3xl font-extrabold">Vehicle group not found</h1>
        <a
          href="/pricelist"
          className="mt-6 inline-flex rounded-xl bg-[#111111] px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2"
        >
          Back to Pricelist &amp; Fleet
        </a>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] font-sans text-[#111111]">
      <section className="bg-[#111111] py-10 text-white lg:py-14">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <a href="/" className="transition hover:text-[#FACC15]">Home</a>
            <span aria-hidden="true">/</span>
            <a href="/pricelist" className="transition hover:text-[#FACC15]">Pricelist &amp; Fleet</a>
            <span aria-hidden="true">/</span>
            <span className="text-white">{group.title}</span>
          </nav>
          <h1 className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl">{group.title}</h1>
        </div>
      </section>

      <main className="mt-[76px] pb-16">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {group.featured.map((category) => (
              <VehicleCard key={category.slug} category={category} />
            ))}
          </div>

          {group.intro && (
            <section className="mt-10 rounded-3xl bg-white p-6 shadow-lg ring-2 ring-[#FACC15] sm:p-8 lg:p-10">
              <h2 className="text-2xl font-extrabold text-[#111111]">{group.introTitle}</h2>
              <div className="mt-4 h-1 w-16 rounded-full bg-[#FACC15]" aria-hidden="true" />
              <p className="mt-5 max-w-5xl leading-7 text-[#111111]/80">{group.intro}</p>
            </section>
          )}

          <section className="mt-10 flex flex-col gap-6 rounded-3xl bg-[#111111] p-6 text-white ring-2 ring-[#FACC15] sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-2xl font-extrabold">Need help choosing?</h2>
              <a href="tel:+302106022220" className="mt-2 inline-flex text-sm font-semibold text-white/80 transition hover:text-[#FACC15]">
                +30 210 6022220
              </a>
            </div>
            <a
              href="/quote"
              className="inline-flex justify-center rounded-xl bg-[#FACC15] px-6 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#FEF3C7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
            >
              Request a quote
            </a>
          </section>
        </div>
      </main>
    </div>
  )
}

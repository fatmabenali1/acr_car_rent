export function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] pb-20 text-[#111111]">
      <section className="w-full bg-[#111111] py-12 text-white lg:py-16">
        <div className="mx-auto w-full max-w-[1760px] px-4 sm:px-6 lg:px-10 2xl:px-16">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <a href="/" className="hover:text-[#FACC15]">Home</a>
            <span className="mx-2" aria-hidden="true">/</span>
            <span aria-current="page">About us</span>
          </nav>
          <h1 className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            About <span className="text-[#FACC15]">Athens Car Rental</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75 sm:text-lg">
            Local car rental service near Athens Airport, helping visitors explore Athens and Greece since 2005.
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 pt-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:pt-14 2xl:px-16">
        <section className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 lg:p-10" aria-labelledby="about-story">
          <h2 id="about-story" className="text-2xl font-extrabold sm:text-3xl">A friendly local rental team</h2>
          <p className="mt-5 leading-relaxed text-slate-700">
            Based in Koropi, near Athens International Airport, Athens Car Rental offers a modern fleet for city trips,
            family holidays and journeys across Greece. Our team aims to make pickup and travel straightforward, with
            personal support and 24-hour road assistance.
          </p>
          <p className="mt-4 leading-relaxed text-slate-700">
            Choose from economical and compact cars, larger family cars, automatic vehicles, mini-vans, SUVs and
            luxury cars. Our rates are designed to be clear, with no hidden extras.
          </p>
          <a
            href="/pricelist"
            className="mt-7 inline-flex rounded-xl bg-[#111111] px-6 py-3 font-bold text-white transition hover:bg-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2"
          >
            Explore our fleet
          </a>
        </section>

        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="About Athens Car Rental">
          <div className="rounded-3xl bg-[#FACC15] p-6">
            <p className="text-4xl font-extrabold">2005</p>
            <p className="mt-2 font-semibold">Serving travelers since</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <p className="text-lg font-extrabold">Koropi, Athens</p>
            <p className="mt-2 leading-relaxed text-slate-700">Close to Athens International Airport, with support for trips throughout Greece.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

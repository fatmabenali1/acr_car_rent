import { useEffect, useState } from 'react'
import {
  Award,
  CalendarCheck,
  MessageSquareHeart,
  Phone,
} from 'lucide-react'
import { ContactHero } from './ContactPage'

const reviewUrl = import.meta.env.VITE_TRIPADVISOR_URL || ''

function TravelersChoiceBadge() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <Award size={64} className="h-16 w-16 shrink-0 text-[#FACC15]" aria-label="Travelers' Choice Award" />
  }

  return (
    <img
      src="/images/tripadvisor-travelers-choice.png"
      alt="Tripadvisor Travelers' Choice Award badge"
      width={220}
      height={112}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-28 w-auto object-contain"
    />
  )
}

const highlights = [
  { icon: Award, text: 'Top 10% of businesses on Tripadvisor' },
  { icon: CalendarCheck, text: '5 consecutive years, 2022 - 2026' },
  { icon: MessageSquareHeart, text: 'Based on genuine traveler reviews' },
]

export function TripadvisorPage() {
  useEffect(() => {
    document.title = "Tripadvisor Travelers' Choice Award | Athens Car Rental"
  }, [])

  return (
    <div className="bg-[#F7F4EF] text-[#111111]">
      <ContactHero
        breadcrumb="Tripadvisor Award"
        eyebrow="TRIPADVISOR"
        title="Travelers' Choice "
        highlight="Award"
        subtitle="Recognized by travelers for five consecutive years."
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl bg-white p-5 shadow-lg ring-2 ring-[#FACC15] sm:p-8 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <TravelersChoiceBadge />
              <div className="flex flex-wrap gap-2" aria-label="Award years">
                {['2022', '2023', '2024', '2025', '2026'].map((year) => (
                  <span key={year} className="rounded-full bg-[#111111] px-3 py-1 text-xs font-bold text-[#FACC15]">{year}</span>
                ))}
              </div>
            </div>

            <h2 className="mt-6 max-w-3xl text-2xl font-extrabold leading-tight sm:text-3xl">
              Experience Excellence with Athens Car Rental - Honored as Tripadvisor Travelers' Choice Award Winners for Five Years in a Row
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                We are proud to announce that Athens Car Rental (ACR) has received the Tripadvisor Travelers' Choice Award for five consecutive years, from 2022 through 2026.
              </p>
              <p className="border-l-4 border-[#FACC15] bg-[#FEF3C7] p-4 font-semibold text-[#111111]">
                This recognition places ACR among the top 10% of businesses listed on Tripadvisor, reflecting our consistent dedication to exceptional customer service and memorable rental experiences.
              </p>
              <p>
                Earning this distinction year after year is particularly meaningful to us, as it is based on the genuine reviews and experiences shared by travelers who have chosen and trusted our services.
              </p>
              <p>
                At ACR, we believe that great service is built on reliability, transparency, personal attention, and a genuine commitment to customer satisfaction.
              </p>
              <p>
                A heartfelt thank you to all our customers for their continued trust, support, and valuable feedback. Your recognition inspires us to keep improving and delivering the high standards of service you deserve.
              </p>
            </div>

            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, text }) => (
                <li key={text} className="flex min-h-24 items-start gap-3 rounded-2xl bg-[#F7F4EF] p-4">
                  <Icon size={22} className="mt-0.5 h-5 w-5 shrink-0 text-[#111111]" aria-hidden="true" />
                  <span className="text-sm font-bold leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <aside className="rounded-3xl border-2 border-[#FACC15] bg-[#111111] p-6 text-white shadow-xl sm:p-8 lg:sticky lg:top-8 lg:col-span-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FACC15]">ATHENS CAR RENTAL</p>
            <h2 className="mt-2 text-2xl font-extrabold">Ready to drive?</h2>
            <a
              href="/booking"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#FACC15] px-5 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#E9B900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] motion-reduce:transition-none"
            >
              Book now
            </a>
            {reviewUrl ? (
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:border-[#FACC15] hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] motion-reduce:transition-none"
              >
                Read our reviews
              </a>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  className="mt-3 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white/60"
                >
                  Read our reviews
                </button>
                <p className="mt-2 text-xs text-white/65">Set VITE_TRIPADVISOR_URL to enable this link.</p>
              </>
            )}
            <a href="tel:+302106022220" className="mt-5 flex min-h-11 items-center gap-3 rounded-lg text-sm font-semibold text-white hover:text-[#FACC15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]">
              <Phone size={20} className="h-5 w-5 shrink-0 text-[#FACC15]" aria-hidden="true" />
              +30 210 6022220
            </a>
          </aside>
        </div>
      </main>
    </div>
  )
}

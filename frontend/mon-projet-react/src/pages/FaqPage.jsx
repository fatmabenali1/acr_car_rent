import { useMemo, useRef, useState } from 'react'
import faqData from '../data/faqData'
import './FaqPage.css'

const categories = [
  'All',
  'Drivers & Documents',
  'Insurance & Deposit',
  'Rental Conditions',
  'Pick-up & Return',
  'Payment & Cancellation',
  'Accident & Rules',
]

function renderEmphasis(text, keyPrefix) {
  const importantFigures = /\b(?:800\.00 to 2000\.00 Euros|20\.00 to 30\.00 Euros|15 to 25 working days|60 to 90 working days|800\.00 Euros|2000\.00 Euros|0\.00 Euros|50\.00 Euros|30\.00 Euros|20\.00 Euros|15 days|7 days|5 days|3 hours|24 hours|18 months|5 years|75 years|23 years|25 years|24\/7)\b/gi
  return text.split(/(\*\*.*?\*\*|\b(?:800\.00 to 2000\.00 Euros|20\.00 to 30\.00 Euros|15 to 25 working days|60 to 90 working days|800\.00 Euros|2000\.00 Euros|0\.00 Euros|50\.00 Euros|30\.00 Euros|20\.00 Euros|15 days|7 days|5 days|3 hours|24 hours|18 months|5 years|75 years|23 years|25 years|24\/7)\b)/gi)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
      }
      if (importantFigures.test(part)) {
        importantFigures.lastIndex = 0
        return <span className="faq-key-figure" key={`${keyPrefix}-${index}`}>{part}</span>
      }
      importantFigures.lastIndex = 0
      return part
    })
}

function AnswerContent({ answer, itemId }) {
  const blocks = []
  let listItems = []
  let exampleLines = []
  let inExamples = false

  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        <ul key={`${itemId}-list-${blocks.length}`}>
          {listItems.map((item, index) => <li key={`${itemId}-li-${index}`}>{renderEmphasis(item, `${itemId}-li-${index}`)}</li>)}
        </ul>,
      )
      listItems = []
    }
  }
  const flushExamples = () => {
    if (exampleLines.length) {
      blocks.push(
        <div className="faq-example" key={`${itemId}-example-${blocks.length}`}>
          {exampleLines.map((line, index) => <p key={`${itemId}-example-line-${index}`}>{renderEmphasis(line, `${itemId}-example-${index}`)}</p>)}
        </div>,
      )
      exampleLines = []
    }
  }

  answer.split('\n').forEach((line, index, lines) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('Examples for a car with an 800.00 Euros deductible:')) {
      flushList()
      flushExamples()
      inExamples = true
      exampleLines.push(trimmed)
      return
    }

    if (inExamples && trimmed && !trimmed.startsWith('Repair cost of')) {
      flushExamples()
      inExamples = false
    }
    if (inExamples && trimmed.startsWith('Repair cost of')) {
      exampleLines.push(trimmed)
      if (index === lines.length - 1 || !lines[index + 1].trim().startsWith('Repair cost of')) {
        flushExamples()
        inExamples = false
      }
      return
    }
    if (trimmed.startsWith('• ')) {
      listItems.push(trimmed.slice(2))
      return
    }

    flushList()
    if (trimmed.startsWith('Exceptions in CDW & FDW:')) {
      blocks.push(
        <p key={`${itemId}-p-${index}`}>
          <strong>Exceptions in CDW &amp; FDW:</strong>{trimmed.slice('Exceptions in CDW & FDW:'.length)}
        </p>,
      )
      return
    }
    if (trimmed) blocks.push(<p key={`${itemId}-p-${index}`}>{renderEmphasis(trimmed, `${itemId}-p-${index}`)}</p>)
  })

  flushList()
  flushExamples()
  return <div className="faq-answer-content">{blocks}</div>
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const questionRefs = useRef(new Map())
  const searchInputRef = useRef(null)

  const filteredFaq = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return faqData.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      const matchesSearch = !query || `${item.question} ${item.answer}`.toLocaleLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [search, selectedCategory])

  const handleToggle = (item) => {
    const nextOpenId = openId === item.id ? null : item.id
    setOpenId(nextOpenId)
    if (nextOpenId !== null) {
      window.setTimeout(() => {
        questionRefs.current.get(item.id)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'nearest',
        })
      }, 80)
    }
  }

  return (
    <div className="faq-page">
      <section className="faq-hero">
        <div className="faq-hero-inner">
          <nav className="faq-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">FAQ</span>
          </nav>
          <div className="faq-hero-copy">
            <p className="faq-eyebrow">ATHENS CAR RENTAL</p>
            <h1>Frequently Asked <span>Questions</span></h1>
            <p className="faq-hero-subtitle">Everything you need to know before you rent with us.</p>
          </div>
          <label className="faq-search">
            <SearchIcon />
            <span className="sr-only">Search frequently asked questions</span>
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search questions"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setOpenId(null)
              }}
              placeholder="Search questions or answers..."
            />
            {search && (
              <button
                type="button"
                className="faq-search-clear"
                onClick={() => {
                  setSearch('')
                  searchInputRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
        </div>
      </section>

      <div className="faq-main">
        <div className="faq-layout">
          <aside className="faq-sidebar" aria-label="FAQ navigation and contact information">
            <nav className="faq-category-nav" aria-label="FAQ categories">
              <p className="faq-sidebar-heading">CATEGORIES</p>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`faq-category-link${selectedCategory === category ? ' is-active' : ''}`}
                  aria-pressed={selectedCategory === category}
                  onClick={() => {
                    setSelectedCategory(category)
                    setOpenId(null)
                  }}
                >
                  {category}
                  <span>{category === 'All' ? faqData.length : faqData.filter((item) => item.category === category).length}</span>
                </button>
              ))}
            </nav>

            <section className="faq-help-card">
              <span className="faq-help-icon" aria-hidden="true">?</span>
              <h2>Need help?</h2>
              <p>Our team is here to help you with your rental.</p>
              <a href="tel:+302106022220">+30 210 6022220</a>
              <a href="tel:+302106624887">+30 210 6624887</a>
              <a className="faq-contact-button" href="mailto:info@athenscarrental.com">Contact us</a>
            </section>
          </aside>

          <section className="faq-results" aria-label="Frequently asked questions">
            <div className="faq-results-heading">
              <div>
                <p className="faq-eyebrow">HELP CENTER</p>
                <h2>{selectedCategory === 'All' ? 'Popular questions' : selectedCategory}</h2>
              </div>
              <p className="faq-result-count">{filteredFaq.length} {filteredFaq.length === 1 ? 'answer' : 'answers'}</p>
            </div>

            {filteredFaq.length ? (
              <div className="faq-cards">
                {filteredFaq.map((item, index) => {
                  const isOpen = openId === item.id
                  const answerId = `faq-answer-${item.id}`
                  return (
                    <article
                      className={`faq-card${isOpen ? ' is-open' : ''}`}
                      key={item.id}
                      ref={(node) => {
                        if (node) questionRefs.current.set(item.id, node)
                        else questionRefs.current.delete(item.id)
                      }}
                      style={{ '--faq-index': index }}
                    >
                      <h3 className="faq-question-heading">
                        <button
                          type="button"
                          className="faq-question-button"
                          aria-expanded={isOpen}
                          aria-controls={answerId}
                          onClick={() => handleToggle(item)}
                        >
                          <span className="faq-number">{String(item.id).padStart(2, '0')}</span>
                          <span className="faq-question-text">{item.question}</span>
                          <span className="faq-toggle-icon"><ChevronIcon /></span>
                        </button>
                      </h3>
                      <div className="faq-answer-grid" id={answerId} aria-hidden={!isOpen}>
                        <div className="faq-answer-clip">
                          <div className="faq-answer">
                            <AnswerContent answer={item.answer} itemId={item.id} />
                            {item.id === 17 && (
                              <a className="faq-deposit-link" href="/pay">Pay deposit</a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="faq-no-results" role="status">
                <span aria-hidden="true">?</span>
                <h3>No results found</h3>
                <p>Try a different search or reset the filters to see all questions.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setSelectedCategory('All')
                  }}
                >
                  Reset search
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="faq-bottom-help">
          <div>
            <p className="faq-eyebrow">WE'RE HERE FOR YOU</p>
            <h2>Still have questions?</h2>
            <p>Get in touch with our team and we’ll be happy to help.</p>
          </div>
          <div className="faq-bottom-contact">
            <a href="tel:+302106022220">+30 210 6022220</a>
            <a href="tel:+302106624887">+30 210 6624887</a>
            <a href="mailto:info@athenscarrental.com">info@athenscarrental.com</a>
            <a className="faq-contact-button" href="mailto:info@athenscarrental.com">Contact us</a>
          </div>
        </section>
      </div>
    </div>
  )
}

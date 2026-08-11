import { useState } from 'react'
import Minus from 'lucide-react/dist/esm/icons/minus.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'

const faqItems = [
  {
    question: 'What is Tap2Connect Nepal?',
    answer:
      'Tap2Connect Nepal combines a smart NFC card with a digital profile so you can share contacts, links, work and information instantly.',
  },
  {
    question: 'How does the NFC card work?',
    answer:
      'A supported phone opens your Tap2Connect profile when the card is tapped. Every card can also include a QR code as a fallback.',
  },
  {
    question: 'Can I update my information anytime?',
    answer:
      'Yes. Update your profile, links, documents and contact details whenever you want without replacing the physical card.',
  },
  {
    question: 'Is my data secure and private?',
    answer:
      'You choose what appears on your profile and stay in control of the information you share.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Choose a card, customize the design, create your profile and place your order. Our team confirms the final artwork before production.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="faq-section section-pad" id="faq">
      <div className="container faq-shell">
        <div className="faq-heading">
          <span>FAQ</span>
          <h2>Frequently asked questions.</h2>
        </div>

        <div className="faq-accordion">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            const triggerId = `faq-trigger-${index}`
            const panelId = `faq-panel-${index}`

            return (
              <article className={`faq-item${isOpen ? ' is-open' : ''}`} key={item.question}>
                <h3>
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span className="faq-index">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.question}</span>
                    <span className="faq-toggle-icon" aria-hidden="true">
                      {isOpen ? <Minus size={17} strokeWidth={1.8} /> : <Plus size={17} strokeWidth={1.8} />}
                    </span>
                  </button>
                </h3>
                <div
                  className="faq-panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

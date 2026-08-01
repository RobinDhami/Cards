import { useState } from 'react'
import Mail from 'lucide-react/dist/esm/icons/mail.mjs'
import Minus from 'lucide-react/dist/esm/icons/minus.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'

const faqItems = [
  {
    question: 'What is an NFC card?',
    answer:
      'It is a physical smart card that opens your Tap2Connect profile when someone taps it on a supported phone. Every card can also carry a QR code.',
  },
  {
    question: 'Do people need an app?',
    answer:
      'No. Your profile opens in the phone browser, so the person you meet does not need to install anything or create an account.',
  },
  {
    question: 'Which phones are supported?',
    answer:
      'Modern NFC-enabled Android phones and iPhones can tap the card. Phones without NFC can scan the QR code or open your profile link.',
  },
  {
    question: 'Can I update my profile later?',
    answer:
      'Yes. You can update contact details, links, documents, portfolios, products, and other profile content without replacing the physical card.',
  },
  {
    question: 'Can I choose separate front and back designs?',
    answer:
      'Yes. Choose each side independently in the card designer. Our team confirms the final proof with you before the card goes into production.',
  },
  {
    question: 'Do you support schools and bulk orders?',
    answer:
      'Yes. We support coordinated card designs and digital identity workflows for schools, colleges, teams, events, and other organisations.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(1)

  return (
    <section className="faq-section section-pad" id="faq">
      <div className="container faq-shell">
        <div className="faq-heading">
          <h2>Questions, answered clearly.</h2>
          <p>Everything you need to know before choosing your card or profile.</p>
          <a href="mailto:hello@tap2connectnepal.com">
            <Mail size={17} strokeWidth={1.8} />
            Ask us something else
          </a>
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

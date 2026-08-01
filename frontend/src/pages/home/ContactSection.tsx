import { type FormEvent, useState } from 'react'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.mjs'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.mjs'
import Mail from 'lucide-react/dist/esm/icons/mail.mjs'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.mjs'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.mjs'
import Phone from 'lucide-react/dist/esm/icons/phone.mjs'
import Send from 'lucide-react/dist/esm/icons/send.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import { apiFetch, displayError } from '../../lib/api'
import './ContactSection.css'

const contactIntents = [
  'Personal NFC card',
  'Digital profile',
  'School or bulk order',
  'Something else',
]

const whatsappUrl =
  'https://wa.me/9779801234567?text=Namaste%20Tap2Connect%20Nepal%2C%20I%20would%20like%20to%20know%20more.'

type SubmissionState =
  | { status: 'idle'; message: '' }
  | { status: 'submitting'; message: '' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export function ContactSection() {
  const [intent, setIntent] = useState(contactIntents[0])
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle', message: '' })

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('contactType', intent)
    setSubmission({ status: 'submitting', message: '' })

    try {
      const response = await apiFetch<{ ok: boolean; message: string }>('/send-message/', {
        method: 'POST',
        body: formData,
      })
      setSubmission({
        status: 'success',
        message: response.message || 'Thank you. Your inquiry has been sent.',
      })
      form.reset()
      setIntent(contactIntents[0])
    } catch (error) {
      setSubmission({ status: 'error', message: displayError(error) })
    }
  }

  return (
    <>
      <section className="contact-showcase-section section-pad" id="contact">
        <div className="container contact-showcase-grid">
          <div className="contact-story">
            <span className="microline">Contact</span>
            <h2>Let&apos;s make your first tap count.</h2>
            <p>Tell us what you want to create. We will reply with a clear recommendation and next step.</p>

            <div className="contact-direct-list">
              <a href="mailto:hello@tap2connectnepal.com">
                <span>
                  <Mail size={19} />
                </span>
                <div>
                  <strong>hello@tap2connectnepal.com</strong>
                  <small>For designs, pricing, and support</small>
                </div>
              </a>
              <a href="tel:+9779801234567">
                <span>
                  <Phone size={19} />
                </span>
                <div>
                  <strong>+977 980-1234567</strong>
                  <small>Sunday to Friday, 10 AM to 6 PM</small>
                </div>
              </a>
              <div>
                <span>
                  <MapPin size={19} />
                </span>
                <div>
                  <strong>Rabibhawan, Kathmandu</strong>
                  <small>Tap2Connect Nepal</small>
                </div>
              </div>
            </div>

            <div className="contact-response-path" aria-label="What happens after an inquiry">
              <div>
                <span>01</span>
                <strong>You share the idea</strong>
                <small>Use the form, email, or WhatsApp.</small>
              </div>
              <div>
                <span>02</span>
                <strong>We review it</strong>
                <small>A real person checks your requirements.</small>
              </div>
              <div>
                <span>03</span>
                <strong>You get a clear plan</strong>
                <small>Scope, price, and the best next step.</small>
              </div>
            </div>
          </div>

          <form className="contact-inquiry-form" onSubmit={submitInquiry}>
            <div className="contact-form-heading">
              <div>
                <span>Send an inquiry</span>
                <h3>What can we help you create?</h3>
              </div>
              <span className="contact-response-time">
                <Clock3 size={15} />
                Usually within one business day
              </span>
            </div>

            <fieldset className="contact-intent-field">
              <legend>I want to</legend>
              <div>
                {contactIntents.map((option) => (
                  <label className={intent === option ? 'is-selected' : ''} key={option}>
                    <input
                      type="radio"
                      name="contactType"
                      value={option}
                      checked={intent === option}
                      onChange={() => setIntent(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="contact-field-grid">
              <label>
                <span>Full name</span>
                <input type="text" name="fullName" placeholder="Your full name" autoComplete="name" required />
              </label>
              <label>
                <span>Email address</span>
                <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>
                <span>Phone number</span>
                <input type="tel" name="phone" placeholder="+977 98XXXXXXXX" autoComplete="tel" required />
              </label>
              <label>
                <span>Company or school <small>Optional</small></span>
                <input type="text" name="organization" placeholder="Organization name" autoComplete="organization" />
              </label>
              <label className="contact-field-wide">
                <span>City</span>
                <input type="text" name="hearAbout" placeholder="Kathmandu, Pokhara..." required />
              </label>
              <label className="contact-field-wide">
                <span>Message</span>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Tell us about the card, profile, quantity, or timeline you have in mind."
                  required
                />
              </label>
            </div>

            <label className="contact-privacy">
              <input type="checkbox" name="priority" required />
              <span>
                <ShieldCheck size={16} />
                I agree that Tap2Connect may contact me about this inquiry.
              </span>
            </label>

            <button
              type="submit"
              className="contact-submit-button"
              disabled={submission.status === 'submitting'}
            >
              {submission.status === 'submitting' ? 'Sending...' : 'Send inquiry'}
              <Send size={17} />
            </button>

            <div
              className={`contact-form-status contact-form-status--${submission.status}`}
              role="status"
              aria-live="polite"
            >
              {submission.status === 'success' ? <CheckCircle2 size={17} /> : null}
              {submission.message}
            </div>
          </form>
        </div>
      </section>

      <a
        className="whatsapp-float"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Tap2Connect Nepal on WhatsApp"
        title="Chat on WhatsApp"
      >
        <MessageCircle size={24} strokeWidth={2} />
        <span aria-hidden="true" />
      </a>
    </>
  )
}

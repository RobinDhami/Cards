import { type FormEvent, useState } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import { apiFetch, displayError } from '../../lib/api'
import { contactNfcCard } from '../../lib/assets'
import './ContactSection.css'

type SubmissionState =
  | { status: 'idle'; message: '' }
  | { status: 'submitting'; message: '' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export function ContactSection() {
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle', message: '' })

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set('contactType', 'Website inquiry')
    formData.set('organization', '')
    formData.set('hearAbout', 'Website')
    setSubmission({ status: 'submitting', message: '' })

    try {
      const response = await apiFetch<{ ok: boolean; message: string }>('/send-message/', {
        method: 'POST',
        body: formData,
      })
      setSubmission({ status: 'success', message: response.message || 'Thank you. Your inquiry has been sent.' })
      form.reset()
    } catch (error) {
      setSubmission({ status: 'error', message: displayError(error) })
    }
  }

  return (
    <section className="contact-showcase-section section-pad" id="contact">
      <div className="container contact-showcase-grid">
        <div className="contact-story">
          <span className="microline">Let&apos;s connect</span>
          <h2>Ready to make<br />your first tap count?</h2>
          <p>Have a question or want to get started? Send us a message and we&apos;ll get back to you.</p>

          <form className="contact-inquiry-form" onSubmit={submitInquiry}>
            <div className="contact-field-grid">
              <label>
                <span>Name</span>
                <input type="text" name="fullName" placeholder="Your full name" autoComplete="name" required />
              </label>
              <label>
                <span>Email</span>
                <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label>
                <span>Phone</span>
                <input type="tel" name="phone" placeholder="98XXXXXXXX" autoComplete="tel" required />
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" rows={3} placeholder="How can we help you?" required />
              </label>
            </div>

            <button type="submit" className="contact-submit-button" disabled={submission.status === 'submitting'}>
              {submission.status === 'submitting' ? 'Sending...' : 'Send message'}
              <ArrowRight size={17} />
            </button>

            <div className={`contact-form-status contact-form-status--${submission.status}`} role="status" aria-live="polite">
              {submission.status === 'success' ? <CheckCircle2 size={17} /> : null}
              {submission.message}
            </div>
          </form>
        </div>

        <div className="contact-product" aria-hidden="true">
          <img src={contactNfcCard} alt="" loading="lazy" />
        </div>
      </div>
    </section>
  )
}

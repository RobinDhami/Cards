import { useEffect, useRef, useState } from 'react'
import X from 'lucide-react/dist/esm/icons/x.js'
import Minus from 'lucide-react/dist/esm/icons/minus.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import { ApiError, apiFetch, jsonBody } from '../../lib/api'
import { serviceIconMap } from '../../lib/serviceIcons'
import { useGuestSession } from './useGuestSession'
import type { GuestService } from './types-services'
import './GuestServiceRequestSheet.css'

type RequestConfirmation = { requestReference: string; serviceName: string; quantity: number; requestedAt: string; status: string; createdAt: string; estimatedCompletionMinutes: number | null }

function formatPrice(value: string | null, currency: string) {
  if (!value) return ''
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(Number(value)) } catch { return value }
}

function formatTime(value: string) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) } catch { return value }
}

export function GuestServiceRequestSheet({ service, currency, publicIdentifier, onClose, onAccessRequired }: { service: GuestService; currency: string; publicIdentifier: string; onClose: () => void; onAccessRequired: () => void }) {
  const { verified } = useGuestSession()
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<RequestConfirmation | null>(null)
  const keyRef = useRef('')
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const Icon = serviceIconMap[service.iconIdentifier] || Sparkles

  useEffect(() => { noteRef.current?.focus() }, [])
  useEffect(() => { if (!verified && !confirmation) onAccessRequired() }, [verified, confirmation, onAccessRequired])

  const submit = async () => {
    if (!verified) { onAccessRequired(); return }
    if (!keyRef.current) keyRef.current = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setLoading(true); setError('')
    try {
      const response = await apiFetch<{ request: RequestConfirmation }>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/service-requests/`, { method: 'POST', headers: { 'Idempotency-Key': keyRef.current }, body: jsonBody({ serviceIdentifier: service.identifier, quantity, ...(service.allowsGuestNote ? { guestNote: note.slice(0, 1000) } : {}) }) })
      setConfirmation(response.request)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) onAccessRequired()
      else if (caught instanceof ApiError && caught.status === 404) setError('This service is no longer available. Return to the services list and try another option.')
      else if (caught instanceof ApiError && caught.status === 429) setError('Too many requests. Please wait a moment before trying again.')
      else setError(caught instanceof ApiError ? caught.message : 'The request could not be sent. Try again.')
    } finally { setLoading(false) }
  }

  return <div className="guest-request-backdrop" role="presentation">
    <section className="guest-request-sheet" role="dialog" aria-modal="true" aria-labelledby="guest-request-title">
      <header><button type="button" onClick={onClose} aria-label="Close service request"><X size={19} /></button><h2 id="guest-request-title">{confirmation ? 'Request sent' : service.name}</h2><span /></header>
      {confirmation ? <div className="guest-request-confirmation"><span className="guest-request-confirmation__icon"><Icon size={26} /></span><strong>Request sent</strong><p>{confirmation.serviceName} · {confirmation.status}</p><dl><div><dt>Reference</dt><dd>{confirmation.requestReference}</dd></div><div><dt>Quantity</dt><dd>{confirmation.quantity}</dd></div><div><dt>Submitted</dt><dd>{formatTime(confirmation.createdAt)}</dd></div></dl><p>Hotel staff will review your request shortly.</p><button type="button" onClick={onClose}>Return to Services</button></div> : <>
        <div className="guest-request-service"><span className="guest-request-service__icon"><Icon size={28} /></span><div><strong>{service.name}</strong><p>{service.description || service.shortDescription || 'Available during your stay.'}</p>{service.availability && <small>{service.availability}</small>}{service.estimatedCompletionMinutes && <small>Estimated completion: {service.estimatedCompletionMinutes} minutes</small>}{service.price && <small>Service information: {formatPrice(service.price, currency)}</small>}</div></div>
        <div className="guest-request-fields">
          <label>Quantity<div className="guest-request-quantity"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><output aria-live="polite">{quantity}</output><button type="button" onClick={() => setQuantity((value) => Math.min(50, value + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div></label>
          {service.allowsGuestNote && <label htmlFor="guest-request-note">Note for hotel<textarea id="guest-request-note" ref={noteRef} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" aria-describedby="guest-request-note-count" /><em id="guest-request-note-count">{note.length}/1000</em></label>}
        </div>
        {error && <p className="guest-request-error" role="alert">{error}</p>}
        <button className="guest-request-submit" type="button" onClick={() => void submit()} disabled={loading}>{loading ? 'Sending…' : 'Send Request'}</button>
      </>}
    </section>
  </div>
}

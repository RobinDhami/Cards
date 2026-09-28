import { useEffect, useRef, useState, type FormEvent } from 'react'
import X from 'lucide-react/dist/esm/icons/x.js'
import { ApiError } from '../../lib/api'
import { useGuestSession } from './useGuestSession'
import './GuestAccessDialog.css'

export function GuestAccessDialog({ open, onClose, onVerified }: { open: boolean; onClose: () => void; onVerified?: () => void }) {
  const { activate } = useGuestSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setCode(''); setError(''); window.setTimeout(() => inputRef.current?.focus(), 0) } }, [open])
  if (!open) return null
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit access code from check-in.'); return }
    setLoading(true); setError('')
    try { await activate(code); onClose(); onVerified?.() } catch (caught) { setError(caught instanceof ApiError && caught.status === 429 ? 'Too many attempts. Please try again later.' : 'That access code could not be verified.') } finally { setLoading(false) }
  }
  return <div className="guest-access-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="guest-access-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-access-title">
      <button type="button" className="guest-access-close" onClick={onClose} aria-label="Close room access verification"><X size={18} /></button>
      <span className="guest-access-mark" aria-hidden="true">A</span>
      <h2 id="guest-access-title">Verify your room access</h2>
      <p>Enter the access code provided at check-in to continue.</p>
      <form onSubmit={submit}>
        <label htmlFor="guest-access-code">Access code</label>
        <input ref={inputRef} id="guest-access-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-describedby={error ? 'guest-access-error' : undefined} />
        {error && <span id="guest-access-error" className="guest-access-error" role="alert">{error}</span>}
        <button type="submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify access'}</button>
      </form>
    </section>
  </div>
}

import { useMemo, useRef, useState } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import Minus from 'lucide-react/dist/esm/icons/minus.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import { ApiError, apiFetch, jsonBody } from '../../lib/api'
import { GuestAccessDialog } from './GuestAccessDialog'
import { useGuestCart } from './GuestCartContext'
import { useGuestSession } from './useGuestSession'
import './GuestCartSheet.css'

type ConfirmedOrder = { orderNumber: string; status: string; currency: string; subtotal: string; serviceCharge: string; tax: string; total: string; createdAt: string; roomLabel: string; items: Array<{ name: string; quantity: number; unitPrice: string; lineTotal: string; instructions: string }> }

function price(value: string, currency: string) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value)) } catch { return `${currency} ${value}` } }

export function GuestCartSheet({ publicIdentifier, currency, onClose }: { publicIdentifier: string; currency: string; onClose: () => void }) {
  const { lines, estimatedSubtotal, increment, decrement, remove, updateInstructions, clear } = useGuestCart()
  const { verified } = useGuestSession()
  const [orderInstructions, setOrderInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accessOpen, setAccessOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmedOrder | null>(null)
  const keyRef = useRef('')
  const payload = useMemo(() => ({ items: lines.map((line) => ({ menuItemIdentifier: line.identifier, quantity: line.quantity, instructions: line.instructions })), guestInstructions: orderInstructions.slice(0, 1000) }), [lines, orderInstructions])
  const payloadSignature = JSON.stringify(payload)
  const signatureRef = useRef('')
  if (signatureRef.current !== payloadSignature) { signatureRef.current = payloadSignature; keyRef.current = '' }
  const submit = async (force = false) => {
    if (!lines.length) { setError('Your order is empty.'); return }
    if (!verified && !force) { setAccessOpen(true); return }
    if (!keyRef.current) keyRef.current = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setLoading(true); setError('')
    try {
      const response = await apiFetch<{ order: ConfirmedOrder }>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/orders/`, { method: 'POST', headers: { 'Idempotency-Key': keyRef.current }, body: jsonBody(payload) })
      setConfirmation(response.order); clear()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setAccessOpen(true)
      else if (caught instanceof ApiError && caught.status === 404) setError('One of these items is no longer available. Remove it and try again.')
      else setError(caught instanceof ApiError ? caught.message : 'The order could not be placed. Try again.')
    } finally { setLoading(false) }
  }
  return <div className="guest-cart-backdrop" role="presentation">
    <section className="guest-cart-sheet" role="dialog" aria-modal="true" aria-labelledby="guest-cart-title">
      <header><button type="button" onClick={onClose} aria-label="Close order review"><ArrowLeft size={20} /></button><h1 id="guest-cart-title">{confirmation ? 'Order placed' : 'Your Order'}</h1><span /></header>
      {confirmation ? <div className="guest-cart-confirmation"><strong>Order {confirmation.orderNumber}</strong><p>Status: {confirmation.status}</p>{confirmation.items.map((item) => <div key={`${item.name}-${item.quantity}`}><span>{item.quantity} × {item.name}</span><span>{price(item.lineTotal, confirmation.currency)}</span></div>)}<dl><div><dt>Subtotal</dt><dd>{price(confirmation.subtotal, confirmation.currency)}</dd></div><div><dt>Total</dt><dd>{price(confirmation.total, confirmation.currency)}</dd></div></dl><button type="button" onClick={onClose}>Return to menu</button></div> : <>
        <div className="guest-cart-lines">{lines.map((line) => <article key={line.identifier}><div className="guest-cart-line__image">{line.image ? <img src={line.image} alt="" /> : <span aria-hidden="true"><Utensils size={22} /></span>}</div><div className="guest-cart-line__body"><strong>{line.name}</strong><small>{price(line.price, line.currency)}</small><label>Item instructions<textarea maxLength={500} value={line.instructions} onChange={(event) => updateInstructions(line.identifier, event.target.value)} placeholder="Optional" /><em>{line.instructions.length}/500</em></label></div><div className="guest-cart-line__controls"><button type="button" onClick={() => decrement(line.identifier)} aria-label={`Decrease ${line.name}`}><Minus size={15} /></button><span>{line.quantity}</span><button type="button" onClick={() => increment(line.identifier)} aria-label={`Increase ${line.name}`}><Plus size={15} /></button><button type="button" onClick={() => remove(line.identifier)} aria-label={`Remove ${line.name}`}><Trash2 size={15} /></button></div></article>)}</div>
        {!lines.length && <p className="guest-cart-empty">Your order is empty.</p>}
        <label className="guest-cart-order-note">Order instructions<textarea maxLength={1000} value={orderInstructions} onChange={(event) => setOrderInstructions(event.target.value)} placeholder="Optional note for the hotel" /><em>{orderInstructions.length}/1000</em></label>
        {error && <p className="guest-cart-error" role="alert">{error}</p>}
        <div className="guest-cart-summary"><span>Estimated subtotal</span><strong>{price(estimatedSubtotal.toFixed(2), currency)}</strong></div>
        {!!lines.length && <button className="guest-cart-clear" type="button" onClick={clear}>Clear order</button>}
        <p className="guest-cart-estimate">Final totals are confirmed by the hotel server.</p>
        <button className="guest-cart-submit" type="button" onClick={() => void submit()} disabled={loading}>{loading ? 'Placing order…' : 'Place Order'}</button>
      </>}
      <GuestAccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} onVerified={() => { setAccessOpen(false); void submit(true) }} />
    </section>
  </div>
}

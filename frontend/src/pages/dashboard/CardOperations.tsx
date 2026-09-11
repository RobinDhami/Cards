import { useEffect, useState } from 'react'
import type { ComponentType, FormEvent, SVGProps } from 'react'
import Boxes from 'lucide-react/dist/esm/icons/boxes.js'
import CircleDollarSign from 'lucide-react/dist/esm/icons/circle-dollar-sign.js'
import PackageCheck from 'lucide-react/dist/esm/icons/package-check.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import './CardOperations.css'

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
type PlatformContext = { user?: { displayName: string; roleLabel: string }; platformAccess?: { allowedModules: string[] } }
type Batch = {
  id: number
  batchName: string
  date: string
  cardsPrinted: number
  faultyCards: number
  reprintedCards: number
  cardsSold: number
  totalSalesAmount: string
  faultReprintReason: string
  notes: string
}
type Summary = { totalPrinted: number; totalFaulty: number; totalReprinted: number; totalSold: number; totalSalesAmount: string }
type Reason = { value: string; label: string }
type CardOperationsData = PlatformContext & { batches: Batch[]; summary: Summary; faultReprintReasons: Reason[] }
type BatchForm = Omit<Batch, 'id'>
type SaveResponse = { batch: Batch }
type ProfileOption = { type: 'member' | 'professional'; id: number; label: string; detail: string }
type CardEntry = { id: number; cardLabel: string; status: 'available' | 'faulty' | 'reprinted' | 'sold'; salePrice: string; linkedProfile: ProfileOption | null; notes: string }
type CardForm = Omit<CardEntry, 'id'>

const emptyForm = (): BatchForm => ({
  batchName: '', date: new Date().toISOString().slice(0, 10), cardsPrinted: 0, faultyCards: 0,
  reprintedCards: 0, cardsSold: 0, totalSalesAmount: '0.00', faultReprintReason: '', notes: '',
})
const emptyCardForm = (): CardForm => ({ cardLabel: '', status: 'available', salePrice: '0.00', linkedProfile: null, notes: '' })
const countFormatter = new Intl.NumberFormat('en-US')
const currencyFormatter = new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

function money(value: string) {
  return currencyFormatter.format(Number(value) || 0).replace('NPR', 'Rs.')
}

function BatchMetric({ icon: MetricIcon, label, value, currency = false, tone }: { icon: Icon; label: string; value: number | string; currency?: boolean; tone: string }) {
  return <article className="card-operations-metric manage-card"><span className={`is-${tone}`}><MetricIcon size={18} aria-hidden="true" /></span><div><small>{label}</small><strong>{currency ? money(String(value)) : countFormatter.format(Number(value))}</strong></div></article>
}

function cardBatchForm(batch: Batch): BatchForm {
  const { id: _id, ...form } = batch
  return form
}

export function CardOperations() {
  const [data, setData] = useState<CardOperationsData | null>(null)
  const [form, setForm] = useState<BatchForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [cards, setCards] = useState<CardEntry[]>([])
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [profileQuery, setProfileQuery] = useState('')
  const [profileResults, setProfileResults] = useState<ProfileOption[]>([])
  const [cardMessage, setCardMessage] = useState('')

  async function loadData() {
    try {
      const response = await apiFetch<CardOperationsData>('/api/dashboard/card-batches/')
      setData(response)
    } catch (reason) {
      setMessage(displayError(reason))
    }
  }

  useEffect(() => {
    document.title = 'Card Operations | Tap2Connect'
    void loadData()
  }, [])

  function changeField<K extends keyof BatchForm>(key: K, value: BatchForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startEdit(batch: Batch) {
    setEditingId(batch.id)
    setForm(cardBatchForm(batch))
    setErrors({})
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setErrors({})
  }

  async function openCards(batch: Batch) {
    setSelectedBatch(batch)
    setCards([])
    setCardForm(emptyCardForm())
    setEditingCardId(null)
    setCardMessage('')
    try {
      const response = await apiFetch<{ cards: CardEntry[] }>(`/api/dashboard/card-batches/${batch.id}/cards/`)
      setCards(response.cards)
    } catch (reason) {
      setCardMessage(displayError(reason))
    }
  }

  async function searchProfiles() {
    const query = profileQuery.trim()
    if (!query) {
      setProfileResults([])
      return
    }
    try {
      const response = await apiFetch<{ profiles: ProfileOption[] }>(`/api/dashboard/card-batch-profiles/?q=${encodeURIComponent(query)}`)
      setProfileResults(response.profiles)
    } catch (reason) {
      setCardMessage(displayError(reason))
    }
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedBatch) return
    setSaving(true)
    setCardMessage('')
    try {
      const endpoint = editingCardId
        ? `/api/dashboard/card-batches/${selectedBatch.id}/cards/${editingCardId}/`
        : `/api/dashboard/card-batches/${selectedBatch.id}/cards/`
      await apiFetch(endpoint, { method: editingCardId ? 'PATCH' : 'POST', body: jsonBody(cardForm) })
      await openCards(selectedBatch)
    } catch (reason) {
      setCardMessage(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  async function deleteCard(card: CardEntry) {
    if (!selectedBatch || !window.confirm(`Delete ${card.cardLabel || `Card #${card.id}`}?`)) return
    try {
      await apiFetch(`/api/dashboard/card-batches/${selectedBatch.id}/cards/${card.id}/`, { method: 'DELETE' })
      await openCards(selectedBatch)
    } catch (reason) {
      setCardMessage(displayError(reason))
    }
  }

  function editCard(card: CardEntry) {
    setEditingCardId(card.id)
    setCardForm({ cardLabel: card.cardLabel, status: card.status, salePrice: card.salePrice, linkedProfile: card.linkedProfile, notes: card.notes })
    setProfileQuery(card.linkedProfile?.label ?? '')
    setProfileResults([])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setMessage('')
    try {
      const endpoint = editingId ? `/api/dashboard/card-batches/${editingId}/` : '/api/dashboard/card-batches/'
      await apiFetch<SaveResponse>(endpoint, { method: editingId ? 'PATCH' : 'POST', body: jsonBody(form) })
      cancelEdit()
      await loadData()
    } catch (reason) {
      const apiError = reason as { errors?: Record<string, string[]> }
      setErrors(apiError.errors ?? {})
      setMessage(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  async function deleteBatch(batch: Batch) {
    if (!window.confirm(`Delete ${batch.batchName}? This cannot be undone.`)) return
    setMessage('')
    try {
      await apiFetch(`/api/dashboard/card-batches/${batch.id}/`, { method: 'DELETE' })
      if (editingId === batch.id) cancelEdit()
      await loadData()
    } catch (reason) {
      setMessage(displayError(reason))
    }
  }

  if (!data) return <div className="manage-state">{message || 'Loading card operations…'}</div>
  const showReason = form.faultyCards > 0 || form.reprintedCards > 0

  return (
    <ManageShell brand="Tap2Connect" brandDetail="Platform administration" logo={brandLogo} nav={platformNavigation(data.platformAccess?.allowedModules ?? [])} title="Card Operations" subtitle="Track physical card batches, faults, reprints, sales, and totals" userName={data.user?.displayName ?? ''} userRole={data.user?.roleLabel ?? ''}>
      <div className="card-operations-page">
        <section className="card-operations-metrics" aria-label="Card batch summary">
          <BatchMetric icon={Boxes} label="Total Printed" value={data.summary.totalPrinted} tone="blue" />
          <BatchMetric icon={TriangleAlert} label="Total Faulty" value={data.summary.totalFaulty} tone="rose" />
          <BatchMetric icon={RefreshCw} label="Total Reprinted" value={data.summary.totalReprinted} tone="amber" />
          <BatchMetric icon={PackageCheck} label="Total Sold" value={data.summary.totalSold} tone="teal" />
          <BatchMetric icon={CircleDollarSign} label="Total Sales" value={data.summary.totalSalesAmount} currency tone="violet" />
        </section>

        <section className="manage-card card-batch-form-card">
          <header className="card-operations-heading"><div><h2>{editingId ? 'Edit batch' : 'Add batch'}</h2><p>Record one physical card production batch at a time.</p></div>{editingId ? <button className="manage-button" type="button" onClick={cancelEdit}>Cancel</button> : null}</header>
          <form onSubmit={submit} noValidate>
            <div className="card-batch-form-grid">
              <label>Batch number/name<input value={form.batchName} onChange={(event) => changeField('batchName', event.target.value)} placeholder="e.g. Batch #001" required />{errors.batchName?.[0] && <em>{errors.batchName[0]}</em>}</label>
              <label>Date<input type="date" value={form.date} onChange={(event) => changeField('date', event.target.value)} required />{errors.date?.[0] && <em>{errors.date[0]}</em>}</label>
              <label>Cards printed<input type="number" min="0" step="1" value={form.cardsPrinted} onChange={(event) => changeField('cardsPrinted', Number(event.target.value))} required />{errors.cardsPrinted?.[0] && <em>{errors.cardsPrinted[0]}</em>}</label>
              <label>Faulty / damaged<input type="number" min="0" step="1" value={form.faultyCards} onChange={(event) => changeField('faultyCards', Number(event.target.value))} required />{errors.faultyCards?.[0] && <em>{errors.faultyCards[0]}</em>}</label>
              <label>Reprinted<input type="number" min="0" step="1" value={form.reprintedCards} onChange={(event) => changeField('reprintedCards', Number(event.target.value))} required />{errors.reprintedCards?.[0] && <em>{errors.reprintedCards[0]}</em>}</label>
              <label>Cards sold<input type="number" min="0" step="1" value={form.cardsSold} onChange={(event) => changeField('cardsSold', Number(event.target.value))} required />{errors.cardsSold?.[0] && <em>{errors.cardsSold[0]}</em>}</label>
              <label>Total sales amount<input type="number" min="0" step="0.01" value={form.totalSalesAmount} onChange={(event) => changeField('totalSalesAmount', event.target.value)} required />{errors.totalSalesAmount?.[0] && <em>{errors.totalSalesAmount[0]}</em>}</label>
              {showReason ? <label>Fault / reprint reason<select value={form.faultReprintReason} onChange={(event) => changeField('faultReprintReason', event.target.value)}><option value="">Select an optional reason</option>{data.faultReprintReasons.map((reason) => <option value={reason.value} key={reason.value}>{reason.label}</option>)}</select>{errors.faultReprintReason?.[0] && <em>{errors.faultReprintReason[0]}</em>}</label> : null}
              <label className="is-wide">Notes<textarea value={form.notes} onChange={(event) => changeField('notes', event.target.value)} placeholder="Optional details" rows={3} /></label>
            </div>
            {message ? <p className="card-batch-form-message" role="alert">{message}</p> : null}
            {(form.cardsSold > form.cardsPrinted || form.faultyCards > form.cardsPrinted) ? <p className="card-batch-warning"><TriangleAlert size={15} aria-hidden="true" /> Counts look unusual. They are allowed because reprints can affect physical totals.</p> : null}
            <button className="manage-button is-primary" type="submit" disabled={saving}><Plus size={15} aria-hidden="true" />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add batch'}</button>
          </form>
        </section>

        <section className="manage-card card-batch-list-card">
          <header className="card-operations-heading"><div><h2>Card batches</h2><p>{data.batches.length ? `${data.batches.length} recorded batch${data.batches.length === 1 ? '' : 'es'}` : 'No card batches yet'}</p></div>{!editingId ? <button className="manage-button is-primary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Plus size={15} aria-hidden="true" />Add Batch</button> : null}</header>
          {data.batches.length ? <div className="card-batch-table-wrap"><table className="card-batch-table"><thead><tr><th>Batch</th><th>Date</th><th>Printed</th><th>Faulty</th><th>Reprinted</th><th>Sold</th><th>Sales</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.batches.map((batch) => <tr key={batch.id}><td><strong>{batch.batchName}</strong>{batch.faultReprintReason ? <small>{data.faultReprintReasons.find((reason) => reason.value === batch.faultReprintReason)?.label}</small> : null}</td><td>{new Date(`${batch.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>{countFormatter.format(batch.cardsPrinted)}</td><td>{countFormatter.format(batch.faultyCards)}</td><td>{countFormatter.format(batch.reprintedCards)}</td><td>{countFormatter.format(batch.cardsSold)}</td><td><strong>{money(batch.totalSalesAmount)}</strong></td><td><div className="card-batch-actions"><button type="button" onClick={() => startEdit(batch)} aria-label={`Edit ${batch.batchName}`}><Pencil size={14} aria-hidden="true" />Edit</button><button type="button" onClick={() => void openCards(batch)} aria-label={`Manage cards in ${batch.batchName}`}><Boxes size={14} aria-hidden="true" />Cards</button><button type="button" className="is-delete" onClick={() => void deleteBatch(batch)} aria-label={`Delete ${batch.batchName}`}><Trash2 size={14} aria-hidden="true" />Delete</button></div></td></tr>)}</tbody></table></div> : <div className="card-batch-empty"><Boxes size={25} aria-hidden="true" /><strong>No card batches yet</strong><span>Add a batch to start tracking printing, faults, reprints, and sales.</span><button className="manage-button is-primary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Plus size={15} aria-hidden="true" />Add Batch</button></div>}
        </section>
        {selectedBatch ? <section className="manage-card card-entry-card"><header className="card-operations-heading"><div><h2>Cards in {selectedBatch.batchName}</h2><p>Optional profile links identify who received a physical card.</p></div><button className="manage-button" type="button" onClick={() => setSelectedBatch(null)}>Close</button></header><form className="card-entry-form" onSubmit={saveCard}><label>Card label<input value={cardForm.cardLabel} onChange={(event) => setCardForm((current) => ({ ...current, cardLabel: event.target.value }))} placeholder="e.g. Card #1" /></label><label>Status<select value={cardForm.status} onChange={(event) => setCardForm((current) => ({ ...current, status: event.target.value as CardEntry['status'] }))}><option value="available">Available</option><option value="faulty">Faulty</option><option value="reprinted">Reprinted</option><option value="sold">Sold</option></select></label><label>Sale price<input type="number" min="0" step="0.01" value={cardForm.salePrice} onChange={(event) => setCardForm((current) => ({ ...current, salePrice: event.target.value }))} /></label><label className="is-profile">Linked profile<div className="card-profile-search"><input value={profileQuery} onChange={(event) => setProfileQuery(event.target.value)} placeholder="Search member or professional" /><button type="button" onClick={() => void searchProfiles()} aria-label="Search profiles"><Search size={14} /></button></div>{cardForm.linkedProfile ? <small>Linked: {cardForm.linkedProfile.label} <button type="button" onClick={() => setCardForm((current) => ({ ...current, linkedProfile: null }))}>Clear</button></small> : null}{profileResults.map((profile) => <button className="card-profile-result" type="button" key={`${profile.type}-${profile.id}`} onClick={() => { setCardForm((current) => ({ ...current, linkedProfile: profile })); setProfileQuery(profile.label); setProfileResults([]) }}><strong>{profile.label}</strong><span>{profile.detail}</span></button>)}</label><label className="is-notes">Notes<textarea rows={2} value={cardForm.notes} onChange={(event) => setCardForm((current) => ({ ...current, notes: event.target.value }))} /></label>{cardForm.status === 'sold' && !cardForm.linkedProfile ? <p className="card-batch-warning"><TriangleAlert size={15} />Sold cards can be recorded without a linked profile for legacy/manual sales.</p> : null}{cardMessage ? <p className="card-batch-form-message">{cardMessage}</p> : null}<button className="manage-button is-primary" disabled={saving} type="submit"><Plus size={15} />{editingCardId ? 'Save card' : 'Add card'}</button>{editingCardId ? <button className="manage-button" type="button" onClick={() => { setEditingCardId(null); setCardForm(emptyCardForm()); setProfileQuery('') }}>Cancel</button> : null}</form>{cards.length ? <div className="card-batch-table-wrap"><table className="card-batch-table"><thead><tr><th>Card</th><th>Status</th><th>Sale price</th><th>Linked profile</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{cards.map((card) => <tr key={card.id}><td><strong>{card.cardLabel || `Card #${card.id}`}</strong>{card.notes ? <small>{card.notes}</small> : null}</td><td>{card.status}</td><td>{money(card.salePrice)}</td><td>{card.linkedProfile ? <><strong>{card.linkedProfile.label}</strong><small>{card.linkedProfile.detail}</small></> : '—'}</td><td><div className="card-batch-actions"><button type="button" onClick={() => editCard(card)}><Pencil size={14} />Edit</button><button className="is-delete" type="button" onClick={() => void deleteCard(card)}><Trash2 size={14} />Delete</button></div></td></tr>)}</tbody></table></div> : <div className="card-batch-empty"><strong>No individual cards recorded</strong><span>Add a card only when you want to track its assignment or sale.</span></div>}</section> : null}
      </div>
    </ManageShell>
  )
}

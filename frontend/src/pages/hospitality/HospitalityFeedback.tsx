import { useCallback, useEffect, useMemo, useState } from 'react'
import AlertTriangle from 'lucide-react/dist/esm/icons/triangle-alert.js'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days.js'
import LockKeyhole from 'lucide-react/dist/esm/icons/lock-keyhole.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Star from 'lucide-react/dist/esm/icons/star.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import { apiFetch, displayError, jsonBody, queryString } from '../../lib/api'
import './HospitalityFeedback.css'

type FeedbackStatus = 'new' | 'in_progress' | 'resolved'
type FeedbackEntry = {
  id: number
  rating: number
  comment: string
  status: FeedbackStatus
  touchpoint_source: string
  contact_name: string
  contact_email: string
  contact_phone: string
  internal_note: string
  created_at: string
  updated_at: string
}
type FeedbackResponse = {
  feedback: FeedbackEntry[]
  summary: {
    count: number
    average: number | null
    unresolved: number
    statusCounts: Record<FeedbackStatus, number>
  }
}

const statusLabels: Record<FeedbackStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
}
const sourceLabels: Record<string, string> = {
  public_profile: 'Public profile',
  qr_code: 'QR code',
  nfc_card: 'NFC card',
  menu: 'Public menu',
}

function Stars({ rating }: { rating: number }) {
  return <span className="feedback-stars" aria-label={`${rating} out of 5 stars`}>
    <span>{'★'.repeat(rating)}</span>{'★'.repeat(5 - rating)}
  </span>
}

function feedbackDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat(undefined, withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function HospitalityFeedback({ organizationId, googleReviewUrl }: { organizationId: number; googleReviewUrl: string }) {
  const [data, setData] = useState<FeedbackResponse | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [status, setStatus] = useState<'all' | FeedbackStatus>('all')
  const [rating, setRating] = useState('all')
  const [days, setDays] = useState('30')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch<FeedbackResponse>(
        `/api/organizations/${organizationId}/venue/feedback/${queryString({ status, rating, days })}`,
      )
      setData(response)
      setSelectedId((current) => response.feedback.some((entry) => entry.id === current)
        ? current
        : response.feedback[0]?.id ?? null)
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setLoading(false)
    }
  }, [days, organizationId, rating, status])

  useEffect(() => { void load() }, [load])
  const selected = useMemo(
    () => data?.feedback.find((entry) => entry.id === selectedId) ?? null,
    [data?.feedback, selectedId],
  )
  useEffect(() => { setNote(selected?.internal_note ?? ''); setNotice('') }, [selected?.id, selected?.internal_note])

  async function updateFeedback(changes: Partial<Pick<FeedbackEntry, 'status' | 'internal_note'>>) {
    if (!selected) return
    setSaving(true); setError(''); setNotice('')
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/feedback/`, {
        method: 'PATCH',
        body: jsonBody({ id: selected.id, ...changes }),
      })
      await load()
      setNotice(changes.internal_note !== undefined ? 'Internal note saved.' : 'Status updated.')
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (!data && loading) return <div className="manage-state">Loading customer feedback…</div>

  const summary = data?.summary ?? { count: 0, average: null, unresolved: 0, statusCounts: { new: 0, in_progress: 0, resolved: 0 } }
  const statusOptions: Array<'all' | FeedbackStatus> = ['all', 'new', 'in_progress', 'resolved']

  return <div className="feedback-page">
    <header className="feedback-heading">
      <div><h1>Customer Feedback</h1><p>Private feedback submitted through your profile</p></div>
    </header>

    {error ? <div className="manage-alert" role="alert">{error}</div> : null}
    <section className="feedback-metrics" aria-label="Feedback summary">
      <article><span className="feedback-metric-icon is-blue"><MessageSquare size={21} /></span><div><small>Feedback received</small><strong>{summary.count}</strong><p>All private submissions</p></div></article>
      <article><span className="feedback-metric-icon is-green"><Star size={21} /></span><div><small>Average feedback rating</small><strong>{summary.average === null ? 'No ratings yet' : `${Number(summary.average).toFixed(1)} / 5`}</strong><p>{summary.count ? `Based on ${summary.count} feedback` : 'Waiting for the first response'}</p></div></article>
      <article><span className="feedback-metric-icon is-amber"><AlertTriangle size={21} /></span><div><small>Needs attention</small><strong>{summary.unresolved}</strong><p>New or in progress</p></div></article>
    </section>

    <div className="feedback-workspace">
      <section className="feedback-inbox">
        <div className="feedback-filters">
          <div className="feedback-status-tabs" aria-label="Filter by status">
            {statusOptions.map((option) => <button type="button" key={option} className={status === option ? 'is-active' : ''} onClick={() => setStatus(option)}>
              {option === 'all' ? 'All' : statusLabels[option]} <span>{option === 'all' ? summary.count : summary.statusCounts[option]}</span>
            </button>)}
          </div>
          <label><span className="sr-only">Rating</span><select value={rating} onChange={(event) => setRating(event.target.value)}><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} stars</option>)}</select></label>
          <label><span className="sr-only">Submission date</span><select value={days} onChange={(event) => setDays(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></label>
        </div>
        <div className={`feedback-list ${loading ? 'is-loading' : ''}`} aria-live="polite">
          {data?.feedback.length ? data.feedback.map((entry) => <button type="button" key={entry.id} className={`feedback-row ${selectedId === entry.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(entry.id)}>
            <span className="feedback-avatar"><UserRound size={21} /></span>
            <span className="feedback-row-copy"><strong>{entry.contact_name || 'Anonymous customer'}</strong><Stars rating={entry.rating} /><span>{entry.comment || 'Rating only; no message provided.'}</span></span>
            <span className="feedback-row-meta"><time dateTime={entry.created_at}>{feedbackDate(entry.created_at)}</time><em className={`is-${entry.status}`}>{statusLabels[entry.status]}</em></span>
          </button>) : <div className="feedback-empty">
            <MessageSquare size={28} /><h2>{summary.count ? 'No feedback matches these filters' : 'No feedback yet'}</h2><p>{summary.count ? 'Try another rating, status, or date range.' : 'New anonymous customer submissions will appear here.'}</p>
          </div>}
        </div>
      </section>

      <div className="feedback-detail-column">
        <aside className="feedback-detail" aria-label="Selected feedback details">
          {selected ? <>
          <header><span className="feedback-avatar"><UserRound size={22} /></span><div><h2>{selected.contact_name || 'Anonymous customer'}</h2><Stars rating={selected.rating} /></div><span className="feedback-private"><LockKeyhole size={12} /> Private</span></header>
          <blockquote>{selected.comment || 'Rating only; no message provided.'}</blockquote>
          <div className="feedback-context"><span><CalendarDays size={15} /> {feedbackDate(selected.created_at, true)}</span>{selected.touchpoint_source ? <span>{sourceLabels[selected.touchpoint_source] || selected.touchpoint_source}</span> : null}</div>
          {(selected.contact_email || selected.contact_phone) ? <div className="feedback-contact"><strong>Customer shared contact details</strong>{selected.contact_email ? <a href={`mailto:${selected.contact_email}`}><Mail size={14} /> {selected.contact_email}</a> : null}{selected.contact_phone ? <a href={`tel:${selected.contact_phone}`}><Phone size={14} /> {selected.contact_phone}</a> : null}</div> : <p className="feedback-no-contact">No contact method was provided. This feedback remains anonymous.</p>}
          <div className="feedback-detail-form">
            <label>Status<select value={selected.status} disabled={saving} onChange={(event) => void updateFeedback({ status: event.target.value as FeedbackStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Internal note <span>Only your team can see this</span><textarea maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for your team (not visible to customers)…" /><small>{note.length}/5000</small></label>
            <button className="manage-button is-primary" type="button" disabled={saving || note === selected.internal_note} onClick={() => void updateFeedback({ internal_note: note })}>{saving ? 'Saving…' : 'Save note'}</button>
            {notice ? <p className="feedback-notice" role="status">{notice}</p> : null}
          </div>
          </> : <div className="feedback-empty"><LockKeyhole size={28} /><h2>Select feedback</h2><p>Choose a submission to review its private details.</p></div>}
        </aside>
        <aside className="feedback-google-separate">
          <div><strong>Google reviews are separate</strong><p>Google review clicks are tracked independently and are not counted as private feedback.</p></div>
          {googleReviewUrl
            ? <a className="manage-button" href={googleReviewUrl} target="_blank" rel="noreferrer">Open Google review page</a>
            : <a className="manage-button" href={`/dashboard/organizations/${organizationId}/hospitality/?tab=profile`}>Add Google review link</a>}
        </aside>
      </div>
    </div>
  </div>
}

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right.js'
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right.js'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Clipboard from 'lucide-react/dist/esm/icons/clipboard.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import MessageSquare from 'lucide-react/dist/esm/icons/message-square.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Store from 'lucide-react/dist/esm/icons/store.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import './HospitalityOverview.css'

type Feedback = { id: number; rating: number; comment: string; status: string; created_at: string }
export type HospitalityOverviewData = {
  days: number
  metrics: { profileViews: number; menuOpens: number; googleReviewClicks: number; feedbackSubmissions: number }
  previousMetrics: { profileViews: number; menuOpens: number; googleReviewClicks: number; feedbackSubmissions: number }
  dailyVisits: Array<{ date: string; count: number }>
  recentFeedback: Feedback[]
  setup: Array<{ key: string; label: string; complete: boolean }>
  readiness: { profileReady: boolean; menuItemCount: number; staffProfileCount: number; feedbackEnabled: boolean }
  organizations: Array<{ id: number; name: string }>
  trackingNotes: { profileViews: string; googleReviewClicks: string }
}

const metricDetails = [
  { key: 'profileViews', label: 'Profile views', icon: Eye, tint: 'blue' },
  { key: 'menuOpens', label: 'Menu opens', icon: Utensils, tint: 'green' },
  { key: 'googleReviewClicks', label: 'Google review clicks', icon: Store, tint: 'amber' },
  { key: 'feedbackSubmissions', label: 'Feedback submitted', icon: MessageSquare, tint: 'violet' },
] as const

export function MetricCard({ label, value, previous, icon, tint, note }: {
  label: string; value: number; previous: number; icon: typeof Eye; tint: string; note?: string
}) {
  const Icon = icon
  const change = previous > 0 ? Math.round(((value - previous) / previous) * 100) : null
  return (
    <article className="hospitality-metric-card">
      <div className={`hospitality-metric-icon is-${tint}`}><Icon size={19} aria-hidden="true" /></div>
      <h2>{label}</h2>
      <strong className="hospitality-metric-value">{value.toLocaleString()}</strong>
      {change === null ? <p className="hospitality-metric-comparison">{previous === 0 ? 'No prior-period data' : 'Comparison unavailable'}</p> : (
        <p className={`hospitality-metric-comparison ${change >= 0 ? 'is-positive' : 'is-negative'}`}>
          {change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {Math.abs(change)}% <span>vs previous period</span>
        </p>
      )}
      {note ? <small className="hospitality-metric-note">{note}</small> : null}
    </article>
  )
}

function VisitorsChart({ values }: { values: HospitalityOverviewData['dailyVisits'] }) {
  const max = Math.max(1, ...values.map((point) => point.count))
  const points = values.map((point, index) => ({
    ...point,
    x: values.length < 2 ? 50 : 8 + (index / (values.length - 1)) * 84,
    y: 90 - (point.count / max) * 76,
  }))
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  const hasData = values.some((point) => point.count > 0)
  return (
    <section className="hospitality-overview-panel hospitality-visitors-panel">
      <header><div><h2>Daily profile visits</h2><p>Recorded profile-view events, not unique individuals.</p></div></header>
      {hasData ? <>
        <div className="hospitality-chart-wrap">
          <svg viewBox="0 0 100 100" role="img" aria-label={`Daily profile visits: ${values.map((point) => `${point.date}, ${point.count}`).join('; ')}`} preserveAspectRatio="none">
            {[20, 40, 60, 80].map((y) => <line key={y} x1="7" x2="94" y1={y} y2={y} className="hospitality-chart-gridline" />)}
            <polyline points={polyline} className="hospitality-chart-line" />
            {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="1.3" className="hospitality-chart-point"><title>{point.date}: {point.count} visits</title></circle>)}
          </svg>
        </div>
        <div className="hospitality-chart-labels" aria-hidden="true">
          {points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0).map((point) => (
            <span key={point.date}>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${point.date}T12:00:00`))}</span>
          ))}
        </div>
      </> : <div className="hospitality-chart-empty"><span><ArrowUpRight size={21} /></span><strong>Activity will appear after customers scan or tap your card.</strong><p>Profile visits are recorded automatically.</p></div>}
    </section>
  )
}

function relativeDate(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const hours = Math.floor(elapsed / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function ShareQrDialog({ url, name, onClose, onDownloaded }: { url: string; name: string; onClose: () => void; onDownloaded: () => void }) {
  const [image, setImage] = useState('')
  const [message, setMessage] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButton.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const dialog = closeButton.current?.closest<HTMLElement>('[role="dialog"]')
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)')) : []
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  useEffect(() => {
    let active = true
    void QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#102644', light: '#ffffff' } })
      .then((result) => { if (active) setImage(result) })
      .catch(() => { if (active) setMessage('Could not generate the QR code. Please try again.') })
    return () => { active = false }
  }, [url])
  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setMessage('Profile link copied.') }
    catch { setMessage('Copy is unavailable in this browser. You can select the profile link below.') }
  }
  return (
    <div className="hospitality-qr-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="hospitality-qr-dialog" role="dialog" aria-modal="true" aria-labelledby="hospitality-qr-title">
        <button ref={closeButton} className="hospitality-qr-close" type="button" onClick={onClose} aria-label="Close QR code"><X size={19} /></button>
        <h2 id="hospitality-qr-title">Share {name}</h2>
        <p>Customers can scan this code to open your public digital profile.</p>
        {image ? <img className="hospitality-qr-image" src={image} alt={`QR code for ${name} public profile`} /> : <div className="hospitality-qr-image hospitality-qr-loading">Preparing QR code…</div>}
        <label className="hospitality-qr-url">Profile link<input readOnly value={url} onFocus={(event) => event.currentTarget.select()} /></label>
        {message ? <p className="hospitality-qr-message" role="status">{message}</p> : null}
        <div className="hospitality-qr-actions">
          <button type="button" className="manage-button" onClick={() => void copyLink()}><Clipboard size={15} />Copy link</button>
          <a className="manage-button is-primary" href={image || undefined} download={`${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-profile-qr.png`} aria-disabled={!image} onClick={onDownloaded}><Download size={15} />Download QR</a>
        </div>
      </section>
    </div>
  )
}

function QuickAction({ href, icon: Icon, title, detail, onClick }: { href?: string; icon: typeof Plus; title: string; detail: string; onClick?: () => void }) {
  const content = <><span className="hospitality-quick-icon"><Icon size={19} aria-hidden="true" /></span><strong>{title}</strong><span>{detail}</span><ChevronRight className="hospitality-quick-arrow" size={17} aria-hidden="true" /></>
  return href ? <a className="hospitality-quick-action" href={href}>{content}</a> : <button className="hospitality-quick-action" type="button" onClick={onClick}>{content}</button>
}

export function HospitalityOverview({ organizationId, publicIdentifier, organizationName, days, onDaysChange, data, loading, error, onRetry }: {
  organizationId: number; publicIdentifier: string; organizationName: string; days: number; onDaysChange: (days: number) => void
  data: HospitalityOverviewData | null; loading: boolean; error: string; onRetry: () => void
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const qrStorageKey = `tap2connect:venue:${organizationId}:qr-downloaded`
  const [qrDownloaded, setQrDownloaded] = useState(() => window.localStorage.getItem(qrStorageKey) === 'true')
  const publicUrl = `${window.location.origin}/venue/${publicIdentifier}/`
  const closeShareDialog = useCallback(() => setShareOpen(false), [])
  const markQrDownloaded = useCallback(() => {
    window.localStorage.setItem(qrStorageKey, 'true')
    setQrDownloaded(true)
  }, [qrStorageKey])
  const checklist = data ? [
    ...data.setup.slice(0, 2),
    { key: 'qr', label: 'QR code downloaded and ready to test', complete: qrDownloaded },
    ...data.setup.slice(2),
  ] : []
  const doneCount = checklist.filter((step) => step.complete).length
  const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0
  const readyForCustomers = Boolean(data?.readiness.profileReady && data.readiness.menuItemCount > 0 && data.readiness.feedbackEnabled && qrDownloaded)
  const incompleteSteps = checklist.filter((step) => !step.complete)
  const stepActions: Record<string, { label: string; href?: string; onClick?: () => void }> = {
    profile: { label: 'Edit business details', href: `/dashboard/organizations/${organizationId}/hospitality/?tab=profile` },
    menu: { label: 'Add menu item', href: `/dashboard/organizations/${organizationId}/hospitality/?tab=menu&action=add-item` },
    qr: { label: 'Download QR', onClick: () => setShareOpen(true) },
    staff: { label: 'Open Staff & Cards', href: `/dashboard/organizations/${organizationId}/hospitality/?tab=staff&action=add-staff` },
    feedback: { label: 'Review profile settings', href: `/dashboard/organizations/${organizationId}/hospitality/?tab=profile` },
  }

  return (
    <div className="hospitality-overview">
      <div className="hospitality-overview-heading">
        <div><h2>{organizationName}</h2><p>Everything you need to run your digital café profile.</p></div>
        <label className="hospitality-date-filter"><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">Overview date range</span>
          <select value={days} onChange={(event) => onDaysChange(Number(event.target.value))}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>
      {error ? <div className="manage-alert" role="alert">{error} <button type="button" onClick={onRetry}>Retry</button></div> : null}
      {loading && !data ? <div className="hospitality-overview-loading" role="status">Loading your overview…</div> : null}
      {data ? <>
        <section className="hospitality-readiness">
          <div><h2>{readyForCustomers ? `${organizationName} is ready for customers` : `Finish setting up ${organizationName}`}</h2><p>{readyForCustomers ? 'Customers can scan or tap to view your profile and menu.' : 'Complete the remaining items before starting the café pilot.'}</p></div>
          <div className="hospitality-readiness-progress"><span>Pilot setup <strong>{doneCount} of {checklist.length} complete</strong></span><i><b style={{ width: `${progress}%` }} /></i></div>
          <button type="button" className="manage-button is-primary" onClick={() => setShareOpen(true)}><QrCode size={15} />Share QR code</button>
        </section>
        <section className="hospitality-attention-panel">
          <header><div><h2>{incompleteSteps.length ? 'Needs attention' : 'Pilot setup complete'}</h2><p>{incompleteSteps.length ? 'Finish these items before inviting pilot customers.' : 'Your profile, menu, QR, staff, and feedback setup are ready.'}</p></div></header>
          {incompleteSteps.length ? <div className="hospitality-attention-list">{incompleteSteps.map((step) => {
            const action = stepActions[step.key]
            return <article key={step.key}><span className="hospitality-setup-check" aria-label="Incomplete" /><div><strong>{step.label}</strong><small>{step.key === 'staff' ? 'Staff profiles and physical cards stay together in Staff & Cards.' : step.key === 'qr' ? 'Print it and test the full scan journey on a real phone.' : 'This is required for the free café pilot.'}</small></div>{action.href ? <a href={action.href}>{action.label}<ChevronRight size={15} /></a> : <button type="button" onClick={action.onClick}>{action.label}<ChevronRight size={15} /></button>}</article>
          })}</div> : <div className="hospitality-attention-complete"><Check size={17} />No setup blockers. You can begin the café pilot.</div>}
        </section>
        <section className={`hospitality-activity-summary${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
          <header><div><h2>Customer activity</h2><p>Tracked interactions from the selected period.</p></div></header>
          <div>{metricDetails.map(({ key, icon: Icon }) => <article key={key}><Icon size={19} /><span><small>{metricDetails.find((item) => item.key === key)?.label}</small><strong>{data.metrics[key].toLocaleString()}</strong><em>Last {days} days</em></span></article>)}</div>
        </section>
        <div className="hospitality-overview-grid">
          <VisitorsChart values={data.dailyVisits} />
          <section className="hospitality-overview-panel hospitality-recent-feedback">
            <header><div><h2>Recent anonymous feedback</h2><p>Only feedback submitted during this date range.</p></div><a href={`/dashboard/organizations/${organizationId}/hospitality/?tab=feedback`}>View all</a></header>
            {data.recentFeedback.length ? <div className="hospitality-feedback-list">{data.recentFeedback.map((entry) => <article key={entry.id}>
              <div className="hospitality-feedback-rating" aria-label={`${entry.rating} out of 5 stars`}>{'★'.repeat(entry.rating)}<span>{'★'.repeat(5 - entry.rating)}</span></div>
              <div className="hospitality-feedback-copy"><strong>Anonymous customer <time dateTime={entry.created_at}>{relativeDate(entry.created_at)}</time></strong><p>{entry.comment || 'Rating only; no comment provided.'}</p></div>
              <span className={`hospitality-feedback-status is-${entry.status}`}>{entry.status}</span>
            </article>)}</div> : <div className="hospitality-overview-empty">No feedback in this period yet. Customer responses will appear here anonymously.</div>}
          </section>
          <section className="hospitality-overview-panel hospitality-quick-panel">
            <header><div><h2>Quick actions</h2><p>Common tasks for your business.</p></div></header>
            <div className="hospitality-quick-list">
              <QuickAction href={`/dashboard/organizations/${organizationId}/hospitality/?tab=menu&action=add-item`} icon={Plus} title="Add menu item" detail="Keep your menu up to date" />
              <QuickAction href={`/dashboard/organizations/${organizationId}/hospitality/?tab=profile`} icon={Store} title="Edit profile" detail="Update business information" />
              <QuickAction href={`/dashboard/organizations/${organizationId}/hospitality/?tab=staff&action=add-staff`} icon={UserRound} title="Staff & Cards" detail="Add staff profiles and manage physical cards" />
              <QuickAction icon={QrCode} title="Share or download QR" detail="Help customers find your profile" onClick={() => setShareOpen(true)} />
            </div>
          </section>
        </div>
        <p className="hospitality-overview-disclaimer">Profile visits and menu opens are recorded from customer interactions. Google review clicks count button opens only; Google does not report whether a review was later submitted. Ordering, loyalty, and games are planned for later phases.</p>
      </> : null}
      {shareOpen ? <ShareQrDialog url={publicUrl} name={organizationName} onClose={closeShareDialog} onDownloaded={markQrDownloaded} /> : null}
    </div>
  )
}


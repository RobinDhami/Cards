import { useState } from 'react'
import Bell from 'lucide-react/dist/esm/icons/bell.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import { apiFetch, displayError } from '../../lib/api'
import './HospitalityActivityNotifications.css'

type Activity = { id: number; type: string; summary: string; actor: string; createdAt: string }

function activityTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(elapsed / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function HospitalityActivityNotifications({ organizationId }: { organizationId: number }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [rows, setRows] = useState<Activity[]>([])
  const [error, setError] = useState('')

  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || loaded) return
    try {
      const result = await apiFetch<{ activity: Activity[] }>(`/api/organizations/${organizationId}/venue/activity/`)
      setRows(result.activity.slice(0, 6))
      setLoaded(true)
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  return <div className="hospitality-notification-control">
    <button className="manage-icon-button" type="button" title="Recent activity" aria-label="Recent activity" aria-expanded={open} onClick={() => void toggle()}><Bell size={17} /></button>
    {open ? <section className="hospitality-notification-popover" role="dialog" aria-label="Recent activity notifications">
      <header><strong>Recent activity</strong></header>
      <div className="hospitality-notification-list">
        {error ? <p>{error}</p> : null}
        {!loaded && !error ? <p>Loading activity…</p> : null}
        {loaded && rows.length === 0 ? <p>No activity yet.</p> : null}
        {rows.map((row) => <article key={row.id}><span><Clock3 size={14} /></span><div><strong>{row.summary}</strong><small>{row.actor} · {activityTime(row.createdAt)}</small></div></article>)}
      </div>
    </section> : null}
  </div>
}

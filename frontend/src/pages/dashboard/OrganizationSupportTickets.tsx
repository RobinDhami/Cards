import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Check from 'lucide-react/dist/esm/icons/check.js'
import LifeBuoy from 'lucide-react/dist/esm/icons/life-buoy.js'
import Moon from 'lucide-react/dist/esm/icons/moon.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Sun from 'lucide-react/dist/esm/icons/sun.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { DashboardHeaderTools } from '../../components/manage/DashboardHeaderTools'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { schoolWorkspaceNav } from '../school/schoolWorkspaceNav'
import { HospitalityActivityNotifications } from '../hospitality/HospitalityActivityNotifications'
import '../hospitality/HospitalityWorkspace.css'
import '../hospitality/HospitalityDashboardSystem.css'
import './PlatformTickets.css'

type Ticket = { id: number; subject: string; message: string; category: string; priority: string; status: 'open' | 'in_progress' | 'resolved'; requester: string; createdAt: string; updatedAt: string }
type Payload = {
  tickets: Ticket[]
  organization: { id: number; name: string; logo: string; organizationType: string; themePrimary: string }
  isSuperAdmin: boolean
  capabilities: string[]
  user: { displayName: string }
}
const emptyForm = { subject: '', message: '', category: 'technical', priority: 'normal' }
const statusLabel = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' }

function organizationId() {
  return Number(window.location.pathname.match(/organizations\/(\d+)/)?.[1] || 0)
}

export function OrganizationSupportTickets() {
  const id = organizationId()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(() => new URLSearchParams(window.location.search).get('new') === '1')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [darkTheme, setDarkTheme] = useState(() => window.localStorage.getItem('tap2connect:hospitality-theme') !== 'light')

  useEffect(() => {
    apiFetch<Payload>(`/api/organizations/${id}/support/tickets/`).then(setData).catch((reason) => setError(displayError(reason)))
  }, [id])

  async function createTicket(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiFetch<{ ticket: Ticket }>(`/api/organizations/${id}/support/tickets/`, { method: 'POST', body: jsonBody(form) })
      setData((current) => current ? { ...current, tickets: [response.ticket, ...current.tickets] } : current)
      setForm(emptyForm)
      setShowForm(false)
      window.history.replaceState({}, '', `/dashboard/organizations/${id}/support/`)
    } catch (reason) { setError(displayError(reason)) }
    finally { setSaving(false) }
  }

  if (!data) return <div className="manage-state">{error || 'Loading support…'}</div>
  const organization = data.organization
  const navigation = schoolWorkspaceNav(organization.id, data.isSuperAdmin, organization.organizationType, data.capabilities)
  const isHospitality = organization.organizationType === 'hospitality'
  const toggleTheme = () => setDarkTheme((current) => {
    const next = !current
    window.localStorage.setItem('tap2connect:hospitality-theme', next ? 'dark' : 'light')
    return next
  })

  return (
    <ManageShell brand={organization.name} logo={organization.logo || undefined} nav={navigation} title="Support" userName={data.user.displayName} userRole="" accent={organization.themePrimary || '#0b4bcb'} showNotifications={!isHospitality} className={isHospitality ? `manage-app--hospitality ${darkTheme ? 'manage-app--hospitality-theme-dark' : 'manage-app--hospitality-theme-light'}` : ''} actions={<>{isHospitality ? <HospitalityActivityNotifications organizationId={organization.id} /> : null}<DashboardHeaderTools nav={navigation} organizationId={organization.id} enableSupport canRaiseSupport={!data.isSuperAdmin} />{isHospitality ? <button type="button" className="manage-icon-button hospitality-theme-toggle" onClick={toggleTheme} aria-label={darkTheme ? 'Use light theme' : 'Use dark theme'} title={darkTheme ? 'Use light theme' : 'Use dark theme'}>{darkTheme ? <Sun size={16} /> : <Moon size={16} />}</button> : null}</>}>
      <div className="platform-tickets-page organization-support-page">
        {error ? <div className="platform-ticket-error" role="alert">{error}</div> : null}
        <div className="platform-ticket-toolbar"><span>{data.tickets.length} {data.tickets.length === 1 ? 'ticket' : 'tickets'}</span>{!data.isSuperAdmin ? <button type="button" className="manage-button is-primary" onClick={() => setShowForm(true)}><Plus size={16} />Raise ticket</button> : null}</div>
        <section className="manage-card platform-ticket-list" aria-label="Organization support tickets">
          <div className="organization-ticket-head"><span>Ticket</span><span>Priority</span><span>Status</span><span>Updated</span></div>
          {data.tickets.map((ticket) => <article className="organization-ticket-row" key={ticket.id}><div><strong>#{ticket.id} · {ticket.subject}</strong><small>{ticket.message}</small></div><span>{ticket.priority}</span><em className={`is-${ticket.status}`}>{statusLabel[ticket.status]}</em><time dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleDateString()}</time></article>)}
          {data.tickets.length === 0 ? <div className="platform-ticket-empty"><LifeBuoy size={20} />No support tickets yet.</div> : null}
        </section>
      </div>
      {showForm && !data.isSuperAdmin ? <div className="platform-ticket-modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="platform-ticket-modal" onSubmit={createTicket} onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Raise ticket</h2><p>Describe what you need help with.</p></div><button type="button" aria-label="Close" onClick={() => setShowForm(false)}><X size={18} /></button></header><label>Subject<input required maxLength={180} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="technical">Technical issue</option><option value="account">Account access</option><option value="billing">Billing</option><option value="other">Other</option></select></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><label>Description<textarea required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label><footer><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={saving}><Check size={16} />{saving ? 'Sending…' : 'Raise ticket'}</button></footer></form></div> : null}
    </ManageShell>
  )
}

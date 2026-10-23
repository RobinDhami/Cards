import { useEffect, useMemo, useState } from 'react'
import LifeBuoy from 'lucide-react/dist/esm/icons/life-buoy.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import './PlatformTickets.css'

type TicketStatus = 'open' | 'in_progress' | 'resolved'
type TicketPriority = 'low' | 'normal' | 'high'
type Ticket = { id: number; subject: string; message: string; category: string; priority: TicketPriority; status: TicketStatus; requester: string; organization: { id: number; name: string } | null; createdAt: string; updatedAt: string }
type TicketPayload = { tickets: Ticket[]; user: { displayName: string; roleLabel: string }; platformAccess: { isSuperAdmin: boolean; allowedModules: string[] } }

const statusLabel: Record<TicketStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' }

export function PlatformTickets() {
  const [data, setData] = useState<TicketPayload | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all')

  async function load() {
    try {
      setError('')
      setData(await apiFetch<TicketPayload>('/api/dashboard/tickets/'))
    } catch (reason) { setError(displayError(reason)) }
  }

  useEffect(() => { void load() }, [])

  const tickets = useMemo(() => data?.tickets.filter((ticket) => filter === 'all' || ticket.status === filter) ?? [], [data, filter])

  async function updateTicket(ticket: Ticket, update: Partial<Pick<Ticket, 'status' | 'priority'>>) {
    try {
      const response = await apiFetch<{ ticket: Ticket }>(`/api/dashboard/tickets/${ticket.id}/`, { method: 'PATCH', body: jsonBody(update) })
      setData((current) => current ? { ...current, tickets: current.tickets.map((item) => item.id === ticket.id ? response.ticket : item) } : current)
    } catch (reason) { setError(displayError(reason)) }
  }

  if (!data) return <div className="manage-state">{error || 'Loading tickets…'}</div>

  return (
    <ManageShell brand="Tap2Connect" logo={brandLogo} nav={platformNavigation(data.platformAccess.allowedModules)} title="Tickets" userName={data.user.displayName} userRole={data.user.roleLabel}>
      <div className="platform-tickets-page">
        {error ? <div className="platform-ticket-error" role="alert">{error}</div> : null}
        <div className="platform-ticket-toolbar">
          <div className="platform-ticket-tabs" role="tablist" aria-label="Ticket status">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => <button type="button" role="tab" aria-selected={filter === status} className={filter === status ? 'is-active' : ''} onClick={() => setFilter(status)} key={status}>{status === 'all' ? 'All tickets' : statusLabel[status]}</button>)}
          </div>
          <span>{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
        </div>
        <section className="manage-card platform-ticket-list" aria-label="Support tickets">
          <div className="platform-ticket-head"><span>Ticket</span><span>Organization</span><span>Category</span><span>Priority</span><span>Status</span><span>Updated</span></div>
          {tickets.map((ticket) => (
            <article key={ticket.id} className="platform-ticket-row">
              <div><strong>#{ticket.id} · {ticket.subject}</strong><small>{ticket.message}</small><em>{ticket.requester}</em></div>
              <span>{ticket.organization?.name || 'Legacy ticket'}</span><span>{ticket.category.replace('_', ' ')}</span>
              <select aria-label={`Priority for ${ticket.subject}`} value={ticket.priority} onChange={(event) => void updateTicket(ticket, { priority: event.target.value as TicketPriority })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select>
              <select aria-label={`Status for ${ticket.subject}`} value={ticket.status} onChange={(event) => void updateTicket(ticket, { status: event.target.value as TicketStatus })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>
              <time dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleDateString()}</time>
            </article>
          ))}
          {tickets.length === 0 ? <div className="platform-ticket-empty"><LifeBuoy size={20} />No tickets here.</div> : null}
        </section>
      </div>
    </ManageShell>
  )
}

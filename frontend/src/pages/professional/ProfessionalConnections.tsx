import { useCallback, useEffect, useState } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import Bell from 'lucide-react/dist/esm/icons/bell.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './ProfessionalConnections.css'

type ConnectionPerson = {
  id: number
  slug: string
  fullName: string
  profession: string
  organization: string
  phone: string
  photoUrl: string
  initials: string
  publicUrl: string
}

type ConnectionItem = {
  id: number
  status: 'pending' | 'accepted'
  direction: 'incoming' | 'outgoing'
  createdAt: string
  updatedAt: string
  notification: string
  person: ConnectionPerson
}

type ConnectionsPayload = {
  profile: ConnectionPerson
  notifications: ConnectionItem[]
  pendingSent: ConnectionItem[]
  connections: ConnectionItem[]
  notificationCount: number
}

type ConnectionTab = 'requests' | 'connections' | 'sent'

const tabKeys = new Set<ConnectionTab>(['requests', 'connections', 'sent'])

function initialTab(): ConnectionTab {
  const tab = new URLSearchParams(window.location.search).get('tab') as ConnectionTab | null
  return tab && tabKeys.has(tab) ? tab : 'requests'
}

function Avatar({ person }: { person: ConnectionPerson }) {
  return (
    <span className="connections-avatar">
      {person.photoUrl ? <img src={person.photoUrl} alt="" /> : person.initials}
    </span>
  )
}

function PersonCopy({ person }: { person: ConnectionPerson }) {
  const position = [person.profession, person.organization].filter(Boolean).join(' · ')
  return (
    <span className="connections-person-copy">
      <strong>{person.fullName}</strong>
      <span>{position || 'Tap2Connect member'}</span>
    </span>
  )
}

function ConnectionRow({ connection }: { connection: ConnectionItem }) {
  const { person } = connection
  return (
    <article className="connection-person-row">
      <a className="connection-person-link" href={person.publicUrl}>
        <Avatar person={person} />
        <PersonCopy person={person} />
      </a>
      {person.phone ? (
        <a className="connection-call" href={`tel:${person.phone}`} aria-label={`Call ${person.fullName}`} title={`Call ${person.fullName}`}>
          <Phone size={19} aria-hidden="true" />
        </a>
      ) : null}
    </article>
  )
}

export function ProfessionalConnections() {
  const [data, setData] = useState<ConnectionsPayload | null>(null)
  const [activeTab, setActiveTab] = useState<ConnectionTab>(initialTab)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [respondingId, setRespondingId] = useState<number | null>(null)

  const loadConnections = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await apiFetch<ConnectionsPayload>('/api/connections/')
      setData(payload)
      setError('')
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Connections | Tap2Connect Nepal'
    void loadConnections()
  }, [loadConnections])

  function chooseTab(tab: ConnectionTab) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url)
  }

  async function respond(connection: ConnectionItem, action: 'accept' | 'reject') {
    if (respondingId !== null) return
    setRespondingId(connection.id)
    setMessage('')
    try {
      const response = await apiFetch<{ message: string }>(`/api/connections/${connection.id}/respond/`, {
        method: 'POST',
        body: jsonBody({ action }),
      })
      setMessage(response.message)
      await loadConnections()
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setRespondingId(null)
    }
  }

  if (loading && !data) return <div className="manage-state">Loading connections...</div>

  if (!data) {
    return (
      <div className="profile-state-screen">
        <div className="profile-state-card">
          <strong>Connections unavailable</strong>
          {error || 'Sign in with a Tap2Connect profile account to continue.'}
          <a href="/login/">Go to sign in</a>
        </div>
      </div>
    )
  }

  const tabs: Array<{ key: ConnectionTab; label: string; count: number }> = [
    { key: 'requests', label: 'Requests', count: data.notificationCount },
    { key: 'connections', label: 'Connections', count: data.connections.length },
    { key: 'sent', label: 'Sent', count: data.pendingSent.length },
  ]

  return (
    <main className="connections-page">
      <section className="connections-shell">
        <header className="connections-header">
          <a href={data.profile.publicUrl} aria-label="Back to profile"><ArrowLeft size={20} /></a>
          <div><h1>Connections</h1><p>Your verified Tap2Connect network</p></div>
          <button type="button" onClick={() => chooseTab('requests')} aria-label={`${data.notificationCount} connection requests`}>
            <Bell size={20} />
            {data.notificationCount > 0 ? <span>{data.notificationCount}</span> : null}
          </button>
        </header>

        <nav className="connections-tabs" aria-label="Connection views">
          {tabs.map((tab) => (
            <button className={activeTab === tab.key ? 'is-active' : ''} type="button" onClick={() => chooseTab(tab.key)} key={tab.key}>
              {tab.label}<span>{tab.count}</span>
            </button>
          ))}
        </nav>

        {error ? <div className="connections-alert is-error">{error}</div> : null}
        {message ? <div className="connections-alert">{message}</div> : null}

        {activeTab === 'requests' ? (
          <>
            <section className="connections-view" aria-labelledby="connection-requests-title">
              <header><div><h2 id="connection-requests-title">Incoming requests</h2><p>People who want to add you to their network.</p></div><span>{data.notificationCount}</span></header>
              {data.notifications.length === 0 ? (
                <div className="connections-empty"><Bell size={23} /><strong>You are all caught up</strong><span>New requests will appear here.</span></div>
              ) : (
                <div className="connections-list">
                  {data.notifications.map((connection) => (
                    <article className="connection-request" key={connection.id}>
                      <a className="connection-request-person" href={connection.person.publicUrl}>
                        <Avatar person={connection.person} />
                        <span><PersonCopy person={connection.person} /><small>{connection.person.fullName} wants to connect with you.</small></span>
                      </a>
                      <div className="connection-response-actions">
                        <button className="is-accept" type="button" disabled={respondingId === connection.id} onClick={() => void respond(connection, 'accept')}><Check size={15} />Add back</button>
                        <button type="button" disabled={respondingId === connection.id} onClick={() => void respond(connection, 'reject')}><X size={15} />Decline</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            {data.connections.length > 0 ? (
              <section className="connections-view connections-preview" aria-labelledby="connections-preview-title">
                <header><div><h2 id="connections-preview-title">Your connections</h2><p>Call directly or open a profile.</p></div><span>{data.connections.length}</span></header>
                <div className="connections-list is-people">
                  {data.connections.slice(0, 3).map((connection) => <ConnectionRow connection={connection} key={connection.id} />)}
                </div>
                <button className="connections-view-all" type="button" onClick={() => chooseTab('connections')}>View all connections <ChevronRight size={16} /></button>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === 'connections' ? (
          <section className="connections-view" aria-labelledby="my-connections-title">
            <header><div><h2 id="my-connections-title">Your connections</h2><p>Open a profile or call directly.</p></div><span>{data.connections.length}</span></header>
            {data.connections.length === 0 ? (
              <div className="connections-empty"><Users size={23} /><strong>No connections yet</strong><span>Connect from someone&apos;s public profile to get started.</span></div>
            ) : (
              <div className="connections-list is-people">
                {data.connections.map((connection) => <ConnectionRow connection={connection} key={connection.id} />)}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'sent' ? (
          <section className="connections-view" aria-labelledby="sent-requests-title">
            <header><div><h2 id="sent-requests-title">Sent requests</h2><p>Waiting for the other person to respond.</p></div><span>{data.pendingSent.length}</span></header>
            {data.pendingSent.length === 0 ? (
              <div className="connections-empty"><Clock3 size={23} /><strong>No pending requests</strong><span>Your sent requests will appear here.</span></div>
            ) : (
              <div className="connections-list is-people">
                {data.pendingSent.map((connection) => (
                  <article className="connection-person-row" key={connection.id}>
                    <a className="connection-person-link" href={connection.person.publicUrl}>
                      <Avatar person={connection.person} />
                      <PersonCopy person={connection.person} />
                    </a>
                    <span className="connection-pending"><Clock3 size={13} />Pending</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    </main>
  )
}

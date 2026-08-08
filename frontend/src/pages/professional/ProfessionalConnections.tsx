import { useCallback, useEffect, useState } from 'react'
import Bell from 'lucide-react/dist/esm/icons/bell.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import UserRound from 'lucide-react/dist/esm/icons/user-round.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './ProfessionalConnections.css'

type ConnectionPerson = {
  id: number
  slug: string
  fullName: string
  profession: string
  organization: string
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

function Avatar({ person }: { person: ConnectionPerson }) {
  return (
    <span className="connections-avatar">
      {person.photoUrl ? <img src={person.photoUrl} alt="" /> : person.initials}
    </span>
  )
}

function PersonCopy({ person }: { person: ConnectionPerson }) {
  return (
    <span className="connections-person-copy">
      <strong>{person.fullName}</strong>
      <span>{[person.profession, person.organization].filter(Boolean).join(' · ') || 'Professional profile'}</span>
    </span>
  )
}

export function ProfessionalConnections() {
  const [data, setData] = useState<ConnectionsPayload | null>(null)
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
          {error || 'Sign in with a professional profile account to continue.'}
          <a href="/login/">Go to sign in</a>
        </div>
      </div>
    )
  }

  const nav = [
    { label: 'Profile editor', href: `/p/${data.profile.slug}/edit/`, icon: UserRound },
    { label: 'Public profile', href: data.profile.publicUrl, icon: Eye },
    { label: 'Connections', href: '/connections/', icon: Users, active: true },
  ]

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Professional network"
      logo="/static/branding/tap2connect-logo.png"
      nav={nav}
      title="Connections"
      subtitle={`${data.connections.length} connected · ${data.notificationCount} request${data.notificationCount === 1 ? '' : 's'} waiting`}
      userName={data.profile.fullName}
      userRole="Profile owner"
      notificationsHref="/connections/"
    >
      {error ? <div className="manage-alert">{error}</div> : null}
      {message ? <div className="manage-alert is-success">{message}</div> : null}

      <section className="connections-summary">
        <article><span><Users size={20} /></span><strong>{data.connections.length}</strong><small>Connections</small></article>
        <article><span><Bell size={20} /></span><strong>{data.notificationCount}</strong><small>New requests</small></article>
        <article><span><Clock3 size={20} /></span><strong>{data.pendingSent.length}</strong><small>Sent requests</small></article>
      </section>

      <section className="connections-section manage-card">
        <header>
          <div><h2>Connection requests</h2><p>People who want to add you to their professional network.</p></div>
          {data.notificationCount > 0 ? <span className="connections-count">{data.notificationCount} new</span> : null}
        </header>
        {data.notifications.length === 0 ? (
          <div className="connections-empty"><Bell size={22} /><strong>You are all caught up</strong><span>New connection requests will appear here.</span></div>
        ) : (
          <div className="connections-list">
            {data.notifications.map((connection) => (
              <article className="connection-request" key={connection.id}>
                <Avatar person={connection.person} />
                <div>
                  <PersonCopy person={connection.person} />
                  <p>{connection.notification}</p>
                </div>
                <div className="connection-response-actions">
                  <button className="is-accept" type="button" disabled={respondingId === connection.id} onClick={() => void respond(connection, 'accept')}><Check size={15} />Accept</button>
                  <button type="button" disabled={respondingId === connection.id} onClick={() => void respond(connection, 'reject')}><X size={15} />Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="connections-section manage-card">
        <header><div><h2>My connections</h2><p>Requests appear here after you accept them.</p></div></header>
        {data.connections.length === 0 ? (
          <div className="connections-empty"><Users size={22} /><strong>No accepted connections yet</strong><span>Open someone&apos;s profile and choose Let&apos;s Connect to start.</span></div>
        ) : (
          <div className="connection-grid">
            {data.connections.map((connection) => (
              <a href={connection.person.publicUrl} className="connection-person" key={connection.id}>
                <Avatar person={connection.person} />
                <PersonCopy person={connection.person} />
                <Eye size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </section>

      {data.pendingSent.length > 0 ? (
        <section className="connections-section manage-card">
          <header><div><h2>Sent requests</h2><p>Waiting for the other person to accept or reject.</p></div></header>
          <div className="connection-grid">
            {data.pendingSent.map((connection) => (
              <a href={connection.person.publicUrl} className="connection-person" key={connection.id}>
                <Avatar person={connection.person} />
                <PersonCopy person={connection.person} />
                <span className="connection-pending"><Clock3 size={13} />Pending</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </ManageShell>
  )
}

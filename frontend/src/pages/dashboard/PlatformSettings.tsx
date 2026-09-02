import { useEffect, useState } from 'react'
import Check from 'lucide-react/dist/esm/icons/check.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import UserRoundCog from 'lucide-react/dist/esm/icons/user-round-cog.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { ApiError, apiFetch } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import './PlatformSettings.css'

type SessionData = {
  authenticated: boolean
  user: { displayName: string }
  platformAccess: { isSuperAdmin: boolean; allowedModules: string[] }
}

type StaffMember = {
  id: number
  fullName: string
  username: string
  email: string
  allowedModules: string[]
  isActive: boolean
}

type PlatformModuleOption = { key: string; label: string }
type StaffResponse = { staff: StaffMember[]; modules: PlatformModuleOption[] }
type StaffFormState = {
  fullName: string
  username: string
  email: string
  temporaryPassword: string
  allowedModules: string[]
  isActive: boolean
}

const emptyStaffForm: StaffFormState = {
  fullName: '',
  username: '',
  email: '',
  temporaryPassword: '',
  allowedModules: [],
  isActive: true,
}

function sectionFromPath() {
  return window.location.pathname.includes('/staff-access') ? 'staff-access' : 'general'
}

function SettingsTabs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const active = sectionFromPath()
  return (
    <nav className="platform-settings-tabs" aria-label="Platform settings sections">
      <a className={active === 'general' ? 'is-active' : ''} href="/dashboard/settings/">General</a>
      {isSuperAdmin ? (
        <a className={active === 'staff-access' ? 'is-active' : ''} href="/dashboard/settings/staff-access/">Staff &amp; Access</a>
      ) : null}
      <span aria-disabled="true" title="Security settings are not configured yet">Security</span>
    </nav>
  )
}

function StaffForm({
  member,
  modules,
  saving,
  error,
  onClose,
  onSaved,
}: {
  member: StaffMember | null
  modules: PlatformModuleOption[]
  saving: boolean
  error: string
  onClose: () => void
  onSaved: (form: StaffFormState) => void
}) {
  const [form, setForm] = useState<StaffFormState>(() => member ? {
    fullName: member.fullName,
    username: member.username,
    email: member.email,
    temporaryPassword: '',
    allowedModules: member.allowedModules,
    isActive: member.isActive,
  } : emptyStaffForm)

  function toggleModule(module: string) {
    setForm((current) => ({
      ...current,
      allowedModules: current.allowedModules.includes(module)
        ? current.allowedModules.filter((item) => item !== module)
        : [...current.allowedModules, module],
    }))
  }

  return (
    <div className="platform-staff-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <form className="manage-card platform-staff-form" role="dialog" aria-modal="true" aria-labelledby="platform-staff-form-title" onSubmit={(event) => {
        event.preventDefault()
        onSaved(form)
      }}>
        <header>
          <div>
            <h2 id="platform-staff-form-title">{member ? 'Edit Staff Access' : 'Add Platform Staff'}</h2>
            <p>Create a normal staff account and choose the platform modules it can access.</p>
          </div>
          <button className="platform-text-button" type="button" onClick={onClose}>Cancel</button>
        </header>

        {error ? <div className="manage-alert">{error}</div> : null}

        <div className="platform-staff-fields">
          <label>Full Name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>Username<input required autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>
            {member ? 'New Temporary Password' : 'Temporary Password'}
            <input
              required={!member}
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder={member ? 'Leave blank to keep current password' : ''}
              value={form.temporaryPassword}
              onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })}
            />
          </label>
        </div>

        <fieldset>
          <legend>Module Access</legend>
          <p>Super Admin access is never assigned through these controls.</p>
          <div className="platform-access-options">
            {modules.map((module) => (
              <label className={form.allowedModules.includes(module.key) ? 'is-selected' : ''} key={module.key}>
                <input
                  type="checkbox"
                  checked={form.allowedModules.includes(module.key)}
                  onChange={() => toggleModule(module.key)}
                />
                <span><Check size={13} aria-hidden="true" /></span>
                {module.label}
              </label>
            ))}
          </div>
        </fieldset>

        <footer>
          <button className="manage-button" type="button" onClick={onClose}>Cancel</button>
          <button className="manage-button is-primary" type="submit" disabled={saving || form.allowedModules.length === 0}>
            {saving ? 'Saving…' : member ? 'Save Access' : 'Create Staff'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function StaffAccessPanel() {
  const [data, setData] = useState<StaffResponse | null>(null)
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    apiFetch<StaffResponse>('/api/dashboard/platform-staff/')
      .then((response) => { if (current) setData(response) })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : 'Platform Staff could not be loaded.') })
    return () => { current = false }
  }, [])

  async function saveStaff(form: StaffFormState, target: StaffMember | null | undefined = editing) {
    setSaving(true)
    setError('')
    try {
      const endpoint = target
        ? `/api/dashboard/platform-staff/${target.id}/`
        : '/api/dashboard/platform-staff/'
      const response = await apiFetch<{ staffMember: StaffMember }>(endpoint, {
        method: target ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      })
      setData((current) => current ? {
        ...current,
        staff: target
          ? current.staff.map((member) => member.id === response.staffMember.id ? response.staffMember : member)
          : [...current.staff, response.staffMember].sort((left, right) => left.fullName.localeCompare(right.fullName)),
      } : current)
      setEditing(undefined)
    } catch (caught) {
      if (caught instanceof ApiError) {
        const fieldMessages = Object.values(caught.errors).flat()
        setError(fieldMessages[0] || caught.message)
      } else {
        setError(caught instanceof Error ? caught.message : 'Platform Staff could not be saved.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(member: StaffMember) {
    await saveStaff({
      fullName: member.fullName,
      username: member.username,
      email: member.email,
      temporaryPassword: '',
      allowedModules: member.allowedModules,
      isActive: !member.isActive,
    }, member)
  }

  if (!data && !error) return <div className="manage-state">Loading Platform Staff…</div>

  return (
    <section className="manage-card platform-staff-card">
      <header className="platform-staff-card-header">
        <div><h2>Platform Staff</h2><p>Manage internal accounts and their module access.</p></div>
        <button className="manage-button is-primary" type="button" onClick={() => { setError(''); setEditing(null) }}><Plus size={14} />Add Staff</button>
      </header>
      {error && editing === undefined ? <div className="manage-alert">{error}</div> : null}
      {data?.staff.length ? (
        <div className="platform-staff-table-wrap">
          <table className="platform-staff-table">
            <thead><tr><th>Name</th><th>Username / Email</th><th>Assigned Access</th><th>Status</th><th><span className="platform-sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.staff.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.fullName}</strong></td>
                  <td><span>{member.username}</span><small>{member.email || 'No email'}</small></td>
                  <td><div className="platform-access-tags">{member.allowedModules.map((module) => <span key={module}>{data.modules.find((item) => item.key === module)?.label || module}</span>)}</div></td>
                  <td><span className={`platform-status${member.isActive ? ' is-active' : ''}`}>{member.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="platform-row-actions">
                      <button type="button" onClick={() => { setError(''); setEditing(member) }}><Pencil size={13} />Edit Access</button>
                      <button type="button" onClick={() => void toggleActive(member)}>{member.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="platform-staff-empty"><UserRoundCog size={24} /><strong>No Platform Staff yet</strong><span>Create an account and assign only the modules it needs.</span></div>
      )}
      {editing !== undefined && data ? (
        <StaffForm member={editing} modules={data.modules} saving={saving} error={error} onClose={() => setEditing(undefined)} onSaved={(form) => void saveStaff(form, editing)} />
      ) : null}
    </section>
  )
}

function GeneralSettings() {
  return (
    <section className="manage-card platform-settings-placeholder">
      <ShieldCheck size={22} />
      <div><h2>General</h2><p>Platform-wide preferences can be added here when configuration requirements are defined.</p></div>
    </section>
  )
}

export function PlatformSettings() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [error, setError] = useState('')
  const section = sectionFromPath()

  useEffect(() => {
    let current = true
    apiFetch<SessionData>('/api/session/')
      .then((response) => {
        if (!response.authenticated) {
          window.location.assign('/platform/login/')
          return
        }
        if (current) setSession(response)
      })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : 'Settings could not be loaded.') })
    return () => { current = false }
  }, [])

  if (!session) return <div className="manage-state">{error || 'Loading settings…'}</div>
  const isSuperAdmin = session.platformAccess.isSuperAdmin
  const denied = section === 'staff-access' && !isSuperAdmin

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Platform administration"
      logo={brandLogo}
      nav={platformNavigation(session.platformAccess.allowedModules)}
      title="Settings"
      subtitle="Platform administration and access controls"
      userName={session.user.displayName}
      userRole={isSuperAdmin ? 'Super Admin' : 'Platform Staff'}
    >
      <div className="platform-settings-page">
        <SettingsTabs isSuperAdmin={isSuperAdmin} />
        {denied ? <div className="manage-alert">Only Super Admins can manage Platform Staff.</div> : section === 'staff-access' ? <StaffAccessPanel /> : <GeneralSettings />}
      </div>
    </ManageShell>
  )
}

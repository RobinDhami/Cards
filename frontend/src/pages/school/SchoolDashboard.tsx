import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Activity from 'lucide-react/dist/esm/icons/activity.js'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import IdCard from 'lucide-react/dist/esm/icons/id-card.js'
import KeyRound from 'lucide-react/dist/esm/icons/key-round.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Printer from 'lucide-react/dist/esm/icons/printer.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import School from 'lucide-react/dist/esm/icons/school.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import Upload from 'lucide-react/dist/esm/icons/upload.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import {
  Field,
  FileInput,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
} from '../../components/manage/FormControls'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, backendHref, displayError, jsonBody, queryString } from '../../lib/api'
import { schoolWorkspaceNav, withSchool } from './schoolWorkspaceNav'
import './SchoolDashboard.css'

type Choice = { value: string; label: string }

type SchoolSummary = {
  id: number
  name: string
  slogan: string
  address: string
  logo: string
  principalName: string
  principalSignature: string
  website: string
  email: string
  phone: string
  usernamePrefix: string
  effectiveUsernamePrefix: string
  themePrimary: string
  themeLightPrimary: string
  themeSecondary: string
  themeTernary: string
  description: string
  adminUsername: string
  stats?: { students: number; teachers: number; live: number }
}

type DashboardShellData = {
  active: string
  role: string
  isSuperAdmin: boolean
  currentSchool: SchoolSummary | null
  schools: Array<{ id: number; name: string }>
  user: { username: string; displayName: string }
}

type Member = {
  id: number
  name: string
  username: string
  phone: string
  email: string
  role: string
  memberType: string
  academicLevel: string
  academicLabel: string
  section: string
  rollNumber: string
  identifier: string
  photo: string
  isVisible: boolean
  views: number
  contacts: number
  downloads: number
  publicUrl: string
}

type ReportPayload = {
  memberCount: number
  studentCount: number
  liveProfileCount: number
  activeCardCount: number
  interactionCount: number
  profileViews: number
  contactActions: number
  vcardDownloads: number
  classRows: Array<{ key: string; label: string; total: number; percentage: number }>
  topProfiles: Array<Member & { interactions: number }>
  recentActivities: Array<{ id: number; student: string; type: string; action: string; createdAt: string }>
}

function selectedSchoolId() {
  return Number(new URLSearchParams(window.location.search).get('school') ?? 0)
}

function SchoolShell({
  shell,
  title,
  subtitle,
  actions,
  children,
}: {
  shell: DashboardShellData
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const school = shell.currentSchool
  return (
    <ManageShell
      brand={school?.name || 'Tap2Connect'}
      brandDetail={school ? 'School administration' : 'Platform administration'}
      logo={school?.logo || '/static/branding/tap2connect-logo-optimized.webp'}
      nav={schoolWorkspaceNav(school?.id, shell.isSuperAdmin)}
      title={title}
      subtitle={subtitle}
      userName={shell.user.displayName}
      userRole={shell.isSuperAdmin ? 'Platform administrator' : 'School administrator'}
      accent={school?.themePrimary || '#0b4bcb'}
      schoolOptions={shell.schools}
      selectedSchool={school?.id ?? null}
      onSchoolChange={(schoolId) => {
        window.location.href = withSchool(window.location.pathname, schoolId)
      }}
      actions={actions}
    >
      {children}
    </ManageShell>
  )
}

function LoadingSchool() {
  return <div className="manage-state">Loading school workspace…</div>
}

function SchoolMetric({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon: ReactNode
}) {
  return (
    <article className="school-metric manage-card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}

export function SchoolsPage() {
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [schools, setSchools] = useState<SchoolSummary[]>([])
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSchool, setNewSchool] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    adminUsername: '',
    adminPassword: '',
  })

  const load = () => apiFetch<{ shell: DashboardShellData; schools: SchoolSummary[] }>('/api/dashboard/schools/')
    .then((payload) => {
      setShell(payload.shell)
      setSchools(payload.schools)
    })
    .catch((reason) => setError(displayError(reason)))

  useEffect(() => {
    load()
    document.title = 'Schools | Tap2Connect'
  }, [])

  async function createSchool(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      await apiFetch('/api/dashboard/schools/', {
        method: 'POST',
        body: jsonBody(newSchool),
      })
      setCreateOpen(false)
      setNewSchool({ name: '', address: '', phone: '', email: '', adminUsername: '', adminPassword: '' })
      await load()
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setCreating(false)
    }
  }

  async function deleteSchool(school: SchoolSummary) {
    if (!window.confirm(`Delete ${school.name} and all linked profiles?`)) return
    try {
      await apiFetch(`/api/dashboard/schools/${school.id}/`, { method: 'DELETE' })
      setSchools((current) => current.filter((item) => item.id !== school.id))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!shell) return <LoadingSchool />

  return (
    <SchoolShell
      shell={shell}
      title="Schools"
      subtitle={`${schools.length} organizations on the platform`}
      actions={<button className="manage-button is-primary" type="button" onClick={() => setCreateOpen((current) => !current)}><Plus size={14} />Add school</button>}
    >
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      {createOpen ? (
        <form className="school-create-panel manage-card" onSubmit={createSchool}>
          <div><h2>Create school workspace</h2><p>Set the institution and its first administrator account.</p></div>
          <div className="form-grid is-three">
            <Field label="School name"><TextInput value={newSchool.name} onChange={(event) => setNewSchool((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="Address"><TextInput value={newSchool.address} onChange={(event) => setNewSchool((current) => ({ ...current, address: event.target.value }))} /></Field>
            <Field label="Phone"><TextInput value={newSchool.phone} onChange={(event) => setNewSchool((current) => ({ ...current, phone: event.target.value }))} /></Field>
            <Field label="Email"><TextInput type="email" value={newSchool.email} onChange={(event) => setNewSchool((current) => ({ ...current, email: event.target.value }))} /></Field>
            <Field label="Admin username"><TextInput value={newSchool.adminUsername} onChange={(event) => setNewSchool((current) => ({ ...current, adminUsername: event.target.value }))} required /></Field>
            <Field label="Admin password"><TextInput type="password" value={newSchool.adminPassword} onChange={(event) => setNewSchool((current) => ({ ...current, adminPassword: event.target.value }))} required /></Field>
          </div>
          <div><button className="manage-button" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create school'}</button></div>
        </form>
      ) : null}

      <section className="school-card-grid">
        {schools.map((school) => (
          <article className="school-summary-card manage-card" key={school.id}>
            <header>
              <span>{school.logo ? <img src={school.logo} alt="" /> : <School size={21} />}</span>
              <div><h2>{school.name}</h2><p>{school.address || 'Address not added'}</p></div>
              <button type="button" onClick={() => deleteSchool(school)} title="Delete school" aria-label="Delete school"><Trash2 size={14} /></button>
            </header>
            <div className="school-summary-stats">
              <span><strong>{school.stats?.students ?? 0}</strong>Students</span>
              <span><strong>{school.stats?.teachers ?? 0}</strong>Staff</span>
              <span><strong>{school.stats?.live ?? 0}</strong>Live IDs</span>
            </div>
            <footer>
              <span>{school.adminUsername ? `Admin: ${school.adminUsername}` : 'No admin assigned'}</span>
              <a className="manage-button" href={withSchool('/dashboard/students/', school.id)}>Open workspace</a>
              <a className="manage-button" href={withSchool('/dashboard/settings/', school.id)}><Settings size={13} />Settings</a>
            </footer>
          </article>
        ))}
      </section>
    </SchoolShell>
  )
}

function MemberCreatePanel({
  memberType,
  academicLevels,
  onCreated,
  onCancel,
}: {
  memberType: 'student' | 'teacher'
  academicLevels: Choice[]
  onCreated: (password: string) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    role: memberType === 'teacher' ? 'Teacher' : 'Student',
    roll_number: '',
    academic_level: '',
    section: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const schoolId = selectedSchoolId()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await apiFetch<{ generatedPassword: string }>(`/api/dashboard/members/${queryString({ school: schoolId })}`, {
        method: 'POST',
        body: jsonBody({ ...values, member_type: memberType, school: schoolId }),
      })
      onCreated(response.generatedPassword)
    } catch (reason) {
      setError(displayError(reason))
      setSaving(false)
    }
  }

  return (
    <form className="school-create-panel manage-card" onSubmit={submit}>
      <div><h2>Add {memberType === 'teacher' ? 'teacher or staff member' : 'student'}</h2><p>A username and secure starter password are generated automatically.</p></div>
      {error ? <div className="manage-alert">{error}</div> : null}
      <div className="form-grid is-three">
        <Field label="Full name"><TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required /></Field>
        <Field label="Phone"><TextInput value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} required /></Field>
        <Field label="Email"><TextInput type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} /></Field>
        <Field label="Role"><TextInput value={values.role} onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))} /></Field>
        <Field label="Roll / employee number"><TextInput value={values.roll_number} onChange={(event) => setValues((current) => ({ ...current, roll_number: event.target.value }))} /></Field>
        {memberType === 'student' ? (
          <Field label="Class / level">
            <SelectInput value={values.academic_level} onChange={(event) => setValues((current) => ({ ...current, academic_level: event.target.value }))}>
              <option value="">Select a class</option>
              {academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </SelectInput>
          </Field>
        ) : null}
        <Field label="Section"><TextInput value={values.section} onChange={(event) => setValues((current) => ({ ...current, section: event.target.value }))} /></Field>
      </div>
      <div><button className="manage-button" type="button" onClick={onCancel}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : `Add ${memberType}`}</button></div>
    </form>
  )
}

export function MembersPage({ memberType }: { memberType: 'student' | 'teacher' }) {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [filters, setFilters] = useState<{ sections: string[]; academicLevels: Choice[]; roles: string[] }>({ sections: [], academicLevels: [], roles: [] })
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('')
  const [academicLevel, setAcademicLevel] = useState('')
  const [role, setRole] = useState('')
  const [createOpen, setCreateOpen] = useState(new URLSearchParams(window.location.search).get('create') === '1')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const endpoint = useMemo(() => `/api/dashboard/members/${queryString({
    school: schoolId,
    type: memberType,
    q: query,
    section,
    academic_level: academicLevel,
    role,
  })}`, [schoolId, memberType, query, section, academicLevel, role])

  const load = useCallback(() => apiFetch<{
    shell: DashboardShellData
    members: Member[]
    filters: { sections: string[]; academicLevels: Choice[]; roles: string[] }
  }>(endpoint).then((payload) => {
    setShell(payload.shell)
    setMembers(payload.members)
    setFilters(payload.filters)
  }).catch((reason) => setError(displayError(reason))), [endpoint])

  useEffect(() => {
    load()
    document.title = `${memberType === 'teacher' ? 'Teachers & Staff' : 'Students'} | Tap2Connect`
  }, [load, memberType])

  async function remove(member: Member) {
    if (!window.confirm(`Delete ${member.name}?`)) return
    try {
      await apiFetch(`/api/manage/students/${member.id}/`, { method: 'DELETE' })
      setMembers((current) => current.filter((item) => item.id !== member.id))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!shell) return <LoadingSchool />
  const title = memberType === 'teacher' ? 'Teachers & Staff' : 'Students'

  return (
    <SchoolShell
      shell={shell}
      title={title}
      subtitle={`${members.length} matching records in ${shell.currentSchool?.name}`}
      actions={<button className="manage-button is-primary" type="button" onClick={() => setCreateOpen((current) => !current)}><Plus size={14} />Add {memberType}</button>}
    >
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      {message ? <div className="manage-alert is-success school-message">{message}</div> : null}
      {createOpen ? <MemberCreatePanel memberType={memberType} academicLevels={filters.academicLevels} onCancel={() => setCreateOpen(false)} onCreated={(password) => { setCreateOpen(false); setMessage(`Profile created. Starter password: ${password}`); load() }} /> : null}

      <section className="school-filter-bar manage-card">
        <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} /></label>
        {memberType === 'student' ? (
          <>
            <select value={academicLevel} onChange={(event) => setAcademicLevel(event.target.value)}><option value="">All classes</option>{filters.academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>
            <select value={section} onChange={(event) => setSection(event.target.value)}><option value="">All sections</option>{filters.sections.map((value) => <option value={value} key={value}>{value}</option>)}</select>
          </>
        ) : (
          <select value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{filters.roles.map((value) => <option value={value} key={value}>{value}</option>)}</select>
        )}
      </section>

      <section className="school-table-wrap manage-card">
        {members.length === 0 ? <div className="school-empty">No matching records.</div> : (
          <table className="school-table">
            <thead><tr><th>Member</th><th>{memberType === 'student' ? 'Class' : 'Role'}</th><th>Username</th><th>Card</th><th>Engagement</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><div className="school-member"><span>{member.photo ? <img src={member.photo} alt="" /> : <UserRound size={15} />}</span><strong>{member.name}<small>{member.phone || member.email}</small></strong></div></td>
                  <td>{memberType === 'student' ? [member.academicLabel, member.section].filter(Boolean).join(' · ') || 'Not set' : member.role}</td>
                  <td>{member.username}</td>
                  <td><span className={`school-status${member.isVisible ? ' is-live' : ''}`}>{member.isVisible ? 'Live' : 'Hidden'}</span></td>
                  <td>{member.views + member.contacts + member.downloads}</td>
                  <td><div className="school-row-actions"><a href={member.publicUrl} target="_blank" rel="noreferrer" title="View card"><Eye size={14} /></a><a href={`/student/edit/${member.id}`} title="Edit profile"><Edit3 size={14} /></a><a href={withSchool(`/dashboard/student/${member.id}/credentials/`, schoolId)} title="Credentials"><KeyRound size={14} /></a><button type="button" onClick={() => remove(member)} title="Delete"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SchoolShell>
  )
}

export function SchoolReportsPage() {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ shell: DashboardShellData; report: ReportPayload }>(`/api/dashboard/reports/${queryString({ school: schoolId })}`)
      .then((payload) => {
        setShell(payload.shell)
        setReport(payload.report)
      })
      .catch((reason) => setError(displayError(reason)))
  }, [schoolId])

  if (!shell || !report) return <div className="manage-state">{error || 'Loading reports…'}</div>

  return (
    <SchoolShell shell={shell} title="Reports" subtitle="Thirty-day school identity activity">
      <section className="school-report-metrics">
        <SchoolMetric label="Students" value={report.studentCount} icon={<GraduationCap size={17} />} />
        <SchoolMetric label="Live profiles" value={report.liveProfileCount} icon={<BadgeCheck size={17} />} />
        <SchoolMetric label="Active cards" value={report.activeCardCount} icon={<IdCard size={17} />} />
        <SchoolMetric label="Interactions" value={report.interactionCount} icon={<Activity size={17} />} />
      </section>
      <section className="school-report-grid">
        <article className="manage-card school-class-report">
          <header><h2>Students by class</h2><p>Current academic distribution</p></header>
          <div>
            {report.classRows.length === 0 ? <div className="school-empty">Assign academic levels to see this report.</div> : report.classRows.map((row) => (
              <span key={row.key}><strong>{row.label}</strong><i><b style={{ width: `${row.percentage}%` }} /></i><em>{row.total}</em></span>
            ))}
          </div>
        </article>
        <article className="manage-card school-activity-summary">
          <header><h2>Engagement mix</h2><p>Last 30 days</p></header>
          <div><span><Eye size={15} /><strong>{report.profileViews}<small>Profile views</small></strong></span><span><Phone size={15} /><strong>{report.contactActions}<small>Contact actions</small></strong></span><span><Download size={15} /><strong>{report.vcardDownloads}<small>vCard downloads</small></strong></span></div>
        </article>
        <article className="manage-card school-top-profiles">
          <header><h2>Top card users</h2><p>Highest tracked interaction</p></header>
          {report.topProfiles.map((member) => <a href={member.publicUrl} target="_blank" rel="noreferrer" key={member.id}><span>{member.photo ? <img src={member.photo} alt="" /> : <UserRound size={14} />}</span><strong>{member.name}<small>{member.academicLabel || member.role}</small></strong><em>{member.interactions}</em></a>)}
        </article>
        <article className="manage-card school-recent-activity">
          <header><h2>Recent activity</h2><p>Latest recorded actions</p></header>
          {report.recentActivities.map((item) => <div key={item.id}><span><Activity size={13} /></span><strong>{item.student}<small>{item.type} · {item.action || 'digital card'}</small></strong><time>{new Date(item.createdAt).toLocaleDateString()}</time></div>)}
        </article>
      </section>
    </SchoolShell>
  )
}

export function SchoolSettingsPage() {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [school, setSchool] = useState<SchoolSummary | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [logo, setLogo] = useState<File | null>(null)
  const [signature, setSignature] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ shell: DashboardShellData; school: SchoolSummary }>(`/api/dashboard/settings/${queryString({ school: schoolId })}`)
      .then((payload) => {
        setShell(payload.shell)
        setSchool(payload.school)
        setValues({
          name: payload.school.name,
          slogan: payload.school.slogan,
          address: payload.school.address,
          principalName: payload.school.principalName,
          website: payload.school.website,
          email: payload.school.email,
          phone: payload.school.phone,
          usernamePrefix: payload.school.usernamePrefix,
          themePrimary: payload.school.themePrimary,
          themeLightPrimary: payload.school.themeLightPrimary,
          themeSecondary: payload.school.themeSecondary,
          themeTernary: payload.school.themeTernary,
          description: payload.school.description,
          adminUsername: payload.school.adminUsername,
          adminPassword: '',
        })
      })
      .catch((reason) => setError(displayError(reason)))
  }, [schoolId])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!school) return
    setSaving(true)
    setError('')
    setSuccess('')
    const body = new FormData()
    Object.entries(values).forEach(([key, value]) => body.append(key, value))
    if (logo) body.append('logo', logo)
    if (signature) body.append('principal_signature', signature)
    try {
      const response = await apiFetch<{ school: SchoolSummary }>(`/api/dashboard/settings/${queryString({ school: school.id })}`, { method: 'POST', body })
      setSchool(response.school)
      setSuccess('School settings saved.')
      setValues((current) => ({ ...current, adminPassword: '' }))
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (!shell || !school) return <div className="manage-state">{error || 'Loading settings…'}</div>

  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
  return (
    <SchoolShell shell={shell} title="School Settings" subtitle={`Branding and identity defaults for ${school.name}`}>
      <form onSubmit={save}>
        {error ? <div className="manage-alert school-message">{error}</div> : null}
        {success ? <div className="manage-alert is-success school-message">{success}</div> : null}
        <FormSection title="School identity">
          <div className="form-grid">
            <Field label="School name"><TextInput value={values.name ?? ''} onChange={(event) => update('name', event.target.value)} required /></Field>
            <Field label="Slogan"><TextInput value={values.slogan ?? ''} onChange={(event) => update('slogan', event.target.value)} /></Field>
            <Field label="Address" wide><TextArea value={values.address ?? ''} onChange={(event) => update('address', event.target.value)} /></Field>
            <Field label="Principal name"><TextInput value={values.principalName ?? ''} onChange={(event) => update('principalName', event.target.value)} /></Field>
            <Field label="Website"><TextInput type="url" value={values.website ?? ''} onChange={(event) => update('website', event.target.value)} /></Field>
            <Field label="Email"><TextInput type="email" value={values.email ?? ''} onChange={(event) => update('email', event.target.value)} /></Field>
            <Field label="Phone"><TextInput value={values.phone ?? ''} onChange={(event) => update('phone', event.target.value)} /></Field>
            <Field label="Description" wide><TextArea value={values.description ?? ''} onChange={(event) => update('description', event.target.value)} /></Field>
          </div>
          <div className="professional-file-grid">
            <FileInput label="School logo" currentUrl={school.logo} accept="image/*" onChange={setLogo} />
            <FileInput label="Principal signature" currentUrl={school.principalSignature} accept="image/*" onChange={setSignature} />
          </div>
        </FormSection>
        <FormSection title="Card theme">
          <div className="form-grid is-three">
            {[
              ['themePrimary', 'Primary'],
              ['themeLightPrimary', 'Light surface'],
              ['themeSecondary', 'Secondary'],
              ['themeTernary', 'Accent'],
            ].map(([key, label]) => <Field label={label} key={key}><TextInput type="color" value={values[key] ?? '#000000'} onChange={(event) => update(key, event.target.value)} /></Field>)}
            <Field label="Student username prefix"><TextInput value={values.usernamePrefix ?? ''} onChange={(event) => update('usernamePrefix', event.target.value)} placeholder={school.effectiveUsernamePrefix} /></Field>
          </div>
        </FormSection>
        <FormSection title="Administrator login">
          <div className="form-grid">
            <Field label="Admin username"><TextInput value={values.adminUsername ?? ''} onChange={(event) => update('adminUsername', event.target.value)} /></Field>
            <Field label="New password" hint="Leave blank to keep the current password."><TextInput type="password" value={values.adminPassword ?? ''} onChange={(event) => update('adminPassword', event.target.value)} /></Field>
          </div>
        </FormSection>
        <div className="form-actions"><button className="manage-button is-primary" type="submit" disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </SchoolShell>
  )
}

export function BulkUploadPage() {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [memberType, setMemberType] = useState('student')
  const [summary, setSummary] = useState<{ createdCount: number; skippedRows: number[]; filename: string; credentials: Array<{ name: string; username: string; password: string }> } | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    apiFetch<{ shell: DashboardShellData }>(`/api/dashboard/members/${queryString({ school: schoolId, type: 'student' })}`)
      .then((payload) => setShell(payload.shell))
      .catch((reason) => setError(displayError(reason)))
  }, [schoolId])

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    body.append('role_type', memberType)
    body.append('school', String(schoolId))
    try {
      const response = await apiFetch<{ summary: NonNullable<typeof summary> }>(`/api/dashboard/bulk-upload/${queryString({ school: schoolId })}`, { method: 'POST', body })
      setSummary(response.summary)
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setUploading(false)
    }
  }

  if (!shell) return <LoadingSchool />
  return (
    <SchoolShell shell={shell} title="Bulk Upload" subtitle="Create student or staff profiles from CSV and Excel">
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      <section className="school-upload-grid">
        <form className="manage-card school-upload-panel" onSubmit={upload}>
          <span><FileSpreadsheet size={25} /></span>
          <h2>Upload member data</h2>
          <p>Required columns: <code>name</code> and <code>phone</code>. Optional columns include email, username, role, roll_number, academic_level, section, address, emergency contact, blood group, and gender.</p>
          <Field label="Profile type"><SelectInput value={memberType} onChange={(event) => setMemberType(event.target.value)}><option value="student">Students</option><option value="teacher">Teachers & staff</option></SelectInput></Field>
          <FileInput label="CSV or Excel file" accept=".csv,.xlsx,.xls" onChange={setFile} />
          <button className="manage-button is-primary" type="submit" disabled={!file || uploading}><Upload size={14} />{uploading ? 'Uploading…' : 'Run upload'}</button>
        </form>
        <article className="manage-card school-upload-results">
          <h2>Upload result</h2>
          {!summary ? <div className="school-empty">Run an upload to see validation and credential results.</div> : (
            <>
              <div><strong>{summary.createdCount}</strong><span>Profiles created from {summary.filename}</span></div>
              {summary.skippedRows.length > 0 ? <p>Skipped rows: {summary.skippedRows.join(', ')}</p> : null}
              <div className="school-credential-list">
                {summary.credentials.map((item) => <span key={`${item.username}-${item.name}`}><strong>{item.name}</strong><code>{item.username}</code><code>{item.password}</code></span>)}
              </div>
            </>
          )}
        </article>
      </section>
    </SchoolShell>
  )
}

export function StudentCredentialsPage() {
  const schoolId = selectedSchoolId()
  const studentId = Number(window.location.pathname.match(/student\/(\d+)\/credentials/)?.[1] ?? 0)
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [credentials, setCredentials] = useState<{ studentId: number; name: string; username: string; suggestedUsername: string; usernamePrefix: string } | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch<{ shell: DashboardShellData }>(`/api/dashboard/members/${queryString({ school: schoolId, type: 'student' })}`),
      apiFetch<{ credentials: NonNullable<typeof credentials> }>(`/api/dashboard/credentials/${studentId}/`),
    ]).then(([memberPayload, credentialPayload]) => {
      setShell(memberPayload.shell)
      setCredentials(credentialPayload.credentials)
      setUsername(credentialPayload.credentials.username)
    }).catch((reason) => setError(displayError(reason)))
  }, [schoolId, studentId])

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/api/dashboard/credentials/${studentId}/`, { method: 'POST', body: jsonBody({ username, newPassword: password }) })
      setPassword('')
      setSuccess('Login credentials updated.')
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!shell || !credentials) return <div className="manage-state">{error || 'Loading credentials…'}</div>
  return (
    <SchoolShell shell={shell} title="Student Credentials" subtitle={`Manage login access for ${credentials.name}`}>
      <form className="manage-card school-credentials-panel" onSubmit={save}>
        <span><KeyRound size={23} /></span>
        <h2>{credentials.name}</h2>
        <p>Username prefix: {credentials.usernamePrefix}. Suggested username: <code>{credentials.suggestedUsername}</code>.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        {success ? <div className="manage-alert is-success">{success}</div> : null}
        <Field label="Username"><TextInput value={username} onChange={(event) => setUsername(event.target.value)} required /></Field>
        <Field label="New password" hint="Leave blank to keep the current password. Minimum eight characters."><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <div><a className="manage-button" href={withSchool('/dashboard/students/', schoolId)}>Cancel</a><button className="manage-button is-primary" type="submit"><Save size={14} />Save credentials</button></div>
      </form>
    </SchoolShell>
  )
}

export function PrintControlsPage({ mode }: { mode: 'print' | 'qr' }) {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [frontDesigns, setFrontDesigns] = useState<Choice[]>([])
  const [backDesigns, setBackDesigns] = useState<Choice[]>([])
  const [orientations, setOrientations] = useState<Choice[]>([])
  const [cardTypes, setCardTypes] = useState<Choice[]>([])
  const [endpoints, setEndpoints] = useState({ preview: '', pdf: '', qrZip: '' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{
      shell: DashboardShellData
      members: Member[]
      frontDesigns: Choice[]
      backDesigns: Choice[]
      orientations: Choice[]
      cardTypes: Choice[]
      endpoints: { preview: string; pdf: string; qrZip: string }
    }>(`/api/dashboard/print-controls/${queryString({ school: schoolId })}`)
      .then((payload) => {
        setShell(payload.shell)
        setMembers(payload.members)
        setFrontDesigns(payload.frontDesigns)
        setBackDesigns(payload.backDesigns)
        setOrientations(payload.orientations)
        setCardTypes(payload.cardTypes)
        setEndpoints(payload.endpoints)
      })
      .catch((reason) => setError(displayError(reason)))
  }, [schoolId])

  if (!shell) return <div className="manage-state">{error || 'Loading card tools…'}</div>

  const toggle = (memberId: number) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(memberId)) next.delete(memberId)
    else next.add(memberId)
    return next
  })
  const title = mode === 'qr' ? 'QR & Data Export' : 'ID Card Studio'

  return (
    <SchoolShell shell={shell} title={title} subtitle={`${selected.size} of ${members.length} members selected`}>
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      <form className="school-print-layout" action={backendHref(mode === 'qr' ? endpoints.qrZip : endpoints.preview)} method="get" target="_blank">
        <input type="hidden" name="school" value={schoolId} />
        {selected.size > 0 ? [...selected].map((id) => <input key={id} type="hidden" name="selected_members" value={id} />) : null}
        <aside className="manage-card school-print-options">
          <h2>{mode === 'qr' ? 'Export options' : 'Card design'}</h2>
          {mode === 'print' ? (
            <>
              <Field label="Card type"><SelectInput name="card_type">{cardTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Orientation"><SelectInput name="orientation">{orientations.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Front design"><SelectInput name="front_design">{frontDesigns.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Back design"><SelectInput name="back_design">{backDesigns.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Custom label"><TextInput name="label" /></Field>
              <Field label="Valid until"><TextInput name="valid_till" /></Field>
            </>
          ) : (
            <p>Download member data and one QR PNG per selected digital card in a ZIP archive.</p>
          )}
          <button className="manage-button is-primary" type="submit" disabled={selected.size === 0}>{mode === 'qr' ? <Download size={14} /> : <Eye size={14} />}{mode === 'qr' ? 'Download QR ZIP' : 'Open preview'}</button>
          {mode === 'print' ? <button className="manage-button" type="submit" formAction={backendHref(endpoints.pdf)} disabled={selected.size === 0}><Printer size={14} />Export PDF</button> : null}
        </aside>
        <section className="manage-card school-print-members">
          <header><label><input type="checkbox" checked={selected.size === members.length && members.length > 0} onChange={(event) => setSelected(event.target.checked ? new Set(members.map((member) => member.id)) : new Set())} />Select all</label><span>{members.length} records</span></header>
          <div>
            {members.map((member) => (
              <label key={member.id}>
                <input type="checkbox" checked={selected.has(member.id)} onChange={() => toggle(member.id)} />
                <span>{member.photo ? <img src={member.photo} alt="" /> : <UserRound size={14} />}</span>
                <strong>{member.name}<small>{member.academicLabel || member.role} {member.section ? `· ${member.section}` : ''}</small></strong>
                <em>{member.identifier}</em>
              </label>
            ))}
          </div>
        </section>
      </form>
    </SchoolShell>
  )
}

export function SchoolDashboardRouter() {
  const path = window.location.pathname
  if (path.includes('/schools')) return <SchoolsPage />
  if (path.includes('/teachers')) return <MembersPage memberType="teacher" />
  if (path.includes('/students')) return <MembersPage memberType="student" />
  if (path.includes('/student/') && path.includes('/credentials')) return <StudentCredentialsPage />
  if (path.includes('/reports')) return <SchoolReportsPage />
  if (path.includes('/settings')) return <SchoolSettingsPage />
  if (path.includes('/bulk-upload')) return <BulkUploadPage />
  if (path.includes('/qr-export')) return <PrintControlsPage mode="qr" />
  if (path.includes('/print')) return <PrintControlsPage mode="print" />
  return null
}

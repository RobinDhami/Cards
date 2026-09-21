import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { brandLogo } from '../../lib/assets'
import Activity from 'lucide-react/dist/esm/icons/activity.js'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet.js'
import IdCard from 'lucide-react/dist/esm/icons/id-card.js'
import KeyRound from 'lucide-react/dist/esm/icons/key-round.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Printer from 'lucide-react/dist/esm/icons/printer.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
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
import { dashboardMetrics, moduleConfig } from './organizationModuleConfig'
import './SchoolDashboard.css'

type Choice = { value: string; label: string }

type SchoolSummary = {
  id: number
  name: string
  organizationCode: string
  organizationType: string
  module: { key: string; memberTypes: Choice[]; bulkColumns: string[] }
  slogan: string
  address: string
  logo: string
  coverPhoto: string
  principalName: string
  principalSignature: string
  website: string
  email: string
  phone: string
  mapUrl: string
  facebook: string
  instagram: string
  linkedin: string
  twitter: string
  clubDistrict: string
  charteredOn: string
  sponsoringClub: string
  usernamePrefix: string
  effectiveUsernamePrefix: string
  themePrimary: string
  themeLightPrimary: string
  themeSecondary: string
  themeTernary: string
  description: string
  adminUsername: string
  stats?: { members: number; students: number; teachers: number; staff: number; clubMembers: number; live: number }
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
  teacherCount: number
  staffCount: number
  executiveCount: number
  committeeCount: number
  generalMemberCount: number
  interactionCount: number
  profileViews: number
  contactActions: number
  vcardDownloads: number
  classRows: Array<{ key: string; label: string; total: number; percentage: number }>
  topProfiles: Array<Member & { interactions: number }>
  recentActivities: Array<{ id: number; student: string; type: string; action: string; createdAt: string }>
}

function selectedSchoolId() {
  const organizationMatch = window.location.pathname.match(/^\/dashboard\/organizations\/(\d+)/)
  if (organizationMatch) return Number(organizationMatch[1])
  return Number(new URLSearchParams(window.location.search).get('school') ?? 0)
}

function organizationWorkspaceHref(schoolId: number) {
  const moduleMatch = window.location.pathname.match(
    /^\/dashboard\/organizations\/\d+\/(members|bulk-upload|print|exports|reports|settings)(?:\/|$)/,
  )
  const moduleName = moduleMatch?.[1]
  return `/dashboard/organizations/${schoolId}/${moduleName ? `${moduleName}/` : ''}`
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
      brandDetail={school ? (shell.isSuperAdmin ? 'Super Admin · Organization workspace' : 'Organization administration') : 'Platform administration'}
      logo={school?.logo || brandLogo}
      nav={schoolWorkspaceNav(school?.id, shell.isSuperAdmin, school?.organizationType)}
      title={title}
      subtitle={subtitle}
      userName={shell.user.displayName}
      userRole={shell.isSuperAdmin ? 'Platform administrator' : 'Organization administrator'}
      accent={school?.themePrimary || '#0b4bcb'}
      schoolOptions={shell.isSuperAdmin && school ? shell.schools : undefined}
      selectedSchool={school?.id ?? null}
      onSchoolChange={(schoolId) => {
        window.location.href = organizationWorkspaceHref(schoolId)
      }}
      actions={(
        <>
          {shell.isSuperAdmin && school ? <span className="school-super-admin-context">Viewing as Super Admin</span> : null}
          {!shell.isSuperAdmin && school ? <span className="school-workspace-label">{school.name}</span> : null}
          {actions}
        </>
      )}
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
  const [organizationTypeCounts, setOrganizationTypeCounts] = useState<Record<string, number>>({})
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSchool, setNewSchool] = useState({
    name: '',
    organizationCode: '',
    organizationType: 'other',
    address: '',
    website: '',
    mapUrl: '',
    phone: '',
    email: '',
    adminUsername: '',
    adminPassword: '',
  })

  const load = () => apiFetch<{ shell: DashboardShellData; schools: SchoolSummary[]; organizationTypeCounts: Record<string, number> }>('/api/dashboard/schools/')
    .then((payload) => {
      setShell(payload.shell)
      setSchools(payload.schools)
      setOrganizationTypeCounts(payload.organizationTypeCounts)
    })
    .catch((reason) => setError(displayError(reason)))

  useEffect(() => {
    load()
    document.title = 'Organizations | Tap2Connect'
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
      setNewSchool({ name: '', organizationCode: '', organizationType: 'other', address: '', website: '', mapUrl: '', phone: '', email: '', adminUsername: '', adminPassword: '' })
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
  const filteredSchools = schools.filter((school) => (
    (typeFilter === 'all' || (school.organizationType || 'generic') === typeFilter)
    && `${school.name} ${school.address} ${school.adminUsername}`.toLowerCase().includes(search.trim().toLowerCase())
  ))
  const typeTabs = [
    ['all', 'All Organizations'], ['education', 'Education'], ['club', 'Clubs'], ['business', 'Business'], ['other', 'Other'], ['generic', 'Generic / Unclassified'],
  ] as const

  return (
    <SchoolShell
      shell={shell}
      title="Organizations"
      subtitle={`${filteredSchools.length} of ${schools.length} organizations on the platform`}
      actions={<button className="manage-button is-primary" type="button" onClick={() => setCreateOpen((current) => !current)}><Plus size={14} />Add organization</button>}
    >
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      <section className="school-organization-filters manage-card" aria-label="Organization filters">
        <div role="tablist" aria-label="Organization type">
          {typeTabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={typeFilter === value} className={typeFilter === value ? 'is-active' : ''} onClick={() => setTypeFilter(value)}>{label} <span>{organizationTypeCounts[value] ?? 0}</span></button>)}
        </div>
        <label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations" /></label>
      </section>
      {createOpen ? (
        <form className="school-create-panel manage-card" onSubmit={createSchool}>
          <div><h2>Create organization workspace</h2><p>Set the organization and its first administrator account.</p></div>
          <div className="form-grid is-three">
            <Field label="Organization name"><TextInput value={newSchool.name} onChange={(event) => setNewSchool((current) => ({ ...current, name: event.target.value }))} required /></Field>
            <Field label="Organization code" hint="Unique uppercase code, e.g. VIS"><TextInput value={newSchool.organizationCode} onChange={(event) => setNewSchool((current) => ({ ...current, organizationCode: event.target.value.toUpperCase() }))} maxLength={12} required /></Field>
            <Field label="Organization type"><SelectInput value={newSchool.organizationType} onChange={(event) => setNewSchool((current) => ({ ...current, organizationType: event.target.value }))}><option value="education">Education</option><option value="club">Club</option><option value="business">Business</option><option value="other">Other</option></SelectInput></Field>
            <Field label="Address"><TextInput value={newSchool.address} onChange={(event) => setNewSchool((current) => ({ ...current, address: event.target.value }))} /></Field>
            <Field label="Website"><TextInput type="url" value={newSchool.website} onChange={(event) => setNewSchool((current) => ({ ...current, website: event.target.value }))} /></Field>
            <Field label="Map link"><TextInput type="url" value={newSchool.mapUrl} onChange={(event) => setNewSchool((current) => ({ ...current, mapUrl: event.target.value }))} /></Field>
            <Field label="Phone"><TextInput value={newSchool.phone} onChange={(event) => setNewSchool((current) => ({ ...current, phone: event.target.value }))} /></Field>
            <Field label="Email"><TextInput type="email" value={newSchool.email} onChange={(event) => setNewSchool((current) => ({ ...current, email: event.target.value }))} /></Field>
            <Field label="Admin username"><TextInput value={newSchool.adminUsername} onChange={(event) => setNewSchool((current) => ({ ...current, adminUsername: event.target.value }))} required /></Field>
            <Field label="Admin password"><TextInput type="password" value={newSchool.adminPassword} onChange={(event) => setNewSchool((current) => ({ ...current, adminPassword: event.target.value }))} required /></Field>
          </div>
          <div><button className="manage-button" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create organization'}</button></div>
        </form>
      ) : null}

      <section className="school-card-grid">
        {filteredSchools.map((school) => (
          <article className="school-summary-card manage-card" key={school.id}>
            <header>
              <span>{school.logo ? <img src={school.logo} alt="" /> : <Building2 size={21} />}</span>
              <div><h2>{school.name}</h2><p>{school.address || 'Address not added'} · <strong>{school.organizationType === 'generic' ? 'Generic / Unclassified' : school.organizationType[0].toUpperCase() + school.organizationType.slice(1)}</strong>{school.organizationCode ? ` · ${school.organizationCode}` : ''}</p></div>
              <button type="button" onClick={() => deleteSchool(school)} title="Delete organization" aria-label="Delete organization"><Trash2 size={14} /></button>
            </header>
            <div className="school-summary-stats">
              <span><strong>{school.stats?.members ?? 0}</strong>Members</span>
              <span><strong>{school.organizationType === 'club' ? school.stats?.clubMembers ?? 0 : school.stats?.students ?? 0}</strong>{school.organizationType === 'club' ? 'General' : 'Students'}</span>
              <span><strong>{school.stats?.live ?? 0}</strong>Live IDs</span>
            </div>
            <footer>
              <span>{school.adminUsername ? `Admin: ${school.adminUsername}` : 'No admin assigned'}</span>
              <a className="manage-button" href={`/dashboard/organizations/${school.id}/`}>Open workspace</a>
              <a className="manage-button" href={`/dashboard/organizations/${school.id}/settings/`}><Settings size={13} />Edit organization</a>
            </footer>
          </article>
        ))}
      </section>
    </SchoolShell>
  )
}

export function OrganizationWorkspaceOverview() {
  const schoolId = selectedSchoolId()
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [report, setReport] = useState<ReportPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<{ shell: DashboardShellData; report: ReportPayload }>(`/api/dashboard/reports/${queryString({ school: schoolId })}`)
      .then((payload) => {
        setShell(payload.shell)
        setReport(payload.report)
        document.title = `${payload.shell.currentSchool?.name || 'Organization'} Workspace | Tap2Connect`
      })
      .catch((reason) => setError(displayError(reason)))
  }, [schoolId])

  if (!shell || !report) return error ? <div className="manage-state">{error}</div> : <LoadingSchool />
  const organization = shell.currentSchool
  const metrics = dashboardMetrics(organization?.organizationType)
  const workspaceRoot = `/dashboard/organizations/${schoolId}`

  return (
    <SchoolShell
      shell={shell}
      title="Overview"
      subtitle={`${shell.isSuperAdmin ? 'Super Admin workspace' : 'Organization administration'} for ${organization?.name}`}
    >
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      <section className="manage-card school-organization-context">
        <span><Building2 size={24} aria-hidden="true" /></span>
        <div>
          <h2>{organization?.name}</h2>
          <p>{organization?.address || 'No address has been added.'}</p>
        </div>
        {shell.isSuperAdmin ? <a className="manage-button" href="/dashboard/schools/">Back to Organizations</a> : null}
      </section>

      <section className="school-report-metrics">
        {metrics.map(([key, label]) => <SchoolMetric key={key} label={label} value={report[key as keyof ReportPayload] as number} icon={key === 'activeCardCount' ? <IdCard size={17} /> : key === 'liveProfileCount' ? <BadgeCheck size={17} /> : <UserRound size={17} />} />)}
      </section>

      <section className="manage-card school-workspace-actions">
        <div><h2>Manage this organization</h2><p>These actions stay scoped to {organization?.name} while you remain signed in.</p></div>
        <div>
          <a className="manage-button is-primary" href={`${workspaceRoot}/members/`}><UserRound size={14} />Members</a>
          <a className="manage-button" href={`${workspaceRoot}/bulk-upload/`}><Upload size={14} />Bulk Upload</a>
          <a className="manage-button" href={`${workspaceRoot}/settings/`}><Settings size={14} />Organization Settings</a>
        </div>
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
  memberType: string
  academicLevels: Choice[]
  onCreated: (password: string) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState({
    name: '',
    phone: '',
    email: '',
    role: memberType === 'teacher' ? 'Teacher' : memberType === 'staff' ? 'Staff' : memberType === 'member' ? 'General Member' : 'Student',
    roll_number: '',
    identifier: '',
    academic_level: '',
    section: '',
    academic_year: '', faculty_program: '', department: '', committee: '', membership_term: '', join_date: '',
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
      <div><h2>Add {memberType}</h2><p>A username and secure starter password are generated automatically.</p></div>
      {error ? <div className="manage-alert">{error}</div> : null}
      <div className="form-grid is-three">
        <Field label="Full name"><TextInput value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} required /></Field>
        <Field label="Phone"><TextInput value={values.phone} onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))} required /></Field>
        <Field label="Email"><TextInput type="email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} /></Field>
        {memberType !== 'student' ? <Field label={memberType === 'member' ? 'Role / position' : 'Designation'}><TextInput value={values.role} list={memberType === 'member' ? 'club-role-suggestions' : undefined} onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))} /></Field> : null}
        {memberType === 'member' ? <datalist id="club-role-suggestions">{['President', 'Vice President', 'Secretary', 'Treasurer', 'Board Member', 'Committee Member', 'General Member', 'Past President'].map((role) => <option key={role} value={role} />)}</datalist> : null}
        {memberType === 'student' ? <><Field label="Roll number"><TextInput value={values.roll_number} onChange={(event) => setValues((current) => ({ ...current, roll_number: event.target.value }))} /></Field><Field label="Student ID (optional)"><TextInput value={values.identifier} onChange={(event) => setValues((current) => ({ ...current, identifier: event.target.value }))} /></Field></> : null}
        {memberType === 'teacher' || memberType === 'staff' ? <Field label="Employee ID (optional)"><TextInput value={values.identifier} onChange={(event) => setValues((current) => ({ ...current, identifier: event.target.value }))} /></Field> : null}
        {memberType === 'member' ? <Field label="Membership ID (optional)"><TextInput value={values.identifier} onChange={(event) => setValues((current) => ({ ...current, identifier: event.target.value }))} /></Field> : null}
        {memberType === 'student' ? (
          <Field label="Class / level">
            <SelectInput value={values.academic_level} onChange={(event) => setValues((current) => ({ ...current, academic_level: event.target.value }))}>
              <option value="">Select a class</option>
              {academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </SelectInput>
          </Field>
        ) : null}
        {memberType === 'student' ? <><Field label="Section"><TextInput value={values.section} onChange={(event) => setValues((current) => ({ ...current, section: event.target.value }))} /></Field><Field label="Academic year"><TextInput value={values.academic_year} onChange={(event) => setValues((current) => ({ ...current, academic_year: event.target.value }))} /></Field><Field label="Faculty / program"><TextInput value={values.faculty_program} onChange={(event) => setValues((current) => ({ ...current, faculty_program: event.target.value }))} /></Field></> : null}
        {memberType === 'teacher' || memberType === 'staff' ? <Field label="Department"><TextInput value={values.department} onChange={(event) => setValues((current) => ({ ...current, department: event.target.value }))} /></Field> : null}
        {memberType === 'member' ? <><Field label="Committee"><TextInput value={values.committee} onChange={(event) => setValues((current) => ({ ...current, committee: event.target.value }))} /></Field><Field label="Membership term"><TextInput value={values.membership_term} onChange={(event) => setValues((current) => ({ ...current, membership_term: event.target.value }))} /></Field><Field label="Join date"><TextInput type="date" value={values.join_date} onChange={(event) => setValues((current) => ({ ...current, join_date: event.target.value }))} /></Field></> : null}
      </div>
      <div><button className="manage-button" type="button" onClick={onCancel}>Cancel</button><button className="manage-button is-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : `Add ${memberType}`}</button></div>
    </form>
  )
}

export function MembersPage({ memberType }: { memberType: string }) {
  const schoolId = selectedSchoolId()
  const isAllMembers = memberType === 'all'
  const [shell, setShell] = useState<DashboardShellData | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [filters, setFilters] = useState<{ sections: string[]; academicLevels: Choice[]; roles: string[] }>({ sections: [], academicLevels: [], roles: [] })
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('')
  const [academicLevel, setAcademicLevel] = useState('')
  const [role, setRole] = useState('')
  const [category, setCategory] = useState(() => new URLSearchParams(window.location.search).get('category') || 'all')
  const [group, setGroup] = useState(() => new URLSearchParams(window.location.search).get('group') || '')
  const [createType, setCreateType] = useState<string | null>(() => (
    new URLSearchParams(window.location.search).get('create') === '1'
      ? (memberType === 'teacher' ? 'teacher' : 'student')
      : null
  ))
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const endpoint = useMemo(() => `/api/dashboard/members/${queryString({
    school: schoolId,
    type: isAllMembers ? category : memberType,
    q: query,
    section,
    academic_level: academicLevel,
    role,
    group,
  })}`, [schoolId, memberType, category, isAllMembers, query, section, academicLevel, role, group])

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
    document.title = `${isAllMembers ? 'Members' : (memberType === 'teacher' ? 'Teachers & Staff' : 'Students')} | Tap2Connect`
  }, [isAllMembers, load, memberType])

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
  const config = moduleConfig(shell.currentSchool?.organizationType)
  const title = isAllMembers ? 'Members' : (memberType === 'teacher' ? 'Teachers & Staff' : 'Students')
  const workspaceRoot = isAllMembers ? `/dashboard/organizations/${schoolId}` : ''
  const createActions = isAllMembers ? (
    <>
      {config.memberTypes.map((choice, index) => <button className={`manage-button${index === 0 ? ' is-primary' : ''}`} type="button" onClick={() => setCreateType(choice.value)} key={choice.value}><Plus size={14} />Add {choice.label.slice(0, -1)}</button>)}
    </>
  ) : (
    <button className="manage-button is-primary" type="button" onClick={() => setCreateType(memberType)}><Plus size={14} />Add {memberType}</button>
  )

  return (
    <SchoolShell
      shell={shell}
      title={title}
      subtitle={`${members.length} member records in ${shell.currentSchool?.name}`}
      actions={createActions}
    >
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      {message ? <div className="manage-alert is-success school-message">{message}</div> : null}
      {createType ? <MemberCreatePanel memberType={createType} academicLevels={filters.academicLevels} onCancel={() => setCreateType(null)} onCreated={(password) => { setCreateType(null); setMessage(`Profile created. Starter password: ${password}`); load() }} /> : null}

      <section className="school-filter-bar manage-card">
        <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} /></label>
        {isAllMembers ? <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All members</option>{config.memberTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select> : null}
        {'filters' in config && config.filters ? <select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All club members</option>{config.filters.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select> : null}
        {memberType === 'student' ? (
          <>
            <select value={academicLevel} onChange={(event) => setAcademicLevel(event.target.value)}><option value="">All classes</option>{filters.academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>
            <select value={section} onChange={(event) => setSection(event.target.value)}><option value="">All sections</option>{filters.sections.map((value) => <option value={value} key={value}>{value}</option>)}</select>
          </>
        ) : memberType === 'teacher' ? (
          <select value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{filters.roles.map((value) => <option value={value} key={value}>{value}</option>)}</select>
        ) : null}
      </section>

      <section className="school-table-wrap manage-card">
        {members.length === 0 ? <div className="school-empty">No matching records.</div> : (
          <table className="school-table">
            <thead><tr><th>Member</th><th>{isAllMembers ? 'Type / Role' : (memberType === 'student' ? 'Class' : 'Role')}</th><th>Username</th><th>Card</th><th>Engagement</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><div className="school-member"><span>{member.photo ? <img src={member.photo} alt="" /> : <UserRound size={15} />}</span><strong>{member.name}<small>{member.phone || member.email}</small></strong></div></td>
                  <td>{member.memberType === 'student' ? [member.academicLabel, member.section].filter(Boolean).join(' · ') || 'Student' : member.role}</td>
                  <td>{member.username}</td>
                  <td><span className={`school-status${member.isVisible ? ' is-live' : ''}`}>{member.isVisible ? 'Live' : 'Hidden'}</span></td>
                  <td>{member.views + member.contacts + member.downloads}</td>
                  <td><div className="school-row-actions"><a href={member.publicUrl} target="_blank" rel="noreferrer" title="View card"><Eye size={14} /></a><a href={`/student/edit/${member.id}`} title="Edit profile"><Edit3 size={14} /></a><a href={isAllMembers ? `${workspaceRoot}/members/${member.id}/credentials/` : withSchool(`/dashboard/student/${member.id}/credentials/`, schoolId)} title="Credentials"><KeyRound size={14} /></a><button type="button" onClick={() => remove(member)} title="Delete"><Trash2 size={14} /></button></div></td>
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
    <SchoolShell shell={shell} title="Reports" subtitle="Thirty-day organization member activity">
      <section className="school-report-metrics">
        <SchoolMetric label="Members" value={report.memberCount} icon={<UserRound size={17} />} />
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
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
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
          organizationCode: payload.school.organizationCode,
          organizationType: payload.school.organizationType === 'generic' ? 'other' : payload.school.organizationType,
          slogan: payload.school.slogan,
          address: payload.school.address,
          principalName: payload.school.principalName,
          website: payload.school.website,
          email: payload.school.email,
          phone: payload.school.phone,
          mapUrl: payload.school.mapUrl,
          facebook: payload.school.facebook,
          instagram: payload.school.instagram,
          linkedin: payload.school.linkedin,
          twitter: payload.school.twitter,
          clubDistrict: payload.school.clubDistrict,
          charteredOn: payload.school.charteredOn,
          sponsoringClub: payload.school.sponsoringClub,
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
    if (coverPhoto) body.append('cover_photo', coverPhoto)
    if (signature) body.append('principal_signature', signature)
    try {
      const response = await apiFetch<{ school: SchoolSummary }>(`/api/dashboard/settings/${queryString({ school: school.id })}`, { method: 'POST', body })
      setSchool(response.school)
      setSuccess('Settings saved.')
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
    <SchoolShell shell={shell} title="Settings" subtitle={`Branding and identity defaults for ${school.name}`}>
      <form onSubmit={save}>
        {error ? <div className="manage-alert school-message">{error}</div> : null}
        {success ? <div className="manage-alert is-success school-message">{success}</div> : null}
        <FormSection title="Organization identity">
          <div className="form-grid">
            <Field label="Organization name"><TextInput value={values.name ?? ''} onChange={(event) => update('name', event.target.value)} required /></Field>
            <Field label="Organization code" hint="Unique uppercase code; changing it does not rewrite member usernames."><TextInput value={values.organizationCode ?? ''} onChange={(event) => update('organizationCode', event.target.value.toUpperCase())} maxLength={12} /></Field>
            <Field label="Organization type"><SelectInput value={values.organizationType ?? 'other'} onChange={(event) => update('organizationType', event.target.value)}><option value="education">Education</option><option value="club">Club</option><option value="business">Business</option><option value="other">Other</option></SelectInput></Field>
            <Field label="Slogan"><TextInput value={values.slogan ?? ''} onChange={(event) => update('slogan', event.target.value)} /></Field>
            <Field label="Address" wide><TextArea value={values.address ?? ''} onChange={(event) => update('address', event.target.value)} /></Field>
            <Field label={shell.isSuperAdmin ? 'Primary contact name' : 'Principal name'}><TextInput value={values.principalName ?? ''} onChange={(event) => update('principalName', event.target.value)} /></Field>
            <Field label="Website"><TextInput type="url" value={values.website ?? ''} onChange={(event) => update('website', event.target.value)} /></Field>
            <Field label="Email"><TextInput type="email" value={values.email ?? ''} onChange={(event) => update('email', event.target.value)} /></Field>
            <Field label="Phone"><TextInput value={values.phone ?? ''} onChange={(event) => update('phone', event.target.value)} /></Field>
            <Field label="Description" wide><TextArea value={values.description ?? ''} onChange={(event) => update('description', event.target.value)} /></Field>
          </div>
          <div className="professional-file-grid">
            <FileInput label="Organization logo" currentUrl={school.logo} accept="image/*" onChange={setLogo} />
            {values.organizationType === 'club' ? <FileInput label="Club cover image" currentUrl={school.coverPhoto} accept="image/*" onChange={setCoverPhoto} /> : null}
            <FileInput label={shell.isSuperAdmin ? 'Authorized signature' : 'Principal signature'} currentUrl={school.principalSignature} accept="image/*" onChange={setSignature} />
          </div>
        </FormSection>
        {values.organizationType === 'club' ? <>
          <FormSection title="Club profile">
            <div className="form-grid">
              <Field label="District"><TextInput value={values.clubDistrict ?? ''} onChange={(event) => update('clubDistrict', event.target.value)} /></Field>
              <Field label="Chartered on"><TextInput type="date" value={values.charteredOn ?? ''} onChange={(event) => update('charteredOn', event.target.value)} /></Field>
              <Field label="Sponsoring club"><TextInput value={values.sponsoringClub ?? ''} onChange={(event) => update('sponsoringClub', event.target.value)} /></Field>
              <Field label="Map link" wide><TextInput type="url" value={values.mapUrl ?? ''} onChange={(event) => update('mapUrl', event.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="Club social links">
            <div className="form-grid is-three">
              <Field label="Instagram"><TextInput type="url" value={values.instagram ?? ''} onChange={(event) => update('instagram', event.target.value)} /></Field>
              <Field label="LinkedIn"><TextInput type="url" value={values.linkedin ?? ''} onChange={(event) => update('linkedin', event.target.value)} /></Field>
              <Field label="Facebook"><TextInput type="url" value={values.facebook ?? ''} onChange={(event) => update('facebook', event.target.value)} /></Field>
              <Field label="X"><TextInput type="url" value={values.twitter ?? ''} onChange={(event) => update('twitter', event.target.value)} /></Field>
            </div>
          </FormSection>
        </> : null}
        <FormSection title="Card theme">
          <div className="form-grid is-three">
            {[
              ['themePrimary', 'Primary'],
              ['themeLightPrimary', 'Light surface'],
              ['themeSecondary', 'Secondary'],
              ['themeTernary', 'Accent'],
            ].map(([key, label]) => <Field label={label} key={key}><TextInput type="color" value={values[key] ?? '#000000'} onChange={(event) => update(key, event.target.value)} /></Field>)}
            <Field label="Member username prefix"><TextInput value={values.usernamePrefix ?? ''} onChange={(event) => update('usernamePrefix', event.target.value)} placeholder={school.effectiveUsernamePrefix} /></Field>
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
  const [memberType, setMemberType] = useState('')
  const [summary, setSummary] = useState<{ createdCount: number; skippedRows: number[]; filename: string; credentials: Array<{ name: string; username: string; password: string }> } | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    apiFetch<{ shell: DashboardShellData }>(`/api/dashboard/members/${queryString({ school: schoolId, type: 'all' })}`)
      .then((payload) => {
        setShell(payload.shell)
        const firstType = payload.shell.currentSchool?.module.memberTypes[0]?.value || 'student'
        setMemberType((current) => current || firstType)
      })
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
  const config = moduleConfig(shell.currentSchool?.organizationType)
  return (
    <SchoolShell shell={shell} title="Bulk Upload" subtitle={shell.isSuperAdmin ? `Import member data into ${shell.currentSchool?.name}` : 'Create member profiles from CSV and Excel'}>
      {error ? <div className="manage-alert school-message">{error}</div> : null}
      <section className="school-upload-grid">
        <form className="manage-card school-upload-panel" onSubmit={upload}>
          <span><FileSpreadsheet size={25} /></span>
          <h2>Upload member data</h2>
          <p>Required columns: <code>name</code> and <code>phone</code>. {config.bulkHint}</p>
          <Field label="Member category"><SelectInput value={memberType} onChange={(event) => setMemberType(event.target.value)}>{config.memberTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
          <FileInput label="CSV or Excel file" accept=".csv,.xlsx,.xls" onChange={setFile} />
          <div className="form-actions"><a className="manage-button" href={`/api/dashboard/bulk-upload/template/${queryString({ school: schoolId })}`} download><Download size={14} />Download Import Template</a><button className="manage-button is-primary" type="submit" disabled={!file || uploading}><Upload size={14} />{uploading ? 'Uploading…' : 'Run upload'}</button></div>
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
  const organizationWorkspace = window.location.pathname.startsWith(`/dashboard/organizations/${schoolId}/`)
  const studentId = Number(window.location.pathname.match(/(?:student|members)\/(\d+)\/credentials/)?.[1] ?? 0)
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
    <SchoolShell shell={shell} title="Member Credentials" subtitle={`Manage login access for this member: ${credentials.name}`}>
      <form className="manage-card school-credentials-panel" onSubmit={save}>
        <span><KeyRound size={23} /></span>
        <h2>{credentials.name}</h2>
        <p>Member username prefix: {credentials.usernamePrefix}. Suggested username: <code>{credentials.suggestedUsername}</code>.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        {success ? <div className="manage-alert is-success">{success}</div> : null}
        <Field label="Member username"><TextInput value={username} onChange={(event) => setUsername(event.target.value)} required /></Field>
        <Field label="Temporary password" hint="Leave blank to keep the current password. Minimum eight characters."><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        <div><a className="manage-button" href={organizationWorkspace ? `/dashboard/organizations/${schoolId}/members/` : withSchool('/dashboard/students/', schoolId)}>Cancel</a><button className="manage-button is-primary" type="submit"><Save size={14} />Save credentials</button></div>
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
  const title = mode === 'qr' ? 'QR & Export' : 'Print Studio'

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
  if (/^\/dashboard\/organizations\/\d+\/?$/.test(path)) return <OrganizationWorkspaceOverview />
  if (/^\/dashboard\/organizations\/\d+\/members\/?$/.test(path)) return <MembersPage memberType="all" />
  if (/^\/dashboard\/organizations\/\d+\/members\/\d+\/credentials\/?$/.test(path)) return <StudentCredentialsPage />
  if (/^\/dashboard\/organizations\/\d+\/bulk-upload\/?$/.test(path)) return <BulkUploadPage />
  if (/^\/dashboard\/organizations\/\d+\/print\/?$/.test(path)) return <PrintControlsPage mode="print" />
  if (/^\/dashboard\/organizations\/\d+\/exports\/?$/.test(path)) return <PrintControlsPage mode="qr" />
  if (/^\/dashboard\/organizations\/\d+\/reports\/?$/.test(path)) return <SchoolReportsPage />
  if (/^\/dashboard\/organizations\/\d+\/settings\/?$/.test(path)) return <SchoolSettingsPage />
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

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Activity from 'lucide-react/dist/esm/icons/activity.mjs'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.mjs'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.mjs'
import Download from 'lucide-react/dist/esm/icons/download.mjs'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import FileText from 'lucide-react/dist/esm/icons/file-text.mjs'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.mjs'
import Mail from 'lucide-react/dist/esm/icons/mail.mjs'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.mjs'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.mjs'
import Phone from 'lucide-react/dist/esm/icons/phone.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import Save from 'lucide-react/dist/esm/icons/save.mjs'
import Share2 from 'lucide-react/dist/esm/icons/share-2.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import UserRound from 'lucide-react/dist/esm/icons/user-round.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import {
  Field,
  FileInput,
  FormSection,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
} from '../../components/manage/FormControls'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, backendHref, displayError, jsonBody } from '../../lib/api'
import './StudentWorkspace.css'

type Choice = { value: string | number; label: string; description?: string; palette?: string[] }

type StudentOptions = {
  colleges: Choice[]
  profileCategories: Choice[]
  memberTypes: Choice[]
  academicLevels: Choice[]
  genders: Choice[]
  schoolRoles: Choice[]
  socials: Choice[]
  printCardTypes: Choice[]
  printOrientations: Choice[]
  frontDesigns: Choice[]
  backDesigns: Choice[]
}

type StudentManageProfile = {
  id: number
  fields: Record<string, string | boolean | number | null>
  collegeId: number | null
  collegeName: string
  uniqueIdentifier: string
  profilePhoto: string
  coverPhoto: string
  cv: string
  birthCertificate: string
  skills: string[]
  canManageSchoolFields: boolean
  completion: number
  publicUrl: string
  options: StudentOptions
}

type PublicStudent = {
  id: number
  name: string
  email: string
  phone: string
  school: {
    name: string
    website: string
    websiteUrl: string
    phone: string
    address: string
    logo: string
  }
  profilePhoto: string
  coverPhoto: string
  memberType: string
  gradeLabel: string
  section: string
  gradeSection: string
  identifier: string
  identifierLabel: string
  role: string
  organization: string
  address: string
  guardianLabel: string
  guardianName: string
  emergencyPhone: string
  bloodGroup: string
  additionalInfoHeading: string
  additionalInfoDescription: string
  intro: string
  featured: string
  current: string
  skills: string[]
  socials: Array<{ key: string; url: string; label: string }>
  actions: {
    phone: string
    whatsapp: string
    map: string
    website: string
    vcard: string
    qr: string
    edit: string
    birthCertificate: string
  }
  canViewPrivateDetails: boolean
  publicUrl: string
}

type OwnerDashboard = {
  profile: StudentManageProfile
  organization: string
  stats: {
    views: number
    downloads: number
    contacts: number
    totalEngagement: number
    completion: number
    isVisible: boolean
  }
  daily: Array<{ day: string; view: number; download: number; contact: number }>
  recent: Array<{ id: number; type: string; action: string; createdAt: string }>
}

function studentIdFromPath() {
  return Number(window.location.pathname.match(/student(?:\/edit)?\/(\d+)/)?.[1] ?? 0)
}

function socialMonogram(key: string) {
  const labels: Record<string, string> = {
    linkedin: 'in',
    instagram: 'ig',
    facebook: 'f',
    messenger: 'm',
    twitter: 'x',
    youtube: '▶',
    tiktok: 'tt',
    github: 'gh',
    figma: 'fi',
    upwork: 'up',
    website: 'www',
  }
  return labels[key] ?? key.slice(0, 2)
}

function CardAction({
  href,
  label,
  icon,
  className = '',
}: {
  href: string
  label: string
  icon: ReactNode
  className?: string
}) {
  if (!href) return null
  return (
      <a className={`student-card-action ${className}`} href={backendHref(href)}>
      <span>{icon}</span>
      {label}
    </a>
  )
}

export function PublicStudentCard() {
  const studentId = studentIdFromPath()
  const [profile, setProfile] = useState<PublicStudent | null>(null)
  const [error, setError] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let current = true
    apiFetch<{ profile: PublicStudent }>(`/api/students/${studentId}/`)
      .then((payload) => {
        if (!current) return
        setProfile(payload.profile)
        document.title = `${payload.profile.name} | Tap2Connect Digital ID`
      })
      .catch((reason) => {
        if (current) setError(displayError(reason))
      })
    return () => {
      current = false
    }
  }, [studentId])

  async function shareProfile() {
    if (!profile) return
    try {
      if (navigator.share) {
        await navigator.share({ title: profile.name, url: profile.publicUrl })
      } else {
        await navigator.clipboard.writeText(profile.publicUrl)
        setToast('Profile link copied.')
      }
    } catch {
      setToast('Sharing was cancelled.')
    }
  }

  if (error) return <div className="student-public-state"><div className="manage-alert">{error}</div></div>
  if (!profile) return <div className="student-public-state">Loading digital ID…</div>

  return (
    <main className="student-public-page">
      {toast ? <button className="student-toast" type="button" onClick={() => setToast('')}>{toast}</button> : null}
      <article className="student-digital-card">
        <div className="student-card-body">
          <header className="student-school-header">
            <div className="student-school-brand">
              <span>
                {profile.school.logo ? <img src={profile.school.logo} alt="" /> : <GraduationCap size={20} />}
              </span>
              <div>
                <strong>{profile.school.name || profile.organization}</strong>
                <small>Tap2Connect verified digital identity</small>
              </div>
            </div>
            <div className="student-card-top-actions">
              <button type="button" onClick={shareProfile} aria-label="Share profile" title="Share profile"><Share2 size={16} /></button>
              <a href={backendHref(profile.actions.qr)} target="_blank" rel="noreferrer" aria-label="Open QR code" title="Open QR code"><QrCode size={16} /></a>
            </div>
          </header>

          <section className="student-card-hero">
            <div className="student-card-cover">
              {profile.coverPhoto ? <img src={profile.coverPhoto} alt="" /> : null}
              {profile.identifier ? (
                <span className="student-card-id">
                  <small>{profile.identifierLabel}</small>
                  <strong>{profile.identifier}</strong>
                </span>
              ) : null}
            </div>
            <span className="student-card-photo">
              {profile.profilePhoto ? <img src={profile.profilePhoto} alt={profile.name} /> : profile.name.slice(0, 1)}
            </span>
          </section>

          <section className="student-card-identity">
            <div className="student-name-row">
              <h1>{profile.name}</h1>
              <BadgeCheck size={18} aria-label="Verified identity" />
            </div>
            <p>{profile.role} · {profile.organization}</p>
            {profile.address ? <span className="student-location"><MapPin size={12} />{profile.address}</span> : null}
          </section>

          <div className="student-card-actions">
            <CardAction href={profile.actions.phone} label="Call" icon={<Phone size={17} />} />
            <CardAction href={profile.actions.whatsapp} label="WhatsApp" icon={<MessageCircle size={17} />} className="is-whatsapp" />
            <CardAction href={profile.email ? `mailto:${profile.email}` : ''} label="Email" icon={<Mail size={17} />} />
            <CardAction href={profile.actions.map} label="Map" icon={<MapPin size={17} />} />
          </div>

          {profile.intro ? <blockquote className="student-card-quote"><span>“</span>{profile.intro}</blockquote> : null}

          {profile.current || profile.featured ? (
            <section className="student-card-section">
              <h2>{profile.memberType.toLowerCase().includes('teacher') ? 'About & Availability' : 'About & Current Focus'}</h2>
              <div className="student-focus-list">
                {profile.current ? <div><strong>Current focus</strong><p>{profile.current}</p></div> : null}
                {profile.featured ? <div><strong>Featured</strong><p>{profile.featured}</p></div> : null}
              </div>
            </section>
          ) : null}

          {profile.skills.length > 0 ? (
            <section className="student-card-section">
              <h2>Skills & Interests</h2>
              <div className="student-skill-row">
                {profile.skills.map((skill) => <span key={skill}>{skill}</span>)}
              </div>
            </section>
          ) : null}

          {profile.socials.length > 0 ? (
            <section className="student-card-section">
              <h2>Find me online</h2>
              <div className="student-social-row">
                {profile.socials.map((social) => (
                  <a href={backendHref(social.url)} key={social.key} title={social.label} aria-label={social.label}>
                    {socialMonogram(social.key)}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="student-card-section student-documents">
            <h2>Documents</h2>
            <div>
              <a href={backendHref(profile.actions.vcard)}>
                <span><FileText size={17} /></span>
                <strong>Save contact<small>Download vCard</small></strong>
                <Download size={15} />
              </a>
              {profile.actions.birthCertificate ? (
                <a href={backendHref(profile.actions.birthCertificate)}>
                  <span><ShieldCheck size={17} /></span>
                  <strong>Identity document<small>Authorized access</small></strong>
                  <Eye size={15} />
                </a>
              ) : null}
            </div>
          </section>

          <button className="student-details-button" type="button" onClick={() => setDetailsOpen(true)}>
            <span><UserRound size={17} /></span>
            <strong>View complete details<small>School, identity, and contact information</small></strong>
            <Eye size={15} />
          </button>

          <button className="student-connect-preview" type="button" onClick={() => setToast('Friend connections will be available soon.')}>
            <span><Users size={22} /></span>
            <strong>Let’s Connect<small>Tap to preview · connect with friends soon</small></strong>
            <Share2 size={17} />
          </button>
        </div>

        <footer className="student-card-footer">
          <span><ShieldCheck size={12} />Verified identity</span>
          <span>{profile.school.name || profile.organization}</span>
          <span>Powered by <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect" /></span>
        </footer>
      </article>

      <div className={`student-details-overlay${detailsOpen ? ' is-open' : ''}`} onClick={() => setDetailsOpen(false)} />
      <aside className={`student-details-drawer${detailsOpen ? ' is-open' : ''}`}>
        <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Close details"><X size={17} /></button>
        <h2>Complete details</h2>
        <dl>
          <div><dt>Role</dt><dd>{profile.role}</dd></div>
          <div><dt>Organization</dt><dd>{profile.organization}</dd></div>
          <div><dt>Class / level</dt><dd>{profile.gradeSection || 'Not provided'}</dd></div>
          <div><dt>{profile.identifierLabel}</dt><dd>{profile.identifier || 'Not provided'}</dd></div>
          {profile.bloodGroup ? <div><dt>Blood group</dt><dd>{profile.bloodGroup}</dd></div> : null}
          {profile.guardianName ? <div><dt>{profile.guardianLabel}</dt><dd>{profile.guardianName}</dd></div> : null}
          {profile.additionalInfoHeading ? <div><dt>{profile.additionalInfoHeading}</dt><dd>{profile.additionalInfoDescription}</dd></div> : null}
        </dl>
        <a className="manage-button is-primary" href={`/student/${profile.id}/login/`}><Edit3 size={14} />Manage profile</a>
      </aside>
    </main>
  )
}

function ownerNav(studentId: number, publicUrl = '') {
  return [
    { label: 'Overview', href: `/student/${studentId}/manage/`, icon: LayoutDashboard, active: window.location.pathname.includes('/manage') },
    { label: 'Edit profile', href: `/student/edit/${studentId}`, icon: Edit3, active: window.location.pathname.includes('/student/edit/') },
    { label: 'Public card', href: publicUrl || `/student/${studentId}/contact-card/`, icon: Eye },
  ]
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <article className="student-owner-metric manage-card">
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}

export function StudentOwnerDashboard() {
  const studentId = studentIdFromPath()
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const load = useCallback(() => apiFetch<{ dashboard: OwnerDashboard }>(`/api/manage/students/${studentId}/dashboard/`)
    .then((payload) => setDashboard(payload.dashboard))
    .catch((reason) => setError(displayError(reason))), [studentId])

  useEffect(() => {
    load()
    document.title = 'Profile dashboard | Tap2Connect'
  }, [load])

  async function action(payload: Record<string, string>) {
    setError('')
    setMessage('')
    try {
      const response = await apiFetch<{ dashboard: OwnerDashboard }>(`/api/manage/students/${studentId}/dashboard/`, {
        method: 'POST',
        body: jsonBody(payload),
      })
      setDashboard(response.dashboard)
      setMessage('Profile settings updated.')
      setPasswordOpen(false)
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  if (!dashboard) return <div className="manage-state">{error || 'Loading profile dashboard…'}</div>

  return (
    <ManageShell
      brand={dashboard.organization}
      brandDetail="Digital identity"
      logo={dashboard.profile.profilePhoto}
      nav={ownerNav(studentId, dashboard.profile.publicUrl)}
      title={`Hello, ${String(dashboard.profile.fields.name).split(' ')[0]}`}
      subtitle={`${dashboard.stats.completion}% profile completion`}
      userName={String(dashboard.profile.fields.name)}
      userRole="Profile owner"
      accent="#3154d7"
      actions={<a className="manage-button" href={dashboard.profile.publicUrl} target="_blank" rel="noreferrer"><Eye size={14} />View card</a>}
    >
      {error ? <div className="manage-alert student-owner-message">{error}</div> : null}
      {message ? <div className="manage-alert is-success student-owner-message">{message}</div> : null}
      <section className="student-owner-summary manage-card">
        <div>
          <span>{dashboard.profile.profilePhoto ? <img src={dashboard.profile.profilePhoto} alt="" /> : <UserRound size={23} />}</span>
          <div>
            <h2>{String(dashboard.profile.fields.name)}</h2>
            <p>{String(dashboard.profile.fields.role)} · {dashboard.organization}</p>
          </div>
        </div>
        <Toggle
          label={dashboard.stats.isVisible ? 'Public card visible' : 'Public card hidden'}
          checked={dashboard.stats.isVisible}
          onChange={() => action({ action: 'toggle_contact_card' })}
        />
      </section>

      <section className="student-owner-metrics">
        <Metric label="Profile views" value={dashboard.stats.views} icon={<Eye size={18} />} />
        <Metric label="Contact actions" value={dashboard.stats.contacts} icon={<Phone size={18} />} />
        <Metric label="vCard downloads" value={dashboard.stats.downloads} icon={<Download size={18} />} />
        <Metric label="Total engagement" value={dashboard.stats.totalEngagement} icon={<Activity size={18} />} />
      </section>

      <section className="student-owner-grid">
        <article className="manage-card student-owner-chart">
          <div><h2>Last 7 days</h2><p>Views, contact actions, and downloads</p></div>
          <div className="student-bars">
            {dashboard.daily.map((day) => {
              const total = day.view + day.contact + day.download
              const maximum = Math.max(...dashboard.daily.map((item) => item.view + item.contact + item.download), 1)
              return (
                <span key={day.day}>
                  <i style={{ height: `${Math.max(6, (total / maximum) * 100)}%` }} title={`${total} interactions`} />
                  <small>{new Date(day.day).toLocaleDateString('en', { weekday: 'short' })}</small>
                </span>
              )
            })}
          </div>
        </article>
        <article className="manage-card student-owner-activity">
          <div><h2>Recent activity</h2><p>Latest events on your card</p></div>
          {dashboard.recent.length === 0 ? <p className="student-no-activity">Activity appears after the card is opened.</p> : dashboard.recent.map((item) => (
            <div key={item.id}>
              <span><Activity size={13} /></span>
              <strong>{item.type}<small>{item.action || 'Digital card'}</small></strong>
              <time>{new Date(item.createdAt).toLocaleDateString()}</time>
            </div>
          ))}
        </article>
      </section>

      <section className="student-owner-tools manage-card">
        <div>
          <h2>Profile tools</h2>
          <p>Keep your identity current and secure.</p>
        </div>
        <a className="manage-button is-primary" href={`/student/edit/${studentId}`}><Edit3 size={14} />Edit profile</a>
        <button className="manage-button" type="button" onClick={() => setPasswordOpen((current) => !current)}><ShieldCheck size={14} />Change password</button>
        <a className="manage-button" href={dashboard.profile.publicUrl}><QrCode size={14} />Open card</a>
      </section>

      {passwordOpen ? (
        <form
          className="student-password-panel manage-card"
          onSubmit={(event) => {
            event.preventDefault()
            action({ action: 'change_password', ...passwords })
          }}
        >
          <h2>Change password</h2>
          <div className="form-grid is-three">
            <Field label="Current password"><TextInput type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} required /></Field>
            <Field label="New password"><TextInput type="password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} required /></Field>
            <Field label="Confirm password"><TextInput type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} required /></Field>
          </div>
          <button className="manage-button is-primary" type="submit">Update password</button>
        </form>
      ) : null}
    </ManageShell>
  )
}

const basicFields = [
  ['name', 'Full name'],
  ['username', 'Username'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['organization_name', 'Organization name'],
  ['role', 'Role'],
  ['address', 'Address'],
] as const

const socialFields = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['twitter', 'X / Twitter'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
  ['github', 'GitHub'],
  ['figma', 'Figma'],
  ['upwork', 'Upwork'],
  ['website', 'Website'],
  ['messenger', 'Messenger'],
  ['whatsapp', 'WhatsApp'],
] as const

export function StudentEditor() {
  const studentId = studentIdFromPath()
  const [profile, setProfile] = useState<StudentManageProfile | null>(null)
  const [fields, setFields] = useState<Record<string, string | boolean | number | null>>({})
  const [skills, setSkills] = useState('')
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch<{ profile: StudentManageProfile }>(`/api/manage/students/${studentId}/`)
      .then((payload) => {
        setProfile(payload.profile)
        setFields(payload.profile.fields)
        setSkills(payload.profile.skills.join(', '))
        document.title = `Edit ${payload.profile.fields.name} | Tap2Connect`
      })
      .catch((reason) => setError(displayError(reason)))
  }, [studentId])

  function update(key: string, value: string | boolean) {
    setFields((current) => ({ ...current, [key]: value }))
    setSuccess('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    setSaving(true)
    setError('')
    setSuccess('')
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => body.append(key, value === null ? '' : String(value)))
    body.append('college', String(profile.collegeId ?? ''))
    body.append('skills', JSON.stringify(skills.split(',').map((item) => item.trim()).filter(Boolean)))
    Object.entries(files).forEach(([key, file]) => {
      if (file) body.append(key, file)
    })
    try {
      const response = await apiFetch<{ profile: StudentManageProfile }>(`/api/manage/students/${studentId}/`, {
        method: 'POST',
        body,
      })
      setProfile(response.profile)
      setFields(response.profile.fields)
      setSkills(response.profile.skills.join(', '))
      setFiles({})
      setSuccess('Profile saved successfully.')
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div className="manage-state">{error || 'Loading profile editor…'}</div>

  return (
    <ManageShell
      brand={profile.collegeName || String(fields.organization_name) || 'Tap2Connect'}
      brandDetail="Digital identity"
      logo={profile.profilePhoto}
      nav={ownerNav(studentId, profile.publicUrl)}
      title="Edit Digital Profile"
      subtitle={`${profile.completion}% complete · ${profile.uniqueIdentifier}`}
      userName={String(fields.name)}
      userRole={profile.canManageSchoolFields ? 'School administrator' : 'Profile owner'}
      accent="#3154d7"
      actions={<a className="manage-button" href={profile.publicUrl} target="_blank" rel="noreferrer"><Eye size={14} />Preview</a>}
    >
      <form onSubmit={save}>
        {error ? <div className="manage-alert student-owner-message">{error}</div> : null}
        {success ? <div className="manage-alert is-success student-owner-message">{success}</div> : null}

        <FormSection title="Profile identity" description="Main identity and contact details shown on the digital card.">
          <div className="form-grid">
            {basicFields.map(([key, label]) => (
              <Field label={label} key={key} wide={key === 'address'}>
                {key === 'address' ? (
                  <TextArea value={String(fields[key] ?? '')} onChange={(event) => update(key, event.target.value)} />
                ) : (
                  <TextInput type={key === 'email' ? 'email' : 'text'} value={String(fields[key] ?? '')} onChange={(event) => update(key, event.target.value)} />
                )}
              </Field>
            ))}
          </div>
          <div className="professional-file-grid">
            <FileInput label="Profile photo" currentUrl={profile.profilePhoto} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, profile_photo: file }))} />
            <FileInput label="Cover photo" currentUrl={profile.coverPhoto} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, cover_photo: file }))} />
          </div>
        </FormSection>

        {profile.canManageSchoolFields ? (
          <FormSection title="School identity" description="School-managed academic and member details.">
            <div className="form-grid is-three">
              <Field label="Profile category"><SelectInput value={String(fields.profile_category ?? '')} onChange={(event) => update('profile_category', event.target.value)}>{profile.options.profileCategories.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Member type"><SelectInput value={String(fields.member_type ?? '')} onChange={(event) => update('member_type', event.target.value)}>{profile.options.memberTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Academic level"><SelectInput value={String(fields.academic_level ?? '')} onChange={(event) => update('academic_level', event.target.value)}><option value="">Not set</option>{profile.options.academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
              <Field label="Section"><TextInput value={String(fields.section ?? '')} onChange={(event) => update('section', event.target.value)} /></Field>
              <Field label="Roll number"><TextInput value={String(fields.roll_number ?? '')} onChange={(event) => update('roll_number', event.target.value)} /></Field>
              <Field label="Gender"><SelectInput value={String(fields.gender ?? '')} onChange={(event) => update('gender', event.target.value)}><option value="">Not set</option>{profile.options.genders.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
            </div>
          </FormSection>
        ) : null}

        <FormSection title="About and focus">
          <div className="form-grid">
            <Field label="Short introduction" wide><TextArea value={String(fields.about_intro ?? fields.bio ?? '')} onChange={(event) => update('about_intro', event.target.value)} /></Field>
            <Field label="Featured interest" wide><TextArea value={String(fields.about_featured ?? '')} onChange={(event) => update('about_featured', event.target.value)} /></Field>
            <Field label="Current focus" wide><TextArea value={String(fields.about_current ?? '')} onChange={(event) => update('about_current', event.target.value)} /></Field>
            <Field label="Skills" hint="Separate skills with commas" wide><TextInput value={skills} onChange={(event) => setSkills(event.target.value)} /></Field>
          </div>
        </FormSection>

        <FormSection title="Private and additional details">
          <div className="form-grid">
            <Field label="Emergency contact name"><TextInput value={String(fields.emergency_contact_name ?? '')} onChange={(event) => update('emergency_contact_name', event.target.value)} /></Field>
            <Field label="Emergency contact phone"><TextInput value={String(fields.emergency_contact_phone ?? '')} onChange={(event) => update('emergency_contact_phone', event.target.value)} /></Field>
            <Field label="Blood group"><TextInput value={String(fields.blood_group ?? '')} onChange={(event) => update('blood_group', event.target.value)} /></Field>
            <Field label="Map URL"><TextInput type="url" value={String(fields.map_url ?? '')} onChange={(event) => update('map_url', event.target.value)} /></Field>
            <Field label="Additional information heading"><TextInput value={String(fields.additional_info_heading ?? '')} onChange={(event) => update('additional_info_heading', event.target.value)} /></Field>
            <Field label="Additional information" wide><TextArea value={String(fields.additional_info_description ?? '')} onChange={(event) => update('additional_info_description', event.target.value)} /></Field>
          </div>
          <div className="professional-file-grid">
            <FileInput label="CV / resume" currentUrl={profile.cv} onChange={(file) => setFiles((current) => ({ ...current, cv: file }))} />
            <FileInput label="Birth certificate" currentUrl={profile.birthCertificate} onChange={(file) => setFiles((current) => ({ ...current, birth_certificate: file }))} />
          </div>
        </FormSection>

        <FormSection title="Social links">
          <div className="form-grid">
            {socialFields.map(([key, label]) => (
              <Field label={label} key={key}>
                <TextInput value={String(fields[key] ?? '')} onChange={(event) => update(key, event.target.value)} />
              </Field>
            ))}
          </div>
        </FormSection>

        <FormSection title="Card visibility and print defaults">
          <div className="form-grid is-three">
            <Toggle label="Public card visible" checked={Boolean(fields.show_contact_card)} onChange={(checked) => update('show_contact_card', checked)} />
            <Field label="Card type"><SelectInput value={String(fields.print_card_type ?? '')} onChange={(event) => update('print_card_type', event.target.value)}>{profile.options.printCardTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
            <Field label="Orientation"><SelectInput value={String(fields.print_orientation ?? '')} onChange={(event) => update('print_orientation', event.target.value)}>{profile.options.printOrientations.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
            <Field label="Front design"><SelectInput value={String(fields.print_front_design ?? '')} onChange={(event) => update('print_front_design', event.target.value)}>{profile.options.frontDesigns.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
            <Field label="Back design"><SelectInput value={String(fields.print_back_design ?? '')} onChange={(event) => update('print_back_design', event.target.value)}>{profile.options.backDesigns.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
            <Field label="Valid until"><TextInput value={String(fields.print_valid_till ?? '')} onChange={(event) => update('print_valid_till', event.target.value)} /></Field>
            <Field label="Custom note" wide><TextArea value={String(fields.print_custom_note ?? '')} onChange={(event) => update('print_custom_note', event.target.value)} /></Field>
          </div>
        </FormSection>

        <div className="form-actions">
          <a className="manage-button" href={`/student/${studentId}/manage/`}>Cancel</a>
          <button className="manage-button is-primary" type="submit" disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
    </ManageShell>
  )
}

export function StudentEditLogin() {
  const studentId = studentIdFromPath()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await apiFetch<{ redirectPath: string }>(`/api/students/${studentId}/edit-login/`, {
        method: 'POST',
        body: jsonBody({ username, password }),
      })
      window.location.href = response.redirectPath
    } catch (reason) {
      setError(displayError(reason))
      setSubmitting(false)
    }
  }

  return (
    <main className="student-login-page">
      <form className="student-login-card" onSubmit={submit}>
        <a href={`/student/${studentId}/contact-card/`}><ArrowLeft size={14} />Back to card</a>
        <span><ShieldCheck size={23} /></span>
        <h1>Manage digital profile</h1>
        <p>Use the profile username and password provided by your organization.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        <Field label="Username"><TextInput value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></Field>
        <Field label="Password"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></Field>
        <button className="manage-button is-primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

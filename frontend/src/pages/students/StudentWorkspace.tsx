import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Activity from 'lucide-react/dist/esm/icons/activity.js'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import BookOpen from 'lucide-react/dist/esm/icons/book-open.js'
import Camera from 'lucide-react/dist/esm/icons/camera.js'
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Edit3 from 'lucide-react/dist/esm/icons/edit-3.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import FileBadge from 'lucide-react/dist/esm/icons/file-badge.js'
import ImageIcon from 'lucide-react/dist/esm/icons/image.js'
import ImagePlus from 'lucide-react/dist/esm/icons/image-plus.js'
import Info from 'lucide-react/dist/esm/icons/info.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import Share2 from 'lucide-react/dist/esm/icons/share-2.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import UploadIcon from 'lucide-react/dist/esm/icons/upload.js'
import User from 'lucide-react/dist/esm/icons/user.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
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
import { Feedback } from '../../design-system/Feedback'
import { DigitalContactCard } from '../../features/digital-card/DigitalContactCard'
import { fetchPublicStudent } from '../../features/digital-card/api'
import type { PublicStudent } from '../../features/digital-card/types'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
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
  return Number(window.location.pathname.match(/(?:student(?:\/edit)?|dashboard\/edit)\/(\d+)/)?.[1] ?? 0)
}

export function PublicStudentCard() {
  const studentId = studentIdFromPath()
  const [profile, setProfile] = useState<PublicStudent | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    fetchPublicStudent(studentId)
      .then((student) => {
        if (!current) return
        setProfile(student)
        document.title = `${student.name} | Tap2Connect Digital ID`
      })
      .catch((reason) => {
        if (current) setError(displayError(reason))
      })
    return () => {
      current = false
    }
  }, [studentId])

  if (error) return <Feedback title="Digital identity unavailable" message={error} />
  if (!profile) return <Feedback loading message="Loading digital identity…" />

  return <DigitalContactCard profile={profile} />
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

function fieldString(fields: Record<string, string | boolean | number | null>, key: string) {
  return String(fields[key] ?? '')
}

function fileNameFromUrl(url: string) {
  if (!url) return ''
  const name = url.split('?')[0].split('/').filter(Boolean).pop() ?? ''
  return name.replaceAll('%20', ' ')
}

function EditSection({
  icon,
  title,
  description,
  children,
  delay,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
  delay: number
}) {
  return (
    <section className="student-edit-section" style={{ animationDelay: `${delay}s` }}>
      <header className="student-edit-section-head">
        <span>{icon}</span>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function EditField({
  label,
  children,
  wide,
  help,
}: {
  label: string
  children: ReactNode
  wide?: boolean
  help?: string
}) {
  return (
    <label className={`student-edit-field${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {help ? <small>{help}</small> : null}
    </label>
  )
}

function UploadZone({
  label,
  icon,
  currentUrl,
  file,
  emptyText,
  onPick,
}: {
  label: string
  icon: ReactNode
  currentUrl?: string
  file?: File | null
  emptyText: string
  onPick: () => void
}) {
  return (
    <div>
      <span className="student-edit-upload-label">{label}</span>
      <button className={`student-edit-upload${currentUrl || file ? ' has-file' : ''}`} type="button" onClick={onPick}>
        {icon}
        <span>{file?.name || fileNameFromUrl(currentUrl || '') || emptyText}</span>
      </button>
    </div>
  )
}

export function StudentEditor() {
  const studentId = studentIdFromPath()
  const [profile, setProfile] = useState<StudentManageProfile | null>(null)
  const [fields, setFields] = useState<Record<string, string | boolean | number | null>>({})
  const [skills, setSkills] = useState('')
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

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

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => () => {
    Object.values(previews).forEach((url) => URL.revokeObjectURL(url))
  }, [previews])

  function update(key: string, value: string | boolean) {
    setFields((current) => ({ ...current, [key]: value }))
    setSuccess('')
  }

  function updateFile(key: string, file: File | null) {
    setFiles((current) => ({ ...current, [key]: file }))
    if (!file) return
    setPreviews((current) => {
      if (current[key]) URL.revokeObjectURL(current[key])
      return { ...current, [key]: URL.createObjectURL(file) }
    })
    setSuccess('')
  }

  function toggleSocial(value: string, checked: boolean) {
    const selected = new Set(fieldString(fields, 'social_stack').split(',').map((item) => item.trim()).filter(Boolean))
    if (checked) selected.add(value)
    else selected.delete(value)
    update('social_stack', Array.from(selected).join(','))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    setSaving(true)
    setError('')
    setSuccess('')
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => body.append(key, value === null ? '' : String(value)))
    body.set('college', String(fields.college ?? profile.collegeId ?? ''))
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
      setPreviews((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url))
        return {}
      })
      setSuccess('Profile saved successfully.')
      setToast('Student data saved successfully!')
    } catch (reason) {
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div className="manage-state">{error || 'Loading profile editor...'}</div>

  const selectedSocials = new Set(fieldString(fields, 'social_stack').split(',').map((item) => item.trim()).filter(Boolean))
  const profilePhoto = previews.profile_photo || profile.profilePhoto
  const coverPhoto = previews.cover_photo || profile.coverPhoto
  const profileInputId = `student-profile-photo-${studentId}`
  const coverInputId = `student-cover-photo-${studentId}`
  const birthInputId = `student-birth-certificate-${studentId}`

  return (
    <main className="student-edit-page">
      <header className="student-edit-hero">
        <div>
          <a href={profile.publicUrl}><ArrowLeft size={15} aria-hidden="true" />Back to card</a>
          <h1>Edit Student Profile</h1>
          <p>Update digital identity, contact details, and public card settings.</p>
        </div>
      </header>

      <form className="student-edit-form" onSubmit={save}>
        {error ? <div className="manage-alert student-owner-message">{error}</div> : null}
        {success ? <div className="manage-alert is-success student-owner-message">{success}</div> : null}

        <section className="student-edit-preview">
          <button className="student-edit-cover" type="button" onClick={() => document.getElementById(coverInputId)?.click()}>
            {coverPhoto ? <img src={coverPhoto} alt={`${fieldString(fields, 'name')} cover photo`} /> : null}
            <span><ImagePlus size={16} aria-hidden="true" />Change cover</span>
          </button>
          <div className="student-edit-avatar-row">
            <button className="student-edit-avatar" type="button" onClick={() => document.getElementById(profileInputId)?.click()}>
              {profilePhoto ? <img src={profilePhoto} alt={`${fieldString(fields, 'name')} profile photo`} /> : <span>{fieldString(fields, 'name').slice(0, 1).toUpperCase() || 'S'}</span>}
            </button>
            <button className="student-edit-avatar-action" type="button" aria-label="Change profile photo" onClick={() => document.getElementById(profileInputId)?.click()}>
              <Camera size={16} aria-hidden="true" />
            </button>
            <div>
              <h2>{fieldString(fields, 'name')}</h2>
              <p>{fieldString(fields, 'role') || fieldString(fields, 'member_type')} - {fieldString(fields, 'organization_name') || profile.collegeName}</p>
            </div>
          </div>
          <input id={profileInputId} type="file" accept="image/*" hidden onChange={(event) => updateFile('profile_photo', event.target.files?.[0] ?? null)} />
          <input id={coverInputId} type="file" accept="image/*" hidden onChange={(event) => updateFile('cover_photo', event.target.files?.[0] ?? null)} />
        </section>

        <EditSection icon={<User size={16} />} title="Profile Basics" delay={0.4}>
          <div className="student-edit-grid is-two">
            <EditField label="Full Name"><input className="student-edit-input" name="name" value={fieldString(fields, 'name')} placeholder="Full name" onChange={(event) => update('name', event.target.value)} /></EditField>
            <EditField label="Username"><input className="student-edit-input" name="username" value={fieldString(fields, 'username')} placeholder="Username" onChange={(event) => update('username', event.target.value)} /></EditField>
            <EditField label="IEMIS No."><input className="student-edit-input" value={profile.uniqueIdentifier} readOnly /></EditField>
            {profile.canManageSchoolFields ? (
              <EditField label="Member Type">
                <select className="student-edit-input" value={fieldString(fields, 'member_type')} onChange={(event) => update('member_type', event.target.value)}>
                  {profile.options.memberTypes.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </EditField>
            ) : null}
            <EditField label="Role"><input className="student-edit-input" name="role" value={fieldString(fields, 'role')} placeholder="Role" onChange={(event) => update('role', event.target.value)} /></EditField>
            {profile.canManageSchoolFields ? (
              <EditField label="School / College">
                <select className="student-edit-input" value={String(fields.college ?? profile.collegeId ?? '')} onChange={(event) => update('college', event.target.value)}>
                  <option value="">Choose a registered school</option>
                  {profile.options.colleges.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </EditField>
            ) : null}
            <EditField label="Organization / Brand Name" wide><input className="student-edit-input" name="organization_name" value={fieldString(fields, 'organization_name')} placeholder="Organization" onChange={(event) => update('organization_name', event.target.value)} /></EditField>
          </div>
        </EditSection>

        <EditSection icon={<BookOpen size={16} />} title="Academic Data" delay={0.5}>
          <div className="student-edit-grid is-three">
            <EditField label="Class / Grade">
              <select className="student-edit-input" name="academic_level" value={fieldString(fields, 'academic_level')} onChange={(event) => update('academic_level', event.target.value)}>
                <option value="">Select class / grade</option>
                {profile.options.academicLevels.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </EditField>
            <EditField label="Section"><input className="student-edit-input" name="section" value={fieldString(fields, 'section')} placeholder="Section" onChange={(event) => update('section', event.target.value)} /></EditField>
            <EditField label="Roll Number"><input className="student-edit-input" name="roll_number" value={fieldString(fields, 'roll_number')} placeholder="Roll #" onChange={(event) => update('roll_number', event.target.value)} /></EditField>
            <EditField label="Gender">
              <select className="student-edit-input" name="gender" value={fieldString(fields, 'gender')} onChange={(event) => update('gender', event.target.value)}>
                <option value="">Not set</option>
                {profile.options.genders.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </EditField>
            <EditField label="Blood Group"><input className="student-edit-input" name="blood_group" value={fieldString(fields, 'blood_group')} placeholder="Blood group" onChange={(event) => update('blood_group', event.target.value)} /></EditField>
          </div>
        </EditSection>

        <EditSection icon={<Phone size={16} />} title="Contact" delay={0.6}>
          <div className="student-edit-grid is-two">
            <EditField label="Email"><input className="student-edit-input" type="email" name="email" value={fieldString(fields, 'email')} placeholder="Email" onChange={(event) => update('email', event.target.value)} /></EditField>
            <EditField label="Phone"><input className="student-edit-input" type="tel" name="phone" value={fieldString(fields, 'phone')} placeholder="Phone" onChange={(event) => update('phone', event.target.value)} /></EditField>
            <EditField label="Address" wide><input className="student-edit-input" name="address" value={fieldString(fields, 'address')} placeholder="Full address" onChange={(event) => update('address', event.target.value)} /></EditField>
            <EditField label="Emergency Contact Name"><input className="student-edit-input" name="emergency_contact_name" value={fieldString(fields, 'emergency_contact_name')} placeholder="Name" onChange={(event) => update('emergency_contact_name', event.target.value)} /></EditField>
            <EditField label="Emergency Contact Phone"><input className="student-edit-input" type="tel" name="emergency_contact_phone" value={fieldString(fields, 'emergency_contact_phone')} placeholder="Phone" onChange={(event) => update('emergency_contact_phone', event.target.value)} /></EditField>
            <div className="student-edit-note">
              <header>
                <span><Info size={16} aria-hidden="true" /></span>
                <div><h3>Custom Additional Info</h3><p>Optional note shown inside the profile info menu.</p></div>
              </header>
              <div className="student-edit-grid is-two">
                <EditField label="Heading"><input className="student-edit-input" name="additional_info_heading" value={fieldString(fields, 'additional_info_heading')} placeholder="Transport, Allergy, House, Note" onChange={(event) => update('additional_info_heading', event.target.value)} /></EditField>
                <EditField label="Description"><textarea className="student-edit-input" rows={2} name="additional_info_description" value={fieldString(fields, 'additional_info_description')} placeholder="Write the detail students or visitors should see" onChange={(event) => update('additional_info_description', event.target.value)} /></EditField>
              </div>
            </div>
            <EditField label="Map / Navigation Link" wide>
              <span className="student-edit-input-wrap">
                <input className="student-edit-input" name="map_url" value={fieldString(fields, 'map_url')} placeholder="Google Maps link" onChange={(event) => update('map_url', event.target.value)} />
                <MapPin size={16} aria-hidden="true" />
              </span>
            </EditField>
          </div>
        </EditSection>

        <EditSection
          icon={<UserRound size={16} />}
          title="About & Availability"
          description="Public information that helps visitors understand the person, their strengths, and their current focus."
          delay={0.63}
        >
          <div className="student-edit-grid is-two">
            <EditField label="Short Introduction" wide help="Who they are, what they study or teach, and what matters to them.">
              <textarea className="student-edit-input" rows={3} name="about_intro" maxLength={500} value={fieldString(fields, 'about_intro') || fieldString(fields, 'bio')} placeholder="A concise public introduction" onChange={(event) => update('about_intro', event.target.value)} />
            </EditField>
            <EditField label="Featured Strength or Achievement"><textarea className="student-edit-input" rows={3} name="about_featured" maxLength={300} value={fieldString(fields, 'about_featured')} placeholder="Example: Science fair finalist and robotics club member" onChange={(event) => update('about_featured', event.target.value)} /></EditField>
            <EditField label="Current Focus / Availability"><textarea className="student-edit-input" rows={3} name="about_current" maxLength={300} value={fieldString(fields, 'about_current')} placeholder="Example: Currently learning Python and open to student projects" onChange={(event) => update('about_current', event.target.value)} /></EditField>
            <EditField label="Skills & Interests" wide help="Separate each skill or interest with a comma."><input className="student-edit-input" name="custom_skills" value={skills} placeholder="Python, public speaking, football, graphic design" onChange={(event) => setSkills(event.target.value)} /></EditField>
          </div>
        </EditSection>

        <EditSection icon={<Share2 size={16} />} title="Digital Card Settings" delay={0.65}>
          <div className="student-edit-settings">
            <label className="student-edit-toggle">
              <span><strong>Public contact card</strong><small>Turn this on to keep the digital card publicly viewable.</small></span>
              <input type="checkbox" name="show_contact_card" checked={Boolean(fields.show_contact_card)} onChange={(event) => update('show_contact_card', event.target.checked)} />
            </label>

            <div>
              <span className="student-edit-upload-label">Social Icons To Show On Card</span>
              <div className="student-edit-social-choices">
                {profile.options.socials.map((choice) => (
                  <label key={choice.value}>
                    <input type="checkbox" name="social_stack" value={choice.value} checked={selectedSocials.has(String(choice.value))} onChange={(event) => toggleSocial(String(choice.value), event.target.checked)} />
                    <span>{choice.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="student-edit-grid is-two">
              {socialFields.map(([key, label]) => (
                <EditField label={label} key={key}>
                  <input className="student-edit-input" type={key === 'whatsapp' ? 'tel' : 'url'} name={key} value={fieldString(fields, key)} placeholder={key === 'whatsapp' ? '+97798XXXXXXXX' : label === 'Website' ? 'https://example.com' : `https://${String(key).replace('twitter', 'x')}.com/username`} onChange={(event) => update(key, event.target.value)} />
                </EditField>
              ))}
            </div>
          </div>
        </EditSection>

        <EditSection icon={<UploadIcon size={16} />} title="Uploads" delay={0.7}>
          <div className="student-edit-upload-grid">
            <UploadZone label="Profile Photo" icon={<Camera size={24} />} currentUrl={profile.profilePhoto} file={files.profile_photo} emptyText="Tap preview above or here" onPick={() => document.getElementById(profileInputId)?.click()} />
            <UploadZone label="Cover Photo" icon={<ImageIcon size={24} />} currentUrl={profile.coverPhoto} file={files.cover_photo} emptyText="Tap preview above or here" onPick={() => document.getElementById(coverInputId)?.click()} />
            <UploadZone label="DOB Certificate" icon={<FileBadge size={24} />} currentUrl={profile.birthCertificate} file={files.birth_certificate} emptyText="Upload birth / DOB certificate" onPick={() => document.getElementById(birthInputId)?.click()} />
            <input id={birthInputId} type="file" accept=".pdf,image/*" hidden onChange={(event) => updateFile('birth_certificate', event.target.files?.[0] ?? null)} />
          </div>
        </EditSection>

        <div className="student-edit-actions">
          <button type="submit" disabled={saving}><CheckCircle size={16} aria-hidden="true" />{saving ? 'Saving...' : 'Save Changes'}</button>
          <a href={profile.publicUrl}><Eye size={16} aria-hidden="true" />Preview</a>
        </div>
      </form>

      <div className={`student-edit-toast${toast ? ' is-visible' : ''}`}>{toast}</div>
    </main>
  )
}

export function LegacyStudentEditor() {
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
      window.location.href = new URLSearchParams(window.location.search).get('next') || response.redirectPath
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

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import X from 'lucide-react/dist/esm/icons/x.js'
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
import { schoolWorkspaceNav } from '../school/schoolWorkspaceNav'
import {
  ApiError,
  apiFetch,
  displayError,
  jsonBody,
  queryString,
} from '../../lib/api'
import './ProfessionalWorkspace.css'

type Choice = { value: string; label: string }

type ProfessionalOptions = {
  profileTypes: Choice[]
  headerIdentities: Choice[]
  statuses: Choice[]
  workModes: Choice[]
  templates: Choice[]
  ctaTypes: Choice[]
  lookingFor: Choice[]
  serviceIcons: Choice[]
  highlightTypes: Choice[]
  documentTypes: Choice[]
  professionSuggestions: string[]
}

type CollectionRow = Record<string, string | number | boolean | File | null | undefined>

type ProfessionalDetail = {
  id: number
  fullName: string
  slug: string
  publicUrl: string
  fields: Record<string, string | number | boolean | null>
  loginUsername: string
  completion: { percent: number; suggestion: string }
  services: CollectionRow[]
  portfolio: CollectionRow[]
  testimonials: CollectionRow[]
  documents: CollectionRow[]
  options: ProfessionalOptions
}

type ProfessionalListItem = {
  id: number
  fullName: string
  slug: string
  profession: string
  companyName: string
  templateName: string
  isActive: boolean
  isVerified: boolean
  views: number
  downloads: number
  updatedAt: string
  publicUrl: string
  editUrl: string
}

type FieldConfig = {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'email' | 'url' | 'number' | 'color'
  placeholder?: string
  wide?: boolean
}

const defaultOptions: ProfessionalOptions = {
  profileTypes: [],
  headerIdentities: [],
  statuses: [],
  workModes: [],
  templates: [],
  ctaTypes: [],
  lookingFor: [],
  serviceIcons: [],
  highlightTypes: [],
  documentTypes: [],
  professionSuggestions: [],
}

const defaultFields: Record<string, string | number | boolean | null> = {
  profile_type: 'professional',
  full_name: '',
  slug: '',
  profession: '',
  designation: '',
  company_name: '',
  header_identity: 'organization',
  organization_tagline: '',
  brand_name: '',
  brand_tagline: '',
  industry: '',
  work_role: '',
  work_organization: '',
  work_experience: '',
  work_address: '',
  academic_section: '',
  academic_title: '',
  academic_institution: '',
  academic_level: '',
  academic_year: '',
  academic_specialization: '',
  academic_status: '',
  academic_certification: '',
  academic_address: '',
  short_tagline: '',
  about: '',
  current_focus: '',
  featured_interest: '',
  current_status: '',
  looking_for: '',
  preferred_work_mode: '',
  networking_statement: '',
  phone: '',
  whatsapp_number: '',
  email: '',
  website: '',
  linkedin_url: '',
  facebook_url: '',
  instagram_url: '',
  youtube_url: '',
  github_url: '',
  booking_url: '',
  office_address: '',
  google_maps_url: '',
  show_map_on_profile: false,
  business_hours: '',
  show_primary_cta: true,
  primary_cta_type: 'contact',
  primary_cta_label: '',
  primary_cta_url: '',
  years_of_experience: '',
  location: '',
  is_verified: false,
  is_active: true,
  template_name: 'modern_identity',
  accent_color: '#0f766e',
}

const identityFields: FieldConfig[] = [
  { key: 'full_name', label: 'Full name', placeholder: 'Full professional name' },
  { key: 'slug', label: 'Public URL slug', placeholder: 'name-or-brand' },
  { key: 'profession', label: 'Professional headline', placeholder: 'Web Developer | Open to Work' },
  { key: 'designation', label: 'Current role', placeholder: 'CEO, Student, Designer' },
  { key: 'company_name', label: 'Current organization', placeholder: 'Company or institution' },
  { key: 'industry', label: 'Industry / field', placeholder: 'Education, Technology, Finance' },
]

const organizationIdentityFields: FieldConfig[] = [
  ...identityFields,
  { key: 'organization_tagline', label: 'Organization tagline' },
]

const headerFields: FieldConfig[] = [
  { key: 'organization_tagline', label: 'Organization tagline' },
  { key: 'brand_name', label: 'Personal brand name' },
  { key: 'brand_tagline', label: 'Personal brand tagline' },
]

const workFields: FieldConfig[] = [
  { key: 'work_role', label: 'Role', placeholder: 'Software Engineer' },
  { key: 'work_organization', label: 'Organization name', placeholder: 'Organization shown in this section' },
  { key: 'work_experience', label: 'Experience', placeholder: '2 years, Internship' },
  { key: 'work_address', label: 'Address', type: 'textarea', wide: true },
]

const academicFields: FieldConfig[] = [
  { key: 'academic_title', label: 'Degree / Program', placeholder: 'BSc CSIT' },
  { key: 'academic_institution', label: 'Institution', placeholder: 'Kathmandu Bernhardt College' },
  { key: 'academic_level', label: 'Level', placeholder: 'Bachelor’s' },
  { key: 'academic_year', label: 'Year / Semester', placeholder: 'Final Year / 6th Semester' },
  { key: 'academic_section', label: 'Class / Batch / Section', placeholder: '2026 Batch / Section A' },
  { key: 'academic_specialization', label: 'Specialization', placeholder: 'Web Development / Networking' },
  { key: 'academic_status', label: 'Status', placeholder: 'Seeking Internship / Open to Work' },
  { key: 'academic_certification', label: 'Certification', placeholder: 'AWS Cloud Practitioner' },
  { key: 'academic_address', label: 'Campus address', placeholder: 'Campus or institution address', type: 'textarea', wide: true },
]

const aboutFields: FieldConfig[] = [
  { key: 'short_tagline', label: 'Profile tagline', placeholder: 'Learn. Build. Connect.', wide: true },
  { key: 'about', label: 'About', type: 'textarea', wide: true },
  { key: 'current_focus', label: 'Current focus', type: 'textarea', wide: true },
  { key: 'featured_interest', label: 'Featured interest', type: 'textarea', wide: true },
  { key: 'networking_statement', label: 'Networking statement', type: 'textarea', wide: true },
]

const organizationAboutFields = aboutFields.slice(0, 2)

const contactFields: FieldConfig[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp_number', label: 'WhatsApp number' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url' },
  { key: 'facebook_url', label: 'Facebook', type: 'url' },
  { key: 'instagram_url', label: 'Instagram', type: 'url' },
  { key: 'youtube_url', label: 'YouTube', type: 'url' },
  { key: 'github_url', label: 'GitHub', type: 'url' },
  { key: 'booking_url', label: 'Booking link', type: 'url' },
  { key: 'location', label: 'Location' },
  { key: 'business_hours', label: 'Availability / business hours' },
  { key: 'office_address', label: 'Office / campus address', type: 'textarea', wide: true },
  { key: 'google_maps_url', label: 'Google Maps link', type: 'url', wide: true },
]

const ctaFields: FieldConfig[] = [
  { key: 'primary_cta_label', label: 'CTA label', placeholder: 'Contact us, Visit website, Book a meeting' },
  { key: 'primary_cta_url', label: 'Custom link', type: 'url', placeholder: 'Only used when Custom Link is selected', wide: true },
]

const professionalNav = [
  { label: 'Dashboard', href: '/dashboard/', icon: LayoutDashboard },
  { label: 'Professional cards', href: '/dashboard/professional-cards/', icon: BriefcaseBusiness, active: true },
]

function useWorkspaceIdentity() {
  const [identity, setIdentity] = useState({
    isSuperuser: false,
    role: 'Professional account',
    displayName: 'Account',
  })

  useEffect(() => {
    let current = true
    apiFetch<{ user: { isSuperuser: boolean; displayName: string; username: string } }>('/api/session/')
      .then(({ user }) => {
        if (current) setIdentity({
          isSuperuser: user.isSuperuser,
          role: user.isSuperuser ? 'Super Admin' : 'Professional account',
          displayName: user.displayName || user.username || 'Account',
        })
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [])

  return {
    ...identity,
    nav: identity.isSuperuser ? schoolWorkspaceNav(undefined, true) : professionalNav,
  }
}

function fieldString(value: string | number | boolean | File | null | undefined) {
  if (value instanceof File) return value.name
  return value === null || value === undefined ? '' : String(value)
}

function ConfiguredField({
  config,
  fields,
  errors,
  onChange,
}: {
  config: FieldConfig
  fields: Record<string, string | number | boolean | null>
  errors: Record<string, string[]>
  onChange: (key: string, value: string) => void
}) {
  const value = fieldString(fields[config.key])
  return (
    <Field
      label={config.label}
      error={errors[config.key]?.[0]}
      wide={config.wide}
    >
      {config.type === 'textarea' ? (
        <TextArea
          value={value}
          placeholder={config.placeholder}
          onChange={(event) => onChange(config.key, event.target.value)}
        />
      ) : (
        <TextInput
          type={config.type ?? 'text'}
          value={value}
          placeholder={config.placeholder}
          onChange={(event) => onChange(config.key, event.target.value)}
        />
      )}
    </Field>
  )
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="professional-empty-row">{children}</div>
}

function RepeatRow({
  children,
  onRemove,
}: {
  children: ReactNode
  onRemove: () => void
}) {
  return (
    <div className="professional-repeat-row">
      <button
        className="professional-remove"
        type="button"
        onClick={onRemove}
        title="Remove item"
        aria-label="Remove item"
      >
        <X size={15} />
      </button>
      {children}
    </div>
  )
}

export function ProfessionalProfileList() {
  const workspace = useWorkspaceIdentity()
  const [profiles, setProfiles] = useState<ProfessionalListItem[]>([])
  const [counts, setCounts] = useState({ total: 0, active: 0 })
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get('q') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    setLoading(true)
    apiFetch<{
      profiles: ProfessionalListItem[]
      counts: { total: number; active: number }
    }>(`/api/manage/professional-profiles/${queryString({ q: query })}`)
      .then((payload) => {
        if (!current) return
        setProfiles(payload.profiles)
        setCounts(payload.counts)
        setError('')
      })
      .catch((reason) => {
        if (!current) return
        setError(displayError(reason))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [query])

  async function removeProfile(profile: ProfessionalListItem) {
    if (!window.confirm(`Delete ${profile.fullName}? This cannot be undone.`)) return
    try {
      await apiFetch(`/api/manage/professional-profiles/${profile.id}/`, { method: 'DELETE' })
      setProfiles((current) => current.filter((item) => item.id !== profile.id))
      setCounts((current) => ({
        total: Math.max(0, current.total - 1),
        active: Math.max(0, current.active - (profile.isActive ? 1 : 0)),
      }))
    } catch (reason) {
      setError(displayError(reason))
    }
  }

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Professional profiles"
      logo="/static/branding/tap2connect-logo-official.png"
      nav={workspace.nav}
      title="Professional Cards"
      subtitle={`${counts.active} active of ${counts.total} profiles`}
      userName={workspace.displayName}
      userRole={workspace.role}
      accent="#0f766e"
      actions={(
        <a className="manage-button is-primary" href="/dashboard/professional-cards/add/">
          <Plus size={14} />
          New profile
        </a>
      )}
    >
      {error ? <div className="manage-alert">{error}</div> : null}
      <section className="professional-list-toolbar manage-card">
        <label>
          <Search size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, profession, or organization"
          />
        </label>
        <span>{profiles.length} shown</span>
      </section>

      <section className="professional-table-wrap manage-card">
        {loading ? (
          <div className="professional-empty-row">Loading profiles…</div>
        ) : profiles.length === 0 ? (
          <div className="professional-empty-row">No professional profiles match this search.</div>
        ) : (
          <table className="professional-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Template</th>
                <th>Activity</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <strong>{profile.fullName}</strong>
                    <span>{profile.profession || profile.companyName || `/${profile.slug}`}</span>
                  </td>
                  <td>{profile.templateName.replaceAll('_', ' ')}</td>
                  <td>
                    <span>{profile.views} views · {profile.downloads} saves</span>
                  </td>
                  <td>
                    <span className={`professional-status${profile.isActive ? ' is-active' : ''}`}>
                      {profile.isActive ? 'Active' : 'Hidden'}
                    </span>
                    {profile.isVerified ? <BadgeCheck size={14} aria-label="Verified" /> : null}
                  </td>
                  <td>
                    <div className="professional-row-actions">
                      <a href={profile.publicUrl} target="_blank" rel="noreferrer" title="View public profile">
                        <Eye size={15} />
                      </a>
                      <a href={`/p/${profile.slug}/edit/`} title="Edit profile">
                        <Pencil size={15} />
                      </a>
                      <button type="button" onClick={() => removeProfile(profile)} title="Delete profile">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </ManageShell>
  )
}

function useProfessionalRoute() {
  const editMatch = window.location.pathname.match(/\/dashboard\/professional-cards\/(\d+)\/edit\/?$/)
  const ownerMatch = window.location.pathname.match(/^\/p\/([^/]+)\/edit\/?$/)
  return {
    id: editMatch ? Number(editMatch[1]) : null,
    slug: ownerMatch ? decodeURIComponent(ownerMatch[1]) : '',
    isOwner: Boolean(ownerMatch),
    isCreate: window.location.pathname.includes('/add/'),
  }
}

function sanitizeCollection(rows: CollectionRow[]) {
  return rows.map((row, index) => {
    const result: CollectionRow = { ...row, uploadKey: index, display_order: index }
    delete result._file
    return result
  })
}

export function ProfessionalProfileEditor() {
  const workspace = useWorkspaceIdentity()
  const route = useProfessionalRoute()
  const [fields, setFields] = useState({ ...defaultFields })
  const [options, setOptions] = useState(defaultOptions)
  const [profileId, setProfileId] = useState<number | null>(route.id)
  const [publicUrl, setPublicUrl] = useState('')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [services, setServices] = useState<CollectionRow[]>([])
  const [portfolio, setPortfolio] = useState<CollectionRow[]>([])
  const [testimonials, setTestimonials] = useState<CollectionRow[]>([])
  const [documents, setDocuments] = useState<CollectionRow[]>([])
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [completion, setCompletion] = useState<{ percent: number; suggestion: string } | null>(null)
  const [loading, setLoading] = useState(!route.isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const endpoint = useMemo(() => {
    if (route.id) return `/api/manage/professional-profiles/${route.id}/`
    if (route.slug) return `/api/manage/professional-profiles/by-slug/${route.slug}/`
    return '/api/manage/professional-profiles/'
  }, [route.id, route.slug])

  useEffect(() => {
    let current = true
    if (route.isCreate) {
      apiFetch<{ options: ProfessionalOptions }>('/api/manage/professional-profiles/')
        .then((payload) => {
          if (current) setOptions(payload.options)
        })
        .catch((reason) => {
          if (current) setError(displayError(reason))
        })
      return () => {
        current = false
      }
    }
    apiFetch<{ profile: ProfessionalDetail }>(endpoint)
      .then(({ profile }) => {
        if (!current) return
        setProfileId(profile.id)
        setFields({ ...defaultFields, ...profile.fields })
        setOptions(profile.options)
        setLoginUsername(profile.loginUsername)
        setServices(profile.services)
        setPortfolio(profile.portfolio)
        setTestimonials(profile.testimonials)
        setDocuments(profile.documents)
        setCompletion(profile.completion)
        setPublicUrl(profile.publicUrl)
        document.title = `Edit ${profile.fullName} | Tap2Connect`
      })
      .catch((reason) => {
        if (current) setError(displayError(reason))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => {
      current = false
    }
  }, [endpoint, route.isCreate])

  function updateField(key: string, value: string | boolean) {
    setFields((current) => ({ ...current, [key]: value }))
    setSuccess('')
  }

  function updateRow(
    setter: React.Dispatch<React.SetStateAction<CollectionRow[]>>,
    index: number,
    key: string,
    value: string | boolean | File | null,
  ) {
    setter((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    )))
  }

  function removeRow(
    setter: React.Dispatch<React.SetStateAction<CollectionRow[]>>,
    index: number,
  ) {
    setter((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    setFieldErrors({})
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      if (key === 'looking_for') {
        fieldString(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => body.append(key, item))
      } else {
        body.append(key, fieldString(value))
      }
    })
    body.append('login_username', loginUsername)
    body.append('login_password', loginPassword)
    Object.entries(files).forEach(([key, file]) => {
      if (file) body.append(key, file)
    })
    portfolio.forEach((row, index) => {
      if (row._file instanceof File) body.append(`portfolio_file_${index}`, row._file)
    })
    testimonials.forEach((row, index) => {
      if (row._file instanceof File) body.append(`testimonial_file_${index}`, row._file)
    })
    documents.forEach((row, index) => {
      if (row._file instanceof File) body.append(`document_file_${index}`, row._file)
    })
    body.append('collections', JSON.stringify({
      services: sanitizeCollection(services),
      portfolio: sanitizeCollection(portfolio),
      testimonials: sanitizeCollection(testimonials),
      documents: sanitizeCollection(documents),
    }))

    try {
      const response = await apiFetch<{ profile: ProfessionalDetail }>(
        profileId ? `/api/manage/professional-profiles/${profileId}/` : '/api/manage/professional-profiles/',
        { method: 'POST', body },
      )
      setProfileId(response.profile.id)
      setFields({ ...defaultFields, ...response.profile.fields })
      setPublicUrl(response.profile.publicUrl)
      setCompletion(response.profile.completion)
      setServices(response.profile.services)
      setPortfolio(response.profile.portfolio)
      setTestimonials(response.profile.testimonials)
      setDocuments(response.profile.documents)
      setFiles({})
      setLoginPassword('')
      setSuccess('Profile saved successfully.')
      if (route.isCreate) {
        window.history.replaceState({}, '', `/p/${response.profile.slug}/edit/`)
      }
    } catch (reason) {
      if (reason instanceof ApiError) setFieldErrors(reason.errors)
      setError(displayError(reason))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="manage-state">Loading profile editor…</div>

  const ownerLabel = route.isOwner ? 'My Professional Card' : (profileId ? 'Edit Professional Card' : 'Create Professional Card')
  const lookingFor = new Set(fieldString(fields.looking_for).split(',').filter(Boolean))
  const isOrganizationTemplate = fieldString(fields.template_name) === 'organization_focus'
  const mainIdentityFields = isOrganizationTemplate ? organizationIdentityFields : identityFields
  const storyFields = isOrganizationTemplate ? organizationAboutFields : aboutFields

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail={route.isOwner ? 'Profile owner workspace' : 'Professional profiles'}
      logo="/static/branding/tap2connect-logo-official.png"
      nav={route.isOwner ? [
        { label: 'Profile editor', href: window.location.pathname, icon: UserRound, active: true },
        { label: 'Public profile', href: publicUrl || `/p/${route.slug}/`, icon: Eye },
        { label: 'Connections', href: '/connections/', icon: Users },
      ] : workspace.nav}
      title={ownerLabel}
      subtitle={completion ? `${completion.percent}% complete · ${completion.suggestion}` : 'Build a complete digital professional identity'}
      userName={route.isOwner ? fieldString(fields.full_name) || 'Profile editor' : workspace.displayName}
      userRole={route.isOwner ? 'Profile owner' : workspace.role}
      accent={fieldString(fields.accent_color) || '#0f766e'}
      actions={publicUrl ? (
        <a className="manage-button" href={publicUrl} target="_blank" rel="noreferrer">
          <Eye size={14} />
          Preview
        </a>
      ) : null}
      notificationsHref={route.isOwner ? '/connections/' : undefined}
    >
      <form onSubmit={saveProfile}>
        {error ? <div className="manage-alert professional-message">{error}</div> : null}
        {success ? <div className="manage-alert is-success professional-message">{success}</div> : null}

        <FormSection
          title="Main identity"
          description={isOrganizationTemplate ? 'The person appears as the brand representative for this organization card.' : 'The headline information at the top of the public card.'}
        >
          <div className="form-grid">
            {!route.isOwner && !isOrganizationTemplate ? (
              <Field label="Profile type" error={fieldErrors.profile_type?.[0]}>
                <SelectInput
                  value={fieldString(fields.profile_type)}
                  onChange={(event) => updateField('profile_type', event.target.value)}
                >
                  {options.profileTypes.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </SelectInput>
              </Field>
            ) : null}
            {mainIdentityFields.map((config) => (
              <ConfiguredField
                key={config.key}
                config={config}
                fields={fields}
                errors={fieldErrors}
                onChange={updateField}
              />
            ))}
            <Field label="Template">
              <SelectInput value={fieldString(fields.template_name)} onChange={(event) => updateField('template_name', event.target.value)}>
                {options.templates.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
              </SelectInput>
            </Field>
            <Field label="Accent color">
              <TextInput type="color" value={fieldString(fields.accent_color)} onChange={(event) => updateField('accent_color', event.target.value)} />
            </Field>
          </div>
          <div className="professional-file-grid">
            <FileInput label="Profile photo" currentUrl={fieldString(fields.profile_photo)} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, profile_photo: file }))} />
            <FileInput label="Cover photo" currentUrl={fieldString(fields.cover_photo)} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, cover_photo: file }))} />
            {isOrganizationTemplate ? (
              <FileInput label="Organization logo" currentUrl={fieldString(fields.organization_logo)} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, organization_logo: file }))} />
            ) : null}
          </div>
        </FormSection>

        {!isOrganizationTemplate ? (
          <FormSection
            title="Header identity"
            description="Choose which organization or brand identity appears above the profile."
          >
            <div className="form-grid">
              <Field label="Header style">
                <SelectInput value={fieldString(fields.header_identity)} onChange={(event) => updateField('header_identity', event.target.value)}>
                  {options.headerIdentities.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </SelectInput>
              </Field>
              {headerFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
            </div>
            <div className="professional-file-grid">
              <FileInput label="Organization logo" currentUrl={fieldString(fields.organization_logo)} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, organization_logo: file }))} />
              <FileInput label="Personal logo" currentUrl={fieldString(fields.personal_logo)} accept="image/*" onChange={(file) => setFiles((current) => ({ ...current, personal_logo: file }))} />
            </div>
          </FormSection>
        ) : null}

        {!isOrganizationTemplate ? (
          <>
            <FormSection title="Work identity" description="This section uses its own role, organization, experience, and address.">
              <div className="form-grid">
                {workFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
              </div>
            </FormSection>

            <FormSection title="Academic background" description="Complete education details shown on the public academic card.">
              <div className="form-grid">
                {academicFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
              </div>
            </FormSection>
          </>
        ) : null}

        <FormSection title={isOrganizationTemplate ? 'Brand story' : 'About and current focus'}>
          <div className="form-grid">
            {storyFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
          </div>
        </FormSection>

        {!isOrganizationTemplate ? (
          <FormSection title="Opportunity status">
            <div className="form-grid is-three">
              <Field label="Current status">
                <SelectInput value={fieldString(fields.current_status)} onChange={(event) => updateField('current_status', event.target.value)}>
                  {options.statuses.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </SelectInput>
              </Field>
              <Field label="Preferred work mode">
                <SelectInput value={fieldString(fields.preferred_work_mode)} onChange={(event) => updateField('preferred_work_mode', event.target.value)}>
                  {options.workModes.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </SelectInput>
              </Field>
              <Field label="Experience / study year">
                <TextInput type="number" min="0" value={fieldString(fields.years_of_experience)} onChange={(event) => updateField('years_of_experience', event.target.value)} />
              </Field>
            </div>
            <div className="professional-choice-grid">
              {options.lookingFor.map((choice) => (
                <label key={choice.value}>
                  <input
                    type="checkbox"
                    checked={lookingFor.has(choice.value)}
                    onChange={(event) => {
                      const next = new Set(lookingFor)
                      if (event.target.checked) next.add(choice.value)
                      else next.delete(choice.value)
                      updateField('looking_for', [...next].join(','))
                    }}
                  />
                  {choice.label}
                </label>
              ))}
            </div>
          </FormSection>
        ) : null}

        <FormSection title="Contact and social links">
          <div className="form-grid">
            {contactFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
            {!isOrganizationTemplate ? (
              <Toggle label="Show map on public profile" checked={Boolean(fields.show_map_on_profile)} onChange={(checked) => updateField('show_map_on_profile', checked)} />
            ) : null}
          </div>
        </FormSection>

        {!isOrganizationTemplate ? (
          <FormSection title="Primary CTA" description="Choose one useful action visitors should take from the Modern profile.">
            <div className="form-grid is-three">
              <Field label="CTA type">
                <SelectInput value={fieldString(fields.primary_cta_type)} onChange={(event) => updateField('primary_cta_type', event.target.value)}>
                  {options.ctaTypes.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}
                </SelectInput>
              </Field>
              {ctaFields.map((config) => <ConfiguredField key={config.key} config={config} fields={fields} errors={fieldErrors} onChange={updateField} />)}
              <Toggle label="Show CTA on Modern profile" checked={Boolean(fields.show_primary_cta)} onChange={(checked) => updateField('show_primary_cta', checked)} />
            </div>
          </FormSection>
        ) : null}

        <FormSection
          title={isOrganizationTemplate ? 'Organization offerings' : 'Skills and services'}
          description={isOrganizationTemplate ? 'Services the organization provides to visitors.' : 'Skills and professional services shown on the Modern profile.'}
          actions={<button className="manage-button" type="button" onClick={() => setServices((current) => [...current, { title: '', description: '', icon: 'briefcase', display_order: current.length }])}><Plus size={13} /> Add service</button>}
        >
          {services.length === 0 ? <EmptyRow>Add the services visitors can request from this profile.</EmptyRow> : (
            <div className="professional-repeat-list">
              {services.map((row, index) => (
                <RepeatRow key={fieldString(row.id) || `service-${index}`} onRemove={() => removeRow(setServices, index)}>
                  <div className="form-grid is-three">
                    <Field label="Service / offering"><TextInput value={fieldString(row.title)} onChange={(event) => updateRow(setServices, index, 'title', event.target.value)} /></Field>
                    <Field label="Icon"><SelectInput value={fieldString(row.icon)} onChange={(event) => updateRow(setServices, index, 'icon', event.target.value)}>{options.serviceIcons.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</SelectInput></Field>
                    <Field label="Description" wide><TextArea rows={2} value={fieldString(row.description)} onChange={(event) => updateRow(setServices, index, 'description', event.target.value)} /></Field>
                  </div>
                </RepeatRow>
              ))}
            </div>
          )}
        </FormSection>

        {!isOrganizationTemplate ? (
          <>
            <FormSection
              title="Highlights"
              description="Each highlight has its own organization, project link, photo, and description. No logo field is used."
              actions={<button className="manage-button" type="button" onClick={() => setPortfolio((current) => [...current, { title: '', highlight_type: 'project', organization: '', period: '', description: '', link: '', display_order: current.length }])}><Plus size={13} /> Add highlight</button>}
            >
              {portfolio.length === 0 ? <EmptyRow>Add projects, achievements, or work highlights.</EmptyRow> : (
                <div className="professional-repeat-list">
                  {portfolio.map((row, index) => (
                    <RepeatRow key={fieldString(row.id) || `portfolio-${index}`} onRemove={() => removeRow(setPortfolio, index)}>
                      <div className="form-grid is-three">
                        <Field label="Title"><TextInput value={fieldString(row.title)} onChange={(event) => updateRow(setPortfolio, index, 'title', event.target.value)} /></Field>
                        <Field label="Type"><SelectInput value={fieldString(row.highlight_type)} onChange={(event) => updateRow(setPortfolio, index, 'highlight_type', event.target.value)}>{options.highlightTypes.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</SelectInput></Field>
                        <Field label="Organization name"><TextInput value={fieldString(row.organization)} onChange={(event) => updateRow(setPortfolio, index, 'organization', event.target.value)} /></Field>
                        <Field label="Period"><TextInput value={fieldString(row.period)} onChange={(event) => updateRow(setPortfolio, index, 'period', event.target.value)} /></Field>
                        <Field label="Project link"><TextInput type="url" value={fieldString(row.link)} onChange={(event) => updateRow(setPortfolio, index, 'link', event.target.value)} /></Field>
                        <FileInput label="Photo" currentUrl={fieldString(row.image)} accept="image/*" onChange={(file) => updateRow(setPortfolio, index, '_file', file)} />
                        <Field label="Description" wide><TextArea value={fieldString(row.description)} onChange={(event) => updateRow(setPortfolio, index, 'description', event.target.value)} /></Field>
                      </div>
                    </RepeatRow>
                  ))}
                </div>
              )}
            </FormSection>

            <FormSection
              title="Testimonials"
              actions={<button className="manage-button" type="button" onClick={() => setTestimonials((current) => [...current, { client_name: '', client_role: '', organization: '', review_text: '', rating: 5, display_order: current.length }])}><Plus size={13} /> Add testimonial</button>}
            >
              {testimonials.length === 0 ? <EmptyRow>Add recommendations when they are available.</EmptyRow> : (
                <div className="professional-repeat-list">
                  {testimonials.map((row, index) => (
                    <RepeatRow key={fieldString(row.id) || `testimonial-${index}`} onRemove={() => removeRow(setTestimonials, index)}>
                      <div className="form-grid is-three">
                        <Field label="Client name"><TextInput value={fieldString(row.client_name)} onChange={(event) => updateRow(setTestimonials, index, 'client_name', event.target.value)} /></Field>
                        <Field label="Role"><TextInput value={fieldString(row.client_role)} onChange={(event) => updateRow(setTestimonials, index, 'client_role', event.target.value)} /></Field>
                        <Field label="Organization"><TextInput value={fieldString(row.organization)} onChange={(event) => updateRow(setTestimonials, index, 'organization', event.target.value)} /></Field>
                        <Field label="Rating"><TextInput type="number" min="1" max="5" value={fieldString(row.rating)} onChange={(event) => updateRow(setTestimonials, index, 'rating', event.target.value)} /></Field>
                        <FileInput label="Client photo" currentUrl={fieldString(row.profile_photo)} accept="image/*" onChange={(file) => updateRow(setTestimonials, index, '_file', file)} />
                        <Field label="Review" wide><TextArea value={fieldString(row.review_text)} onChange={(event) => updateRow(setTestimonials, index, 'review_text', event.target.value)} /></Field>
                      </div>
                    </RepeatRow>
                  ))}
                </div>
              )}
            </FormSection>
          </>
        ) : null}

        <FormSection
          title="Documents"
          description="Keep no more than two documents public."
          actions={<button className="manage-button" type="button" onClick={() => setDocuments((current) => [...current, { title: '', document_type: 'other', is_public: true, display_order: current.length }])}><Plus size={13} /> Add document</button>}
        >
          {documents.length === 0 ? <EmptyRow>Add a CV, brochure, certificate, or portfolio document.</EmptyRow> : (
            <div className="professional-repeat-list">
              {documents.map((row, index) => (
                <RepeatRow key={fieldString(row.id) || `document-${index}`} onRemove={() => removeRow(setDocuments, index)}>
                  <div className="form-grid is-three">
                    <Field label="Title"><TextInput value={fieldString(row.title)} onChange={(event) => updateRow(setDocuments, index, 'title', event.target.value)} /></Field>
                    <Field label="Document type"><SelectInput value={fieldString(row.document_type)} onChange={(event) => updateRow(setDocuments, index, 'document_type', event.target.value)}>{options.documentTypes.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</SelectInput></Field>
                    <Toggle label="Public document" checked={Boolean(row.is_public)} onChange={(checked) => updateRow(setDocuments, index, 'is_public', checked)} />
                    <FileInput label="File" currentUrl={fieldString(row.file)} onChange={(file) => updateRow(setDocuments, index, '_file', file)} />
                  </div>
                </RepeatRow>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title="Profile login" description="The owner can use these credentials to manage their own card.">
          <div className="form-grid">
            <Field label="Login username" error={fieldErrors.login_username?.[0]}>
              <TextInput value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} autoComplete="username" />
            </Field>
            <Field label="New password" hint={profileId ? 'Leave blank to keep the current password.' : 'Required when creating a separate owner login.'} error={fieldErrors.login_password?.[0]}>
              <TextInput type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} autoComplete="new-password" />
            </Field>
          </div>
        </FormSection>

        {!route.isOwner ? (
          <FormSection title="Publishing">
            <div className="form-grid">
              <Toggle label="Profile is active" checked={Boolean(fields.is_active)} onChange={(checked) => updateField('is_active', checked)} />
              <Toggle label="Verified identity" checked={Boolean(fields.is_verified)} onChange={(checked) => updateField('is_verified', checked)} />
            </div>
          </FormSection>
        ) : null}

        <div className="form-actions">
          <a className="manage-button" href={route.isOwner ? publicUrl || `/p/${route.slug}/` : '/dashboard/professional-cards/'}>Cancel</a>
          <button className="manage-button is-primary" type="submit" disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </ManageShell>
  )
}

export function ProfessionalProfileDelete() {
  const workspace = useWorkspaceIdentity()
  const match = window.location.pathname.match(/professional-cards\/(\d+)\/delete/)
  const id = Number(match?.[1] ?? 0)
  const [profile, setProfile] = useState<ProfessionalDetail | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiFetch<{ profile: ProfessionalDetail }>(`/api/manage/professional-profiles/${id}/`)
      .then((payload) => setProfile(payload.profile))
      .catch((reason) => setError(displayError(reason)))
  }, [id])

  async function remove() {
    setDeleting(true)
    try {
      await apiFetch(`/api/manage/professional-profiles/${id}/`, { method: 'DELETE' })
      window.location.href = '/dashboard/professional-cards/'
    } catch (reason) {
      setError(displayError(reason))
      setDeleting(false)
    }
  }

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Professional profiles"
      nav={workspace.nav}
      title="Delete Professional Card"
      subtitle="Review the profile before permanently removing it"
      userName={workspace.displayName}
      userRole={workspace.role}
      accent="#0f766e"
    >
      <section className="professional-delete-card manage-card">
        <Trash2 size={24} />
        <h2>{profile?.fullName || 'Professional profile'}</h2>
        <p>This removes the public profile and its services, highlights, testimonials, and documents.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        <div>
          <a className="manage-button" href={profile ? `/p/${profile.slug}/edit/` : '/dashboard/professional-cards/'}>Cancel</a>
          <button className="manage-button is-danger" type="button" onClick={remove} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </section>
    </ManageShell>
  )
}

export function ProfessionalEditLogin() {
  const slug = decodeURIComponent(window.location.pathname.match(/^\/p\/([^/]+)/)?.[1] ?? '')
  const [profileName, setProfileName] = useState('this profile')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    document.title = 'Edit profile | Tap2Connect'
    apiFetch<{ profile: { fullName: string }; redirectPath?: string }>(`/api/professional-profiles/${slug}/edit-login/`)
      .then((response) => {
        if (!active) return
        const fullName = response.profile.fullName || 'this profile'
        setProfileName(fullName)
        document.title = `Edit ${fullName} | Tap2Connect`
        if (response.redirectPath) window.location.replace(response.redirectPath)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [slug])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await apiFetch<{ redirectPath: string }>(
        `/api/professional-profiles/${slug}/edit-login/`,
        {
          method: 'POST',
          body: jsonBody({ username, password }),
        },
      )
      window.location.href = response.redirectPath
    } catch (reason) {
      setError(displayError(reason))
      setSubmitting(false)
    }
  }

  return (
    <main className="profile-login-page">
      <form className="profile-login-card" onSubmit={submit}>
        <a href="/" className="profile-login-logo" aria-label="Tap2Connect home">
          <img src="/static/branding/tap2connect-logo-official.png" alt="Tap2Connect" />
        </a>
        <h1>Edit profile</h1>
        <p>Log in with the account that manages {profileName} to update this networking card.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        <label>
          <span>Username</span>
          <input
            type="text"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login to Edit'}
        </button>
        <a className="profile-login-back" href={`/p/${slug}/`}>Back to profile</a>
      </form>
    </main>
  )
}

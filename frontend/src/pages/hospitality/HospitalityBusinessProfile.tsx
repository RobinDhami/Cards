import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down.js'
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { Field, SelectInput, TextArea, TextInput } from '../../components/manage/FormControls'
import { ImageAdjustInput } from '../../components/manage/ImageAdjustInput'
import { apiFetch, displayError } from '../../lib/api'
import type { Venue } from './HospitalityWorkspace'
import './HospitalityBusinessProfile.css'

type ProfileTab = 'basic' | 'contact' | 'links' | 'appearance'
type Interval = { start: string; end: string }
type DaySchedule = { closed: boolean; intervals: Interval[] }
type Schedule = Record<string, DaySchedule>

const days = [
  ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'], ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday'],
] as const
const countries = [['+977', 'Nepal +977'], ['+91', 'India +91'], ['+1', 'US/Canada +1'], ['+44', 'UK +44'], ['+971', 'UAE +971'], ['+61', 'Australia +61']]

function completeSchedule(value: Venue['venue']['openingSchedule']): Schedule {
  return Object.fromEntries(days.map(([key]) => [key, value?.[key] || { closed: true, intervals: [] }]))
}

function splitPhone(value: string) {
  const normalized = value.trim()
  const country = countries.find(([code]) => normalized.startsWith(code))?.[0] || '+977'
  return { country, number: normalized.startsWith(country) ? normalized.slice(country.length).trim() : normalized }
}

function fullPhone(country: string, number: string) {
  return number.trim() ? `${country}${number.replace(/^0+/, '').replace(/\s+/g, '')}` : ''
}

function useFilePreview(file: File | null, fallback: string, removed: boolean) {
  const [url, setUrl] = useState(removed ? '' : fallback)
  useEffect(() => {
    if (removed) { setUrl(''); return }
    if (!file) { setUrl(fallback); return }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [fallback, file, removed])
  return url
}

export function HospitalityBusinessProfile({
  organizationId,
  initial,
  onSaved,
}: {
  organizationId: number
  initial: Venue
  onSaved: (venue: Venue) => void
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial))
  const [tab, setTab] = useState<ProfileTab>('basic')
  const [phone, setPhone] = useState(() => splitPhone(initial.venue.phone))
  const [whatsapp, setWhatsapp] = useState(() => splitPhone(initial.venue.whatsapp))
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeCover, setRemoveCover] = useState(false)
  const [scheduleTouched, setScheduleTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [mobilePreview, setMobilePreview] = useState(false)
  const logoPreview = useFilePreview(logoFile, initial.venue.logo, removeLogo)
  const coverPreview = useFilePreview(coverFile, initial.venue.coverImage, removeCover)
  const changed = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial)
    || fullPhone(phone.country, phone.number) !== initial.venue.phone
    || fullPhone(whatsapp.country, whatsapp.number) !== initial.venue.whatsapp
    || Boolean(logoFile || coverFile || removeLogo || removeCover),
  [coverFile, draft, initial, logoFile, phone, removeCover, removeLogo, whatsapp])

  const updateVenue = <K extends keyof Venue['venue']>(key: K, value: Venue['venue'][K]) => {
    setDraft((current) => ({ ...current, venue: { ...current.venue, [key]: value } }))
    setStatus('idle')
  }
  const updateOrganizationName = (name: string) => {
    setDraft((current) => ({ ...current, organization: { ...current.organization, name } }))
    setStatus('idle')
  }

  function updateDay(day: string, value: DaySchedule) {
    setScheduleTouched(true)
    updateVenue('openingSchedule', { ...completeSchedule(draft.venue.openingSchedule), [day]: value })
  }

  function updateLink(index: number, patch: Partial<Venue['links'][number]>) {
    setDraft((current) => ({ ...current, links: current.links.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }))
    setStatus('idle')
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= draft.links.length) return
    setDraft((current) => {
      const links = [...current.links]
      ;[links[index], links[target]] = [links[target], links[index]]
      return { ...current, links }
    })
    setStatus('idle')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!changed || status === 'saving') return
    setStatus('saving'); setMessage('')
    try {
      const body = new FormData()
      const values = {
        name: draft.organization.name, venue_type: draft.venue.type, description: draft.venue.description,
        address: draft.venue.address, map_url: draft.venue.mapUrl,
        phone: fullPhone(phone.country, phone.number), email: draft.venue.email, website: draft.venue.website,
        whatsapp: fullPhone(whatsapp.country, whatsapp.number), whatsapp_same_as_phone: draft.venue.whatsappSameAsPhone,
        reservation_url: draft.venue.reservationUrl, google_review_url: draft.venue.googleReviewUrl,
        primary_color: draft.venue.primaryColor, secondary_color: draft.venue.secondaryColor,
        feedback_enabled: draft.feedbackEnabled,
        links: JSON.stringify(draft.links), remove_logo: removeLogo, remove_cover_image: removeCover,
      }
      Object.entries(values).forEach(([key, value]) => body.append(key, String(value ?? '')))
      if (scheduleTouched) body.append('opening_schedule', JSON.stringify(completeSchedule(draft.venue.openingSchedule)))
      if (logoFile) body.append('logo', logoFile)
      if (coverFile) body.append('cover_image', coverFile)
      const saved = await apiFetch<Venue>(`/api/organizations/${organizationId}/venue/`, { method: 'POST', body })
      setDraft(structuredClone(saved)); setLogoFile(null); setCoverFile(null); setRemoveLogo(false); setRemoveCover(false); setScheduleTouched(false)
      setPhone(splitPhone(saved.venue.phone)); setWhatsapp(splitPhone(saved.venue.whatsapp))
      setStatus('saved'); setMessage('Business profile saved and published.')
      onSaved(saved)
    } catch (reason) {
      setStatus('error'); setMessage(displayError(reason))
    }
  }

  const preview = (
    <div className="business-profile-preview" style={{ '--preview-primary': draft.venue.primaryColor, '--preview-accent': draft.venue.secondaryColor } as CSSProperties}>
      <div className="business-profile-preview-cover" style={coverPreview ? { backgroundImage: `linear-gradient(0deg, ${draft.venue.primaryColor}cc, ${draft.venue.primaryColor}44), url(${coverPreview})` } : undefined}>
        {logoPreview ? <img src={logoPreview} alt="Current business logo preview" /> : <span>{draft.organization.name.slice(0, 2).toUpperCase()}</span>}
      </div>
      <div className="business-profile-preview-body">
        <small>Customer profile preview · unpublished changes</small>
        <h2>{draft.organization.name || 'Business name'}</h2>
        <p>{draft.venue.description || 'Your business description will appear here.'}</p>
        <div><button type="button">Home</button><button type="button">Menu</button></div>
        <dl>
          {draft.venue.address ? <><dt>Location</dt><dd>{draft.venue.address}</dd></> : null}
          {fullPhone(phone.country, phone.number) ? <><dt>Phone</dt><dd>{fullPhone(phone.country, phone.number)}</dd></> : null}
        </dl>
        <div className="business-profile-preview-links">{draft.links.filter((link) => link.is_active !== false).map((link, index) => <span key={link.id || index}>{link.label || link.link_type}</span>)}</div>
      </div>
    </div>
  )

  return (
    <form className="business-profile-editor" onSubmit={save}>
      {initial.sourceConflicts?.length ? <div className="manage-alert business-profile-conflict" role="status"><strong>Older Settings values differ</strong><span>The current public values are shown here for {initial.sourceConflicts.join(', ')}. Saving confirms these values and aligns the older copies.</span></div> : null}
      <div className="business-profile-toolbar">
        <nav aria-label="Business profile sections">
          {([['basic', 'Basic details'], ['contact', 'Contact & location'], ['links', 'Links'], ['appearance', 'Appearance']] as const).map(([key, label]) => <button type="button" className={tab === key ? 'is-active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)} key={key}>{label}</button>)}
        </nav>
        <button type="button" className="manage-button business-profile-mobile-preview" onClick={() => setMobilePreview(true)}><Eye size={15} /> Preview</button>
      </div>
      <div className="business-profile-layout">
        <section className="manage-card business-profile-form-card">
          {tab === 'basic' ? <>
            <header><h2>Basic details</h2><p>Introduce the business using the information customers should see.</p></header>
            <div className="form-grid">
              <Field label="Business name" wide><TextInput required value={draft.organization.name} onChange={(event) => updateOrganizationName(event.target.value)} /></Field>
              <Field label="Venue type"><SelectInput value={draft.venue.type} onChange={(event) => updateVenue('type', event.target.value)}><option value="hotel">Hotel</option><option value="cafe">Café</option><option value="restaurant">Restaurant</option><option value="bar">Bar</option><option value="other">Other</option></SelectInput></Field>
              <Field label="Description" wide hint={`${draft.venue.description.length}/1200 characters`}><TextArea maxLength={1200} value={draft.venue.description} onChange={(event) => updateVenue('description', event.target.value)} /></Field>
              <Field label="Business logo"><ImageAdjustInput key={removeLogo ? 'logo-removed' : 'logo'} label="Choose and crop logo" mode="logo" currentUrl={removeLogo ? '' : initial.venue.logo} onChange={(file) => { setLogoFile(file); setRemoveLogo(false); setStatus('idle') }} />{logoPreview ? <button type="button" className="business-profile-remove" onClick={() => { setLogoFile(null); setRemoveLogo(true); setStatus('idle') }}><Trash2 size={13} /> Remove logo</button> : null}</Field>
              <Field label="Cover image"><ImageAdjustInput key={removeCover ? 'cover-removed' : 'cover'} label="Choose and crop cover" mode="cover" currentUrl={removeCover ? '' : initial.venue.coverImage} onChange={(file) => { setCoverFile(file); setRemoveCover(false); setStatus('idle') }} />{coverPreview ? <button type="button" className="business-profile-remove" onClick={() => { setCoverFile(null); setRemoveCover(true); setStatus('idle') }}><Trash2 size={13} /> Remove cover</button> : null}</Field>
            </div>
          </> : null}
          {tab === 'contact' ? <>
            <header><h2>Contact & location</h2><p>Make it easy for customers to visit, call, message, or reserve.</p></header>
            <div className="form-grid">
              <Field label="Address" wide><TextArea value={draft.venue.address} onChange={(event) => updateVenue('address', event.target.value)} /></Field>
              <Field label="Google Maps / directions link" wide><TextInput type="url" value={draft.venue.mapUrl} onChange={(event) => updateVenue('mapUrl', event.target.value)} placeholder="https://maps.google.com/..." /></Field>
              <Field label="Phone"><div className="business-phone"><SelectInput aria-label="Phone country code" value={phone.country} onChange={(event) => setPhone({ ...phone, country: event.target.value })}>{countries.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</SelectInput><TextInput type="tel" value={phone.number} onChange={(event) => setPhone({ ...phone, number: event.target.value })} /></div></Field>
              <Field label="WhatsApp"><label className="business-inline-check"><input type="checkbox" checked={draft.venue.whatsappSameAsPhone} onChange={(event) => updateVenue('whatsappSameAsPhone', event.target.checked)} /> Same as phone</label>{!draft.venue.whatsappSameAsPhone ? <div className="business-phone"><SelectInput aria-label="WhatsApp country code" value={whatsapp.country} onChange={(event) => setWhatsapp({ ...whatsapp, country: event.target.value })}>{countries.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</SelectInput><TextInput type="tel" value={whatsapp.number} onChange={(event) => setWhatsapp({ ...whatsapp, number: event.target.value })} /></div> : null}</Field>
              <Field label="Email"><TextInput type="email" value={draft.venue.email} onChange={(event) => updateVenue('email', event.target.value)} /></Field>
              <Field label="Website"><TextInput type="url" value={draft.venue.website} onChange={(event) => updateVenue('website', event.target.value)} /></Field>
              <Field label="Reservation link"><TextInput type="url" value={draft.venue.reservationUrl} onChange={(event) => updateVenue('reservationUrl', event.target.value)} /></Field>
            </div>
            <div className="business-hours"><header><h3>Opening hours</h3><p>Mark closed days or add separate intervals, such as lunch and dinner.</p>{!Object.keys(draft.venue.openingSchedule || {}).length && draft.venue.openingHours ? <small>Your previous free-text hours are still public and will remain unchanged until you edit this schedule.</small> : null}</header>{days.map(([key, label]) => { const day = completeSchedule(draft.venue.openingSchedule)[key]; return <div className="business-hours-row" key={key}><strong>{label}</strong><label><input type="checkbox" checked={day.closed} onChange={(event) => updateDay(key, { closed: event.target.checked, intervals: event.target.checked ? [] : (day.intervals.length ? day.intervals : [{ start: '09:00', end: '17:00' }]) })} /> Closed</label><div>{!day.closed ? day.intervals.map((interval, index) => <span key={index}><input aria-label={`${label} opening time ${index + 1}`} type="time" value={interval.start} onChange={(event) => updateDay(key, { ...day, intervals: day.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) })} /><em>to</em><input aria-label={`${label} closing time ${index + 1}`} type="time" value={interval.end} onChange={(event) => updateDay(key, { ...day, intervals: day.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) })} /><button type="button" aria-label={`Remove ${label} interval ${index + 1}`} onClick={() => updateDay(key, { ...day, intervals: day.intervals.filter((_, itemIndex) => itemIndex !== index) })}><X size={14} /></button></span>) : null}{!day.closed && day.intervals.length < 4 ? <button type="button" className="business-add-interval" onClick={() => updateDay(key, { ...day, intervals: [...day.intervals, { start: '18:00', end: '22:00' }] })}><Plus size={13} /> Add interval</button> : null}</div></div> })}</div>
          </> : null}
          {tab === 'links' ? <>
            <header><h2>Links</h2><p>Order and control the links shown to customers.</p></header>
            <div className="form-grid"><Field label="Google review link" wide hint="This records button clicks, not reviews posted on Google."><TextInput type="url" value={draft.venue.googleReviewUrl} onChange={(event) => updateVenue('googleReviewUrl', event.target.value)} /></Field></div>
            <div className="business-social-list">{draft.links.map((link, index) => <article key={link.id || `new-${index}`}><div><SelectInput aria-label={`Social network ${index + 1}`} value={link.link_type} onChange={(event) => updateLink(index, { link_type: event.target.value, label: event.target.options[event.target.selectedIndex].text })}><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="linkedin">LinkedIn</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="tripadvisor">Tripadvisor</option><option value="x">X</option><option value="website">Other link</option></SelectInput><TextInput aria-label={`${link.label} URL`} type="url" required value={link.value} onChange={(event) => updateLink(index, { value: event.target.value })} placeholder="https://..." /></div>{link.legacy ? <small>Imported from the previous Settings field. Save to consolidate it.</small> : null}<div className="business-social-actions"><button type="button" disabled={index === 0} aria-label={`Move ${link.label} up`} onClick={() => moveLink(index, -1)}><ArrowUp size={14} /></button><button type="button" disabled={index === draft.links.length - 1} aria-label={`Move ${link.label} down`} onClick={() => moveLink(index, 1)}><ArrowDown size={14} /></button><button type="button" onClick={() => updateLink(index, { is_active: link.is_active === false })}>{link.is_active === false ? <EyeOff size={14} /> : <Eye size={14} />}{link.is_active === false ? 'Hidden' : 'Visible'}</button><button type="button" aria-label={`Remove ${link.label}`} onClick={() => setDraft((current) => ({ ...current, links: current.links.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={14} /></button></div></article>)}</div>
            <button type="button" className="manage-button" onClick={() => setDraft((current) => ({ ...current, links: [...current.links, { id: 0, link_type: 'instagram', label: 'Instagram', value: '', display_order: current.links.length, is_active: true }] }))}><Plus size={14} /> Add social link</button>
          </> : null}
          {tab === 'appearance' ? <>
            <header><h2>Appearance</h2><p>Choose accessible colours for the customer profile. Card design remains separate.</p></header>
            <div className="business-colours"><label><span>Primary colour</span><input type="color" value={draft.venue.primaryColor} onChange={(event) => updateVenue('primaryColor', event.target.value)} /><TextInput value={draft.venue.primaryColor} onChange={(event) => updateVenue('primaryColor', event.target.value)} pattern="#[0-9a-fA-F]{6}" /></label><label><span>Accent colour</span><input type="color" value={draft.venue.secondaryColor} onChange={(event) => updateVenue('secondaryColor', event.target.value)} /><TextInput value={draft.venue.secondaryColor} onChange={(event) => updateVenue('secondaryColor', event.target.value)} pattern="#[0-9a-fA-F]{6}" /></label></div>
          </> : null}
        </section>
        <aside className="business-profile-preview-panel"><div><h2>Live preview</h2><p>Changes remain private until you save.</p></div>{preview}</aside>
      </div>
      <footer className={`business-profile-savebar is-${status}`}><div><strong>{status === 'saving' ? 'Saving changes…' : status === 'error' ? 'Could not save' : changed ? 'Unsaved changes' : status === 'saved' ? 'Saved' : 'Everything is up to date'}</strong>{message && !changed ? <span role={status === 'error' ? 'alert' : 'status'}>{message}</span> : changed ? <span>Select Save profile to publish these changes.</span> : null}</div><button type="submit" className="manage-button is-primary" disabled={!changed || status === 'saving'}><Save size={14} />{status === 'saving' ? 'Saving…' : 'Save profile'}</button></footer>
      {mobilePreview ? <div className="business-profile-preview-modal" role="dialog" aria-modal="true" aria-label="Customer profile preview"><button type="button" aria-label="Close preview" onClick={() => setMobilePreview(false)}><X /></button>{preview}</div> : null}
    </form>
  )
}

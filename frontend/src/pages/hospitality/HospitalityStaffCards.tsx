import { useCallback, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import Contact from 'lucide-react/dist/esm/icons/contact.js'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import LinkIcon from 'lucide-react/dist/esm/icons/link.js'
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Settings from 'lucide-react/dist/esm/icons/settings.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { Field, SelectInput, TextArea, TextInput } from '../../components/manage/FormControls'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityStaffCards.css'

type StaffLink = { id?: number; link_type: string; label: string; value: string; display_order?: number; is_active?: boolean }
type AssignedCard = { assignmentId: number; cardId: number; label: string; isActive: boolean; nfcUrl: string }
type Staff = { id: number; publicIdentifier: string; name: string; position: string; bio: string; photo: string | null; isActive: boolean; displayOrder: number; links: StaffLink[]; publicUrl: string; assignedCard: AssignedCard | null }
type Touchpoint = { id: number; publicIdentifier: string; name: string; destination: string; isActive: boolean; qrUrl: string; assignedCard: AssignedCard | null }
type Payload = { staff: Staff[]; touchpoints: Touchpoint[]; availableCards: Array<{ id: number; label: string; status: string }>; summary: { staff: number; active: number; assigned: number } }
type Draft = { id?: number; name: string; position: string; bio: string; is_active: boolean; links: StaffLink[]; photo: File | null }

const blankDraft: Draft = { name: '', position: '', bio: '', is_active: false, links: [], photo: null }
const linkLabels: Record<string, string> = { phone: 'Work phone', email: 'Work email', whatsapp: 'WhatsApp', website: 'Website', linkedin: 'LinkedIn', instagram: 'Instagram' }

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() }

function StaffPreview({ staff, organizationName, organizationId, logo }: { staff: Staff; organizationName: string; organizationId: number; logo?: string }) {
  return <aside className="hospitality-staff-preview" aria-label="Selected staff profile preview">
    <header><div><h2>Profile preview</h2><p>Public digital profile</p></div><a href={staff.publicUrl} target="_blank" rel="noreferrer"><Eye size={15} /> Open</a></header>
    <div className="hospitality-staff-card-preview">
      <div className="hospitality-staff-brand">{logo ? <img src={logo} alt="" /> : <span>{initials(organizationName)}</span>}<div><strong>{organizationName}</strong><small>Staff profile</small></div></div>
      {staff.photo ? <img className="hospitality-staff-portrait" src={staff.photo} alt="" /> : <div className="hospitality-staff-portrait is-placeholder">{initials(staff.name)}</div>}
      <div className="hospitality-staff-preview-copy"><h3>{staff.name}</h3><p className="hospitality-staff-role">{staff.position || 'Team member'}</p><p>{staff.bio || 'No public bio added yet.'}</p>
        <div className="hospitality-staff-contact-preview">{staff.links.filter((link) => link.is_active !== false).map((link) => <span key={`${link.link_type}-${link.value}`}><LinkIcon size={13} />{link.label}</span>)}</div>
      </div>
    </div>
    <p className="hospitality-access-note"><Settings size={16} /> Dashboard access is managed separately in <a href={`/dashboard/organizations/${organizationId}/settings/`}>Settings → Team access</a>.</p>
  </aside>
}

function QrPanel({ touchpoint, onClose }: { touchpoint: Touchpoint; onClose: () => void }) {
  const [image, setImage] = useState('')
  useEffect(() => { void QRCode.toDataURL(touchpoint.qrUrl, { width: 280, margin: 2, color: { dark: '#102644', light: '#ffffff' } }).then(setImage) }, [touchpoint.qrUrl])
  return <div className="hospitality-staff-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="touchpoint-qr-title">
    <button type="button" onClick={onClose} aria-label="Close"><X size={19} /></button><h2 id="touchpoint-qr-title">{touchpoint.name} QR code</h2><p>Destination: {touchpoint.destination}. The source identifier is preserved for analytics.</p>
    {image ? <img src={image} alt={`QR code for ${touchpoint.name}`} /> : <div className="hospitality-qr-loading">Preparing QR…</div>}
    <label>Tracked destination<input readOnly value={touchpoint.qrUrl} onFocus={(event) => event.currentTarget.select()} /></label>
    <a className="manage-button is-primary" href={image || undefined} download={`${touchpoint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`}>Download QR</a>
  </section></div>
}

export function HospitalityStaffCards({ organizationId, organizationName, logo }: { organizationId: number; organizationName: string; logo?: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [tab, setTab] = useState<'staff' | 'cards'>('staff')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [touchpoint, setTouchpoint] = useState({ name: '', destination: 'profile' })
  const [qr, setQr] = useState<Touchpoint | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const payload = await apiFetch<Payload>(`/api/organizations/${organizationId}/venue/staff-cards/`)
      setData(payload); setSelectedId((current) => current && payload.staff.some((item) => item.id === current) ? current : payload.staff[0]?.id ?? null)
    } catch (reason) { setError(displayError(reason)) }
  }, [organizationId])
  useEffect(() => { void load() }, [load])

  const selected = data?.staff.find((item) => item.id === selectedId) || null
  const filtered = useMemo(() => (data?.staff || []).filter((item) => {
    const match = `${item.name} ${item.position}`.toLowerCase().includes(query.trim().toLowerCase())
    return match && (status === 'all' || (status === 'active' ? item.isActive : !item.isActive))
  }), [data, query, status])

  function editStaff(staff?: Staff) {
    setDraft(staff ? { id: staff.id, name: staff.name, position: staff.position, bio: staff.bio, is_active: staff.isActive, links: staff.links.map((link) => ({ ...link })), photo: null } : { ...blankDraft, links: [] })
    setDrawer(true); setError('')
  }
  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const body = new FormData(); body.append('action', draft.id ? 'update_staff' : 'create_staff')
      if (draft.id) body.append('id', String(draft.id))
      body.append('name', draft.name); body.append('position', draft.position); body.append('bio', draft.bio); body.append('is_active', String(draft.is_active)); body.append('links', JSON.stringify(draft.links))
      if (draft.photo) body.append('photo', draft.photo)
      await apiFetch(`/api/organizations/${organizationId}/venue/staff-cards/`, { method: 'POST', body })
      setDrawer(false); await load()
    } catch (reason) { setError(displayError(reason)) } finally { setSaving(false) }
  }
  async function setActive(staff: Staff) {
    try { await apiFetch(`/api/organizations/${organizationId}/venue/staff-cards/`, { method: 'PATCH', body: jsonBody({ action: 'update_staff', id: staff.id, is_active: !staff.isActive }) }); await load() }
    catch (reason) { setError(displayError(reason)) }
  }
  async function assignCard(targetType: 'staff' | 'touchpoint', targetId: number, cardId: number) {
    if (!cardId) return
    try { await apiFetch(`/api/organizations/${organizationId}/venue/staff-cards/`, { method: 'POST', body: jsonBody({ action: 'assign_card', target_type: targetType, target_id: targetId, card_id: cardId }) }); await load() }
    catch (reason) { setError(displayError(reason)) }
  }
  async function unassign(assignmentId: number) {
    try { await apiFetch(`/api/organizations/${organizationId}/venue/staff-cards/`, { method: 'DELETE', body: jsonBody({ assignment_id: assignmentId }) }); await load() }
    catch (reason) { setError(displayError(reason)) }
  }
  async function createTouchpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try { await apiFetch(`/api/organizations/${organizationId}/venue/staff-cards/`, { method: 'POST', body: jsonBody({ action: 'create_touchpoint', ...touchpoint }) }); setTouchpoint({ name: '', destination: 'profile' }); await load() }
    catch (reason) { setError(displayError(reason)) }
  }

  if (!data) return <div className="manage-state">{error || 'Loading staff and cards…'}</div>
  return <div className="hospitality-staff-page">
    {error ? <div className="manage-alert" role="alert">{error}</div> : null}
    <div className="hospitality-staff-summary">
      <article><span className="is-blue"><UserRound size={20} /></span><div><strong>{data.summary.staff}</strong><p>Staff profiles</p></div></article>
      <article><span className="is-green"><BadgeCheck size={20} /></span><div><strong>{data.summary.active}</strong><p>Active profiles</p></div></article>
      <article><span className="is-violet"><CreditCard size={20} /></span><div><strong>{data.summary.assigned}</strong><p>Assigned cards</p></div></article>
      <button className="manage-button is-primary" type="button" onClick={() => editStaff()}><Plus size={16} /> Add staff profile</button>
    </div>
    <div className="hospitality-staff-tabs" role="tablist"><button type="button" className={tab === 'staff' ? 'is-active' : ''} onClick={() => setTab('staff')}>Staff profiles</button><button type="button" className={tab === 'cards' ? 'is-active' : ''} onClick={() => setTab('cards')}>NFC & QR touchpoints</button></div>
    {tab === 'staff' ? <div className={`hospitality-staff-layout${selected ? '' : ' no-preview'}`}>
      <section className="hospitality-staff-table-card">
        <div className="hospitality-staff-toolbar"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff by name or position…" /></label><SelectInput aria-label="Profile status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Draft / inactive</option></SelectInput></div>
        <div className="hospitality-staff-table-head"><span>Name</span><span>Position</span><span>Status</span><span>Assigned card</span><span>Actions</span></div>
        {filtered.map((staff) => <article className={`hospitality-staff-row${selectedId === staff.id ? ' is-selected' : ''}`} key={staff.id} onClick={() => setSelectedId(staff.id)}>
          <div className="hospitality-staff-person">{staff.photo ? <img src={staff.photo} alt="" /> : <span>{initials(staff.name)}</span>}<strong>{staff.name}</strong></div><span>{staff.position || '—'}</span><span className={`hospitality-profile-status${staff.isActive ? ' is-active' : ''}`}>{staff.isActive ? 'Active' : 'Draft'}</span><span>{staff.assignedCard?.label || 'Not assigned'}</span>
          <div className="hospitality-staff-actions"><button type="button" onClick={(event) => { event.stopPropagation(); editStaff(staff) }}>Edit</button><a href={staff.publicUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><Eye size={14} /> Preview</a><button type="button" title={staff.isActive ? 'Deactivate profile and card' : 'Activate profile'} onClick={(event) => { event.stopPropagation(); void setActive(staff) }}><MoreHorizontal size={16} /></button></div>
          <div className="hospitality-card-assignment" onClick={(event) => event.stopPropagation()}>{staff.assignedCard ? <button type="button" onClick={() => void unassign(staff.assignedCard!.assignmentId)}>Unassign {staff.assignedCard.label}</button> : data.availableCards.length ? <SelectInput aria-label={`Assign a card to ${staff.name}`} value="" onChange={(event) => void assignCard('staff', staff.id, Number(event.target.value))}><option value="">Assign card…</option>{data.availableCards.map((card) => <option key={card.id} value={card.id}>{card.label}</option>)}</SelectInput> : null}</div>
        </article>)}
        {!filtered.length ? <div className="hospitality-staff-empty"><Contact size={24} /><strong>No staff profiles found</strong><p>Add a public staff profile or change the search filters.</p></div> : null}
      </section>
      {selected ? <StaffPreview staff={selected} organizationName={organizationName} organizationId={organizationId} logo={logo} /> : null}
    </div> : <div className="hospitality-touchpoint-layout">
      <section className="hospitality-touchpoint-card"><header><div><h2>Named business touchpoints</h2><p>Create a tracked destination for a table, reception desk, or review stand.</p></div></header>
        <form className="hospitality-touchpoint-create" onSubmit={(event) => void createTouchpoint(event)}><Field label="Touchpoint name"><TextInput required value={touchpoint.name} onChange={(event) => setTouchpoint({ ...touchpoint, name: event.target.value })} placeholder="e.g. Table 4" /></Field><Field label="Public destination"><SelectInput value={touchpoint.destination} onChange={(event) => setTouchpoint({ ...touchpoint, destination: event.target.value })}><option value="profile">Business profile</option><option value="menu">Menu</option><option value="feedback">Feedback form</option></SelectInput></Field><button className="manage-button is-primary"><Plus size={15} /> Create touchpoint</button></form>
        <div className="hospitality-touchpoint-list">{data.touchpoints.map((item) => <article key={item.id}><span className="hospitality-touchpoint-icon"><QrCode size={18} /></span><div><strong>{item.name}</strong><p>{item.destination} · source {item.publicIdentifier.slice(0, 8)}…</p></div><span>{item.assignedCard?.label || 'QR only'}</span><button type="button" onClick={() => setQr(item)}><QrCode size={14} /> QR</button>{item.assignedCard ? <button type="button" onClick={() => void unassign(item.assignedCard!.assignmentId)}>Unassign</button> : data.availableCards.length ? <SelectInput aria-label={`Assign NFC card to ${item.name}`} value="" onChange={(event) => void assignCard('touchpoint', item.id, Number(event.target.value))}><option value="">Assign NFC…</option>{data.availableCards.map((card) => <option key={card.id} value={card.id}>{card.label}</option>)}</SelectInput> : null}</article>)}</div>
        {!data.touchpoints.length ? <div className="hospitality-staff-empty"><QrCode size={24} /><strong>No touchpoints yet</strong><p>Create Table 4, Reception, Review stand, or another named source.</p></div> : null}
      </section>
      <aside className="hospitality-card-policy"><CreditCard size={22} /><h2>Card lifecycle</h2><p>Only cards allocated to this organization can be assigned. Deactivating a profile also deactivates its NFC destination.</p><p>An inactive card opens an organization-branded unavailable message; it never exposes the former staff contact details.</p><p>QR and NFC are distinguished only by the separately tagged links generated here.</p></aside>
    </div>}
    {drawer ? <><button className="hospitality-staff-drawer-backdrop" type="button" aria-label="Close staff editor" onClick={() => setDrawer(false)} /><aside className="hospitality-staff-drawer" aria-label={draft.id ? 'Edit staff profile' : 'Add staff profile'}><header><div><h2>{draft.id ? 'Edit staff profile' : 'Add staff profile'}</h2><p>This creates a public profile only. It does not grant dashboard access.</p></div><button type="button" onClick={() => setDrawer(false)} aria-label="Close"><X size={20} /></button></header><form onSubmit={(event) => void saveStaff(event)}><div className="hospitality-staff-fields"><Field label="Full name"><TextInput required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field><Field label="Position"><TextInput value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} placeholder="Manager, Barista, Chef…" /></Field><Field label="Short bio"><TextArea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} maxLength={1000} /></Field><Field label="Profile photo"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDraft({ ...draft, photo: event.target.files?.[0] || null })} /></Field>
          <div className="hospitality-staff-links"><header><div><strong>Approved public contact links</strong><small>Only business-safe contact channels are supported.</small></div><button type="button" onClick={() => setDraft({ ...draft, links: [...draft.links, { link_type: 'phone', label: 'Work phone', value: '', is_active: true }] })}><Plus size={14} /> Add link</button></header>{draft.links.map((link, index) => <div key={index}><SelectInput aria-label="Contact type" value={link.link_type} onChange={(event) => { const links = [...draft.links]; links[index] = { ...link, link_type: event.target.value, label: linkLabels[event.target.value] }; setDraft({ ...draft, links }) }}>{Object.entries(linkLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput><TextInput aria-label="Public contact value" required value={link.value} onChange={(event) => { const links = [...draft.links]; links[index] = { ...link, value: event.target.value }; setDraft({ ...draft, links }) }} /><button type="button" aria-label="Remove contact link" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button></div>)}</div>
          <label className="hospitality-staff-active"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} /><span><strong>Active public profile</strong><small>Inactive profiles show an unavailable message and hide contact details.</small></span></label>
        </div><footer><button className="manage-button" type="button" onClick={() => setDrawer(false)}>Cancel</button><button className="manage-button is-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></footer></form></aside></> : null}
    {qr ? <QrPanel touchpoint={qr} onClose={() => setQr(null)} /> : null}
  </div>
}

type PublicStaffPayload = { organization: { name: string; logo: string | null; publicIdentifier: string }; branding: { primaryColor: string; secondaryColor: string; coverImage: string | null }; staff: Partial<Staff> & { name: string; isActive: boolean } }
export function PublicHospitalityStaffProfile() {
  const match = window.location.pathname.match(/^\/venue\/([^/]+)\/staff\/([^/]+)/)
  const venueIdentifier = match?.[1] || ''
  const staffIdentifier = match?.[2] || ''
  const [data, setData] = useState<PublicStaffPayload | null>(null)
  useEffect(() => { if (venueIdentifier && staffIdentifier) void apiFetch<PublicStaffPayload>(`/api/venue/${venueIdentifier}/staff/${staffIdentifier}/`).then(setData).catch(() => setData(null)) }, [staffIdentifier, venueIdentifier])
  if (!data) return <main className="hospitality-public-state">Loading staff profile…</main>
  if (!data.staff.isActive) return <main className="hospitality-inactive-card"><section>{data.organization.logo ? <img src={data.organization.logo} alt="" /> : null}<h1>{data.organization.name}</h1><h2>This staff profile is inactive</h2><p>Contact the business for current staff information.</p><a href={`/venue/${data.organization.publicIdentifier}/`}>View business profile</a></section></main>
  return <main className="hospitality-public-staff" style={{ '--staff-primary': data.branding.primaryColor } as React.CSSProperties}><header style={data.branding.coverImage ? { backgroundImage: `linear-gradient(#102644bb,#102644bb),url(${data.branding.coverImage})` } : undefined}>{data.organization.logo ? <img src={data.organization.logo} alt="" /> : null}<strong>{data.organization.name}</strong></header><section>{data.staff.photo ? <img src={data.staff.photo} alt="" /> : <div>{initials(data.staff.name)}</div>}<h1>{data.staff.name}</h1><p className="hospitality-public-staff-role">{data.staff.position}</p><p>{data.staff.bio}</p><div>{data.staff.links?.map((link) => { const href = link.link_type === 'email' ? `mailto:${link.value}` : link.link_type === 'phone' ? `tel:${link.value}` : link.link_type === 'whatsapp' ? `https://wa.me/${link.value.replace(/\D/g, '')}` : link.value; return <a key={link.id || link.value} href={href} target="_blank" rel="noreferrer">{link.label}</a> })}</div></section></main>
}

export function PublicVenueCard() {
  const identifier = window.location.pathname.match(/^\/venue\/card\/([^/]+)/)?.[1] || ''
  const [state, setState] = useState<{ active: boolean; destination: string; label: string; organization: { name: string; logo: string | null }; message: string } | null>(null)
  useEffect(() => { void apiFetch<typeof state>(`/api/venue/card/${identifier}/`).then((result) => { if (result?.active) window.location.replace(result.destination); else setState(result) }).catch(() => setState({ active: false, destination: '', label: '', organization: { name: 'Tap2Connect', logo: null }, message: 'This card is not assigned or is no longer available.' })) }, [identifier])
  return <main className="hospitality-inactive-card"><section>{state?.organization.logo ? <img src={state.organization.logo} alt="" /> : <CreditCard size={34} />}<h1>{state?.organization.name || 'Checking card…'}</h1><h2>{state ? 'Card inactive' : 'Opening profile…'}</h2><p>{state?.message || 'Please wait while we verify this card.'}</p></section></main>
}

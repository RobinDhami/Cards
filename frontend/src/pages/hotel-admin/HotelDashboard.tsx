import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js'
import Hotel from 'lucide-react/dist/esm/icons/hotel.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import { platformNavigation } from '../../components/manage/platformNavigation'
import './HotelDashboard.css'

type HotelSummary = { id: number; name: string; slug: string; currency: string; isActive: boolean; createdAt: string; roomCount: number; touchpointCount: number; membershipCount: number; guestUrl: string; menuMode: string; serviceMode: string; guestAccessEnabled: boolean; templateIdentifier: string; primaryColor: string; backgroundColor: string; package: string }
type HotelDetail = { hotel: HotelSummary; rooms: Array<{ id: number; identifier: string; floor: string; room_type: string; is_active: boolean }>; touchpoints: Array<{ label: string; publicIdentifier: string; type: string; room: string; isActive: boolean; guestUrl: string }> }
type HotelMetrics = { totalHotels: number; activeHotels: number; inactiveHotels: number; digitalGuideHotels: number; smartGuestHotels: number; totalRooms: number; totalTouchpoints: number }

function Stat({ icon: Icon, label, value }: { icon: typeof Hotel; label: string; value: number }) { return <div className="hotel-admin-stat"><Icon size={18} /><span><small>{label}</small><strong>{value}</strong></span></div> }

function HotelCard({ hotel }: { hotel: HotelSummary }) {
  return <a className="hotel-admin-card" href={`/dashboard/hotels/${hotel.id}/`}><div className="hotel-admin-card__heading"><span className="hotel-admin-card__icon"><Hotel size={21} /></span><span><strong>{hotel.name}</strong><small>{hotel.slug} · {hotel.currency}</small></span><i className={hotel.isActive ? 'is-active' : ''}>{hotel.isActive ? 'Active' : 'Inactive'}</i></div><div className="hotel-admin-card__stats"><Stat icon={MapPin} label="Rooms" value={hotel.roomCount} /><Stat icon={QrCode} label="Touchpoints" value={hotel.touchpointCount} /><Stat icon={Users} label="Staff" value={hotel.membershipCount} /></div><div className="hotel-admin-card__footer"><span>{hotel.package === 'smart_guest' ? 'Smart Guest' : 'Digital Guide'} · {hotel.menuMode} menu</span>{hotel.guestUrl && <span>Guest link ready <ExternalLink size={13} /></span>}</div></a>
}

export function HotelDashboard() {
  const hotelMatch = window.location.pathname.match(/^\/dashboard\/hotels\/(\d+)/)
  const hotelId = hotelMatch?.[1]
  const [state, setState] = useState<{ loading: boolean; hotels: HotelSummary[]; metrics?: HotelMetrics; detail?: HotelDetail; error?: string }>({ loading: true, hotels: [] })
  const [form, setForm] = useState({ name: '', slug: '', currency: 'USD', template_identifier: 'aurora', primary_color: '#C9A84C' })
  const [touchpointLabel, setTouchpointLabel] = useState('')
  const [roomForm, setRoomForm] = useState({ identifier: '', floor: '', roomType: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const endpoint = hotelId ? `/api/dashboard/hotels/${hotelId}/` : '/api/dashboard/hotels/'
    let active = true
    apiFetch<{ hotels?: HotelSummary[]; metrics?: HotelMetrics; hotel?: HotelSummary; rooms?: HotelDetail['rooms']; touchpoints?: HotelDetail['touchpoints'] }>(endpoint)
      .then((payload) => { if (active) { setState({ loading: false, hotels: payload.hotels ?? [], metrics: payload.metrics, detail: payload.hotel ? { hotel: payload.hotel, rooms: payload.rooms ?? [], touchpoints: payload.touchpoints ?? [] } : undefined }); if (payload.hotel) setForm({ name: payload.hotel.name, slug: payload.hotel.slug, currency: payload.hotel.currency, template_identifier: payload.hotel.templateIdentifier, primary_color: payload.hotel.primaryColor }) } })
      .catch((error: unknown) => { if (active) setState({ loading: false, hotels: [], error: displayError(error) }) })
    return () => { active = false }
  }, [hotelId])

  const title = state.detail ? state.detail.hotel.name : 'Hotels'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [packageFilter, setPackageFilter] = useState('all')
  const filteredHotels = state.hotels.filter((hotel) => (!search || `${hotel.name} ${hotel.slug}`.toLowerCase().includes(search.toLowerCase())) && (statusFilter === 'all' || (statusFilter === 'active' ? hotel.isActive : !hotel.isActive)) && (packageFilter === 'all' || hotel.package === packageFilter))
  async function createHotel(event: FormEvent) {
    event.preventDefault(); setSaving(true); setNotice('')
    try { await apiFetch('/api/dashboard/hotels/', { method: 'POST', body: jsonBody({ name: form.name, slug: form.slug, currency: form.currency }) }); window.location.reload() } catch (error) { setNotice(displayError(error)) } finally { setSaving(false) }
  }

  async function saveTheme(event: FormEvent) {
    event.preventDefault(); if (!state.detail) return; setSaving(true); setNotice('')
    try { await apiFetch(`/api/dashboard/hotels/${state.detail.hotel.id}/`, { method: 'PATCH', body: jsonBody(form) }); setNotice('Hotel template settings saved.'); window.location.reload() } catch (error) { setNotice(displayError(error)) } finally { setSaving(false) }
  }

  async function createTouchpoint(event: FormEvent) {
    event.preventDefault(); if (!state.detail || !touchpointLabel.trim()) return; setSaving(true); setNotice('')
    try { await apiFetch(`/api/dashboard/hotels/${state.detail.hotel.id}/touchpoints/`, { method: 'POST', body: jsonBody({ label: touchpointLabel }) }); setTouchpointLabel(''); setNotice('NFC guest link created.'); window.location.reload() } catch (error) { setNotice(displayError(error)) } finally { setSaving(false) }
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault(); if (!state.detail || !roomForm.identifier.trim()) return; setSaving(true); setNotice('')
    try { await apiFetch(`/api/dashboard/hotels/${state.detail.hotel.id}/rooms/`, { method: 'POST', body: jsonBody(roomForm) }); setRoomForm({ identifier: '', floor: '', roomType: '' }); setNotice('Room created.'); window.location.reload() } catch (error) { setNotice(displayError(error)) } finally { setSaving(false) }
  }

  return <ManageShell brand="Tap2Connect" brandDetail="Hotel administration" logo={brandLogo} nav={platformNavigation(['overview', 'organizations', 'hotels', 'professionals', 'templates', 'cards', 'card_operations', 'activity', 'reports', 'settings'])} title={title} subtitle={state.detail ? 'Hotel configuration, guest touchpoints, and operations' : 'Manage hotel accounts, guest experiences, and NFC touchpoints'} userName="" userRole="Super Admin">
    <main className="hotel-admin-page">
      {state.loading && <div className="hotel-admin-state">Loading hotel data…</div>}
      {state.error && <div className="hotel-admin-state is-error">{state.error}</div>}
      {!state.loading && !state.error && !state.detail && <><div className="hotel-admin-toolbar"><div><p className="hotel-admin-eyebrow">Platform inventory</p><h2>{state.hotels.length} hotel{state.hotels.length === 1 ? '' : 's'}</h2><p>Hotels provisioned for the Tap2Connect guest experience.</p></div></div>{state.metrics && <div className="hotel-admin-metrics">{[['Hotels', state.metrics.totalHotels], ['Active', state.metrics.activeHotels], ['Inactive', state.metrics.inactiveHotels], ['Digital Guide', state.metrics.digitalGuideHotels], ['Smart Guest', state.metrics.smartGuestHotels], ['Rooms', state.metrics.totalRooms], ['Touchpoints', state.metrics.totalTouchpoints]].map(([label, value]) => <div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>}<form className="hotel-admin-create" onSubmit={createHotel}><strong>Create hotel</strong><input aria-label="Hotel name" placeholder="Hotel name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input aria-label="Hotel slug" placeholder="slug (optional)" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /><button type="submit" disabled={saving}><Plus size={15} /> {saving ? 'Creating…' : 'Create hotel'}</button></form><div className="hotel-admin-filters"><input aria-label="Search hotels" placeholder="Search hotels" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Hotel status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><select aria-label="Hotel package" value={packageFilter} onChange={(event) => setPackageFilter(event.target.value)}><option value="all">All packages</option><option value="digital_guide">Digital Guide</option><option value="smart_guest">Smart Guest</option></select></div>{notice && <p className="hotel-admin-notice">{notice}</p>}<div className="hotel-admin-grid">{filteredHotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)}{!filteredHotels.length && <div className="hotel-admin-empty">No hotels match the current filters.</div>}</div></>}
      {!state.loading && !state.error && state.detail && <><a className="hotel-admin-back" href="/dashboard/hotels/"><ArrowLeft size={16} /> All hotels</a><div className="hotel-admin-summary"><HotelCard hotel={state.detail.hotel} /></div><section className="hotel-admin-section"><div><p className="hotel-admin-eyebrow">Guest experience</p><h2>Template settings</h2><p>Choose the template and accent used by this hotel’s guest experience.</p></div><form className="hotel-admin-theme-form" onSubmit={saveTheme}><label>Template<input value={form.template_identifier} onChange={(event) => setForm({ ...form, template_identifier: event.target.value })} /></label><label>Accent colour<input value={form.primary_color} onChange={(event) => setForm({ ...form, primary_color: event.target.value })} /></label><button type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save template'}</button></form>{notice && <p className="hotel-admin-notice">{notice}</p>}</section><section className="hotel-admin-section"><div><p className="hotel-admin-eyebrow">Guest touchpoints</p><h2>NFC links</h2><p>Each active touchpoint resolves to a hotel guest experience.</p></div><form className="hotel-admin-create" onSubmit={createTouchpoint}><input aria-label="NFC touchpoint label" placeholder="Touchpoint label" value={touchpointLabel} onChange={(event) => setTouchpointLabel(event.target.value)} required /><button type="submit" disabled={saving}><Plus size={15} /> Create NFC link</button></form><div className="hotel-admin-touchpoints">{state.detail.touchpoints.map((touchpoint) => <div className="hotel-admin-touchpoint" key={touchpoint.publicIdentifier}><span><QrCode size={18} /><strong>{touchpoint.label}</strong><small>{touchpoint.room ? `Room ${touchpoint.room}` : touchpoint.type}</small></span><a href={touchpoint.guestUrl} target="_blank" rel="noreferrer">Open guest link <ExternalLink size={13} /></a></div>)}{!state.detail.touchpoints.length && <div className="hotel-admin-empty">No touchpoints configured.</div>}</div></section><section className="hotel-admin-section"><div><p className="hotel-admin-eyebrow">Rooms</p><h2>Rooms</h2><p>Create rooms before assigning room-specific NFC touchpoints.</p></div><form className="hotel-admin-create" onSubmit={createRoom}><input aria-label="Room identifier" placeholder="Room 101" value={roomForm.identifier} onChange={(event) => setRoomForm({ ...roomForm, identifier: event.target.value })} required /><input aria-label="Floor" placeholder="Floor" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} /><input aria-label="Room type" placeholder="Room type" value={roomForm.roomType} onChange={(event) => setRoomForm({ ...roomForm, roomType: event.target.value })} /><button type="submit" disabled={saving}><Plus size={15} /> Add room</button></form><div className="hotel-admin-room-list">{state.detail.rooms.map((room) => <div key={room.id}><span>{room.identifier}</span><small>{room.room_type || 'Room'} · Floor {room.floor || '—'}</small><i>{room.is_active ? 'Active' : 'Inactive'}</i></div>)}</div></section></>}
    </main>
  </ManageShell>
}

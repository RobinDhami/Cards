import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import { Field, FormSection, TextInput, TextArea } from '../../components/manage/FormControls'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityWorkspace.css'

type Venue = { organization: { id: number; name: string }; venue: { publicIdentifier: string; type: string; description: string; logo: string; coverImage: string; primaryColor: string; secondaryColor: string; phone: string; whatsapp: string; email: string; website: string; address: string; mapUrl: string; googleReviewUrl: string }; categories: Category[]; links: Link[]; rating: { average: number; count: number }; feedbackEnabled: boolean }
type Category = { id?: number; name: string; slug: string; display_order?: number; is_active?: boolean; items?: Item[] }
type Item = { id?: number; category_id?: number; name: string; description: string; price: string; original_price?: string; offer_label?: string; dietary_info?: string; is_vegetarian?: boolean; is_available?: boolean; is_today_special?: boolean; is_offer?: boolean; image?: string; display_order?: number }
type Link = { id: number; link_type: string; label: string; value: string }

function organizationId() { return Number(window.location.pathname.match(/organizations\/(\d+)/)?.[1] || 0) }

function VenueShell({ name, children }: { name: string; children: ReactNode }) {
  const id = organizationId()
  return <ManageShell brand={name || 'Hospitality'} brandDetail="Hospitality organization" logo={undefined} nav={[{ label: 'Organization settings', href: `/dashboard/organizations/${id}/settings/`, icon: Building2, active: false }, { label: 'Menu', href: `/dashboard/organizations/${id}/hospitality/`, icon: Plus, active: true }]} title="Menu" subtitle="Manage categories and menu items." userName="" userRole="Organization administrator">{children}</ManageShell>
}

export function HospitalityWorkspace() {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [error, setError] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [item, setItem] = useState<{ category_id: string; name: string; description: string; price: string; original_price: string; offer_label: string; is_offer: boolean; is_today_special: boolean; image: File | null }>({ category_id: '', name: '', description: '', price: '', original_price: '', offer_label: '', is_offer: false, is_today_special: false, image: null })
  const [activeTab] = useState<'home' | 'menu'>('menu')
  const id = organizationId()

  async function load() {
    try {
      const payload = await apiFetch<Venue>(`/api/organizations/${id}/venue/`)
      const categories = await apiFetch<{ categories: Category[] }>(`/api/organizations/${id}/venue/menu/categories/`)
      const items = await apiFetch<{ items: Item[] }>(`/api/organizations/${id}/venue/menu/items/`)
      const byCategory = new Map<number, Item[]>()
      items.items.forEach((entry) => { if (entry.category_id) byCategory.set(entry.category_id, [...(byCategory.get(entry.category_id) || []), entry]) })
      setVenue({ ...payload, categories: categories.categories.map((entry) => ({ ...entry, items: byCategory.get(entry.id || 0) || [] })) })
    } catch (reason) { setError(displayError(reason)) }
  }

  useEffect(() => { void load() }, [id])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!venue) return
    try {
      const response = await apiFetch<{ venue: Venue['venue'] }>(`/api/organizations/${id}/venue/`, { method: 'PATCH', body: jsonBody(venue.venue) })
      setVenue((current) => current ? { ...current, venue: response.venue } : current)
    } catch (reason) { setError(displayError(reason)) }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!categoryName.trim()) return
    await apiFetch(`/api/organizations/${id}/venue/menu/categories/`, { method: 'POST', body: jsonBody({ name: categoryName, slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }) })
    setCategoryName(''); await load()
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item.category_id || !item.name || !item.price) return
    const body = new FormData()
    Object.entries({ ...item, category_id: Number(item.category_id), image: undefined }).forEach(([key, value]) => { if (value !== undefined && value !== null) body.append(key, String(value)) })
    if (item.image) body.append('image', item.image)
    await apiFetch(`/api/organizations/${id}/venue/menu/items/`, { method: 'POST', body })
    setItem({ category_id: item.category_id, name: '', description: '', price: '', original_price: '', offer_label: '', is_offer: false, is_today_special: false, image: null }); await load()
  }

  if (!venue) return <div className="manage-state">{error || 'Loading hospitality profile…'}</div>
  return <VenueShell name={venue.organization.name}>
    {error ? <div className="manage-alert">{error}</div> : null}
    {activeTab === 'home' ? <section className="manage-card"><form onSubmit={saveProfile}><FormSection title="Home profile" description="Save the organization identity, contact details, social links, rating settings, and anonymous feedback configuration here."><div className="form-grid"><Field label="Venue type"><select value={venue.venue.type} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, type: e.target.value } })}><option value="hotel">Hotel</option><option value="cafe">Café</option><option value="restaurant">Restaurant</option><option value="bar">Bar</option><option value="other">Other</option></select></Field><Field label="Description" wide><TextArea value={venue.venue.description} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, description: e.target.value } })} /></Field><Field label="Phone"><TextInput value={venue.venue.phone} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, phone: e.target.value } })} /></Field><Field label="Email"><TextInput value={venue.venue.email} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, email: e.target.value } })} /></Field><Field label="Website"><TextInput value={venue.venue.website} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, website: e.target.value } })} /></Field><Field label="Address" wide><TextInput value={venue.venue.address} onChange={(e) => setVenue({ ...venue, venue: { ...venue.venue, address: e.target.value } })} /></Field></div></FormSection><div className="hospitality-profile-link"><span>Public Home profile</span><a href={`/venue/${venue.venue.publicIdentifier}/`} target="_blank" rel="noreferrer">Open digital profile</a></div><button className="manage-button is-primary"><Save size={14} />Save Home</button></form></section> : <div className="hospitality-layout"><section className="manage-card"><FormSection title="Menu categories"><form onSubmit={addCategory} className="hospitality-inline-form"><TextInput value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Breakfast, Rooms, Drinks…" /><button className="manage-button"><Plus size={14} />Add</button></form><div className="hospitality-category-list">{venue.categories.map((category) => <div key={category.id} className="hospitality-category"><strong>{category.name}</strong><small>{category.items?.length || 0} items</small></div>)}</div></FormSection></section><section className="manage-card"><FormSection title="Menu items, offers & today’s specials"><form onSubmit={addItem} className="form-grid"><Field label="Category"><select value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })}><option value="">Choose category</option>{venue.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Item name"><TextInput value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></Field><Field label="Picture"><input type="file" accept="image/*" onChange={(e) => setItem({ ...item, image: e.target.files?.[0] || null })} /></Field><Field label="Price"><TextInput value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} /></Field><Field label="Description" wide><TextArea value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></Field><button className="manage-button is-primary"><Plus size={14} />Add menu item</button></form></FormSection></section></div>}
  </VenueShell>
}

export function PublicHospitalityProfile() {
  const identifier = window.location.pathname.match(/^\/venue\/([^/]+)/)?.[1] || ''
  const [venue, setVenue] = useState<Venue | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'menu'>('home')
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' })
  const [feedbackMessage, setFeedbackMessage] = useState('')
  useEffect(() => { apiFetch<Venue>(`/api/venue/${identifier}/`).then(setVenue).catch(() => setVenue(null)) }, [identifier])
  if (!venue) return <main className="hospitality-public-state">Loading venue profile…</main>
  async function submitFeedback(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { await apiFetch(`/api/venue/${identifier}/feedback/`, { method: 'POST', body: jsonBody(feedback) }); setFeedbackMessage('Thank you for your feedback.'); setFeedback({ rating: 5, comment: '' }) } catch (reason) { setFeedbackMessage(displayError(reason)) } }
  return <main className="hospitality-public"><header style={{ background: venue.venue.primaryColor }}><h1>{venue.organization.name}</h1><p>{venue.venue.description}</p></header><nav className="hospitality-public-tabs"><button className={activeTab === 'home' ? 'is-active' : ''} onClick={() => setActiveTab('home')}>Home</button><button className={activeTab === 'menu' ? 'is-active' : ''} onClick={() => setActiveTab('menu')}>Menu</button></nav>{activeTab === 'home' ? <section><h2>Home</h2><p>{venue.venue.address}</p><p>{venue.venue.phone} · {venue.venue.email}</p><div className="hospitality-links">{venue.links.map((link) => <a href={link.value} key={link.id}>{link.label || link.link_type}</a>)}</div><p className="hospitality-rating">Rating: {venue.rating.average.toFixed(1)} / 5 ({venue.rating.count})</p>{venue.feedbackEnabled ? <form onSubmit={submitFeedback} className="hospitality-feedback"><h3>Leave anonymous feedback</h3><select value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: Number(e.target.value) })}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select><TextArea value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} placeholder="Your feedback" /><button className="manage-button is-primary">Send feedback</button>{feedbackMessage ? <small>{feedbackMessage}</small> : null}</form> : null}</section> : <section><h2>Menu</h2>{venue.categories.map((category) => <article key={category.id}><h3>{category.name}</h3>{category.items?.map((entry) => <div className="hospitality-menu-item" key={entry.id}>{entry.image ? <img className="hospitality-menu-image" src={entry.image} alt="" /> : null}<div><strong>{entry.name}</strong>{entry.is_offer ? <small className="hospitality-badge">{entry.offer_label || "Offer"}</small> : null}{entry.is_today_special ? <small className="hospitality-badge">Today’s special</small> : null}<p>{entry.description}</p></div><b>{entry.price}</b></div>)}</article>)}</section>}</main>
}

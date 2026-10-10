import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down.js'
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up.js'
import Copy from 'lucide-react/dist/esm/icons/copy.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Tag from 'lucide-react/dist/esm/icons/tag.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { Field, SelectInput, TextArea, TextInput } from '../../components/manage/FormControls'
import { ImageAdjustInput } from '../../components/manage/ImageAdjustInput'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityMenuManagement.css'

type Category = { id: number; name: string; slug: string; display_order: number; is_active: boolean }
type PriceVariant = { id?: number; label: string; price: string; display_order?: number }
type MenuItem = {
  id: number; category_id: number; name: string; description: string; price: string; original_price: string;
  offer_label: string; image: string; is_available: boolean; is_published: boolean; is_today_special: boolean;
  is_offer: boolean; display_order: number; special_starts_at: string; special_ends_at: string;
  offer_starts_at: string; offer_ends_at: string; price_variants: PriceVariant[]
}
type Draft = Omit<MenuItem, 'id' | 'image' | 'display_order'> & { id?: number; image: File | null; currentImage: string; removeImage: boolean }

const emptyDraft = (categoryId = 0): Draft => ({
  category_id: categoryId, name: '', description: '', price: '', original_price: '', offer_label: '',
  image: null, currentImage: '', removeImage: false, is_available: true, is_published: true,
  is_today_special: false, is_offer: false, special_starts_at: '', special_ends_at: '',
  offer_starts_at: '', offer_ends_at: '', price_variants: [],
})

function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function apiDateTime(value: string) {
  return value ? new Date(value).toISOString() : ''
}

function npr(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `NPR ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : value
}

function itemDraft(item: MenuItem): Draft {
  return {
    ...item, id: item.id, image: null, currentImage: item.image, removeImage: false,
    special_starts_at: localDateTime(item.special_starts_at), special_ends_at: localDateTime(item.special_ends_at),
    offer_starts_at: localDateTime(item.offer_starts_at), offer_ends_at: localDateTime(item.offer_ends_at),
  }
}

export function HospitalityMenuManagement({ organizationId, publicIdentifier }: { organizationId: number; publicIdentifier: string }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [publication, setPublication] = useState('all')
  const [attributeFilter, setAttributeFilter] = useState<'all' | 'special' | 'offer'>('all')
  const [selected, setSelected] = useState<number[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [moveTarget, setMoveTarget] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [categoryPayload, itemPayload] = await Promise.all([
        apiFetch<{ categories: Category[] }>(`/api/organizations/${organizationId}/venue/menu/categories/`),
        apiFetch<{ items: MenuItem[] }>(`/api/organizations/${organizationId}/venue/menu/items/`),
      ])
      setCategories(categoryPayload.categories)
      setItems(itemPayload.items)
    } catch (reason) { setError(displayError(reason)) } finally { setLoading(false) }
  }, [organizationId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (loading || new URLSearchParams(window.location.search).get('action') !== 'add-item') return
    setDraft(emptyDraft(categories[0]?.id))
    window.history.replaceState({}, '', `${window.location.pathname}?tab=menu`)
  }, [categories, loading])

  const counts = useMemo(() => {
    const result = new Map<number, number>()
    items.forEach((item) => result.set(item.category_id, (result.get(item.category_id) || 0) + 1))
    return result
  }, [items])
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category_id !== Number(categoryFilter)) return false
      if (availability === 'available' && !item.is_available) return false
      if (availability === 'sold-out' && item.is_available) return false
      if (publication === 'published' && !item.is_published) return false
      if (publication === 'unpublished' && item.is_published) return false
      if (attributeFilter === 'special' && !item.is_today_special) return false
      if (attributeFilter === 'offer' && !item.is_offer) return false
      return !normalized || item.name.toLowerCase().includes(normalized) || (categoryNames.get(item.category_id) || '').toLowerCase().includes(normalized)
    })
  }, [attributeFilter, availability, categoryFilter, categoryNames, items, publication, query])

  function validationMessage(value: Draft) {
    if (!value.name.trim()) return 'Item name is required.'
    if (!value.category_id) return 'Choose a category.'
    if (!(Number(value.price) > 0)) return 'Price must be greater than zero.'
    for (const variant of value.price_variants) {
      if (!variant.label.trim() || !(Number(variant.price) > 0)) return 'Every price variant needs a name and a price greater than zero.'
    }
    if (value.is_offer && value.original_price && Number(value.original_price) <= Number(value.price)) return 'Original price must be greater than the current price.'
    if (value.is_offer && !value.original_price && !value.offer_label.trim()) return 'Add an offer label or an original price.'
    if (value.special_starts_at && value.special_ends_at && value.special_starts_at >= value.special_ends_at) return 'Special end time must be after its start time.'
    if (value.offer_starts_at && value.offer_ends_at && value.offer_starts_at >= value.offer_ends_at) return 'Offer end time must be after its start time.'
    return ''
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const validation = validationMessage(draft)
    if (validation) { setError(validation); return }
    setSaving(true); setError(''); setNotice('')
    try {
      const body = new FormData()
      const fields = {
        id: draft.id, category_id: draft.category_id, name: draft.name.trim(), description: draft.description.trim(), price: draft.price,
        original_price: draft.original_price, offer_label: draft.offer_label.trim(), is_available: draft.is_available,
        is_published: draft.is_published, is_today_special: draft.is_today_special, is_offer: draft.is_offer,
        special_starts_at: apiDateTime(draft.special_starts_at), special_ends_at: apiDateTime(draft.special_ends_at),
        offer_starts_at: apiDateTime(draft.offer_starts_at), offer_ends_at: apiDateTime(draft.offer_ends_at),
        price_variants: JSON.stringify(draft.price_variants.map(({ label, price }) => ({ label: label.trim(), price }))),
        remove_image: draft.removeImage,
      }
      Object.entries(fields).forEach(([key, value]) => { if (value !== undefined) body.append(key, String(value ?? '')) })
      if (draft.image) body.append('image', draft.image)
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: draft.id ? 'PATCH' : 'POST', body })
      setDraft(null); setNotice(draft.id ? 'Menu item updated.' : 'Menu item created.'); await load()
    } catch (reason) { setError(displayError(reason)) } finally { setSaving(false) }
  }

  async function patchItem(id: number, values: Record<string, unknown>) {
    setError('')
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: 'PATCH', body: jsonBody({ id, ...values }) })
      await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function duplicateItem(id: number) {
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: 'POST', body: jsonBody({ action: 'duplicate', id }) })
      setNotice('A private copy was created.'); await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function removeItem(id: number) {
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: 'DELETE', body: jsonBody({ id }) })
      setSelected((current) => current.filter((itemId) => itemId !== id)); await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function moveItem(id: number, direction: -1 | 1) {
    const ordered = [...items].sort((a, b) => a.display_order - b.display_order || a.id - b.id)
    const index = ordered.findIndex((item) => item.id === id); const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: 'POST', body: jsonBody({ action: 'reorder', items: ordered.map((item) => ({ id: item.id })) }) })
      await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function bulkAvailability(isAvailable: boolean) {
    if (!selected.length) return
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/items/`, { method: 'POST', body: jsonBody({ action: 'bulk_availability', ids: selected, is_available: isAvailable }) })
      setNotice(`${selected.length} item${selected.length === 1 ? '' : 's'} marked ${isAvailable ? 'available' : 'sold out'}.`); setSelected([]); await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    const name = (editingCategory?.name || categoryName).trim()
    if (!name) return
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/categories/`, {
        method: editingCategory ? 'PATCH' : 'POST',
        body: jsonBody(editingCategory ? { id: editingCategory.id, name } : { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), display_order: categories.length }),
      })
      setEditingCategory(null); setCategoryName(''); await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const index = categories.findIndex((item) => item.id === category.id); const target = index + direction
    if (target < 0 || target >= categories.length) return
    try {
      await Promise.all([
        apiFetch(`/api/organizations/${organizationId}/venue/menu/categories/`, { method: 'PATCH', body: jsonBody({ id: category.id, display_order: target }) }),
        apiFetch(`/api/organizations/${organizationId}/venue/menu/categories/`, { method: 'PATCH', body: jsonBody({ id: categories[target].id, display_order: index }) }),
      ])
      await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  async function deleteCategory() {
    if (!deletingCategory) return
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/menu/categories/`, { method: 'DELETE', body: jsonBody({ id: deletingCategory.id, target_category_id: moveTarget ? Number(moveTarget) : undefined }) })
      if (categoryFilter === String(deletingCategory.id)) setCategoryFilter('all')
      setDeletingCategory(null); setMoveTarget(''); await load()
    } catch (reason) { setError(displayError(reason)) }
  }

  if (loading && !items.length) return <div className="manage-state">Loading menu…</div>
  return (
    <section className={`menu-management${draft ? ' is-editing' : ''}`}>
      <header className="menu-management-actions">
        <div className="menu-attribute-tabs" role="tablist" aria-label="Menu filters">
          {([['all', 'All items'], ['special', "Today's specials"], ['offer', 'Offers']] as const).map(([key, label]) => <button type="button" role="tab" aria-selected={attributeFilter === key} className={attributeFilter === key ? 'is-active' : ''} onClick={() => setAttributeFilter(key)} key={key}>{label}</button>)}
        </div>
        <div><a className="manage-button" href={`/venue/${publicIdentifier}/?tab=menu`} target="_blank" rel="noreferrer"><Eye size={15} /> Preview menu</a><button type="button" className="manage-button is-primary" disabled={!categories.length} onClick={() => setDraft(emptyDraft(categories[0]?.id))}><Plus size={15} /> Add item</button></div>
      </header>
      {error ? <div className="manage-alert" role="alert">{error}</div> : null}
      {notice ? <div className="manage-alert is-success" role="status">{notice}</div> : null}
      <div className="menu-management-grid">
        <aside className="menu-category-panel">
          <header><h2>Categories</h2><span>{items.length} items</span></header>
          <button type="button" className={categoryFilter === 'all' ? 'is-active' : ''} onClick={() => setCategoryFilter('all')}><strong>All items</strong><span>{items.length}</span></button>
          {categories.map((category, index) => <div className={`menu-category-row${categoryFilter === String(category.id) ? ' is-active' : ''}`} key={category.id}>
            {editingCategory?.id === category.id ? <form onSubmit={saveCategory}><TextInput autoFocus value={editingCategory.name} onChange={(event) => setEditingCategory({ ...editingCategory, name: event.target.value })} /><button>Save</button><button type="button" onClick={() => setEditingCategory(null)}>Cancel</button></form> : <><button type="button" onClick={() => setCategoryFilter(String(category.id))}><strong>{category.name}</strong><span>{counts.get(category.id) || 0}</span></button><div><button type="button" disabled={index === 0} aria-label={`Move ${category.name} up`} onClick={() => void moveCategory(category, -1)}><ArrowUp size={13} /></button><button type="button" disabled={index === categories.length - 1} aria-label={`Move ${category.name} down`} onClick={() => void moveCategory(category, 1)}><ArrowDown size={13} /></button><button type="button" aria-label={`Rename ${category.name}`} onClick={() => setEditingCategory(category)}><Pencil size={13} /></button><button type="button" aria-label={`Delete ${category.name}`} onClick={() => { setDeletingCategory(category); setMoveTarget('') }}><Trash2 size={13} /></button></div></>}
          </div>)}
          <form className="menu-add-category" onSubmit={saveCategory}><TextInput aria-label="New category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category" /><button className="manage-button" disabled={!categoryName.trim()}><Plus size={14} /> Add</button></form>
        </aside>
        <div className="menu-list-panel">
          <div className="menu-list-toolbar">
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu items…" /></label>
            <SelectInput aria-label="Filter category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</SelectInput>
            <SelectInput aria-label="Filter availability" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All availability</option><option value="available">Available</option><option value="sold-out">Sold out</option></SelectInput>
            <SelectInput aria-label="Filter publication" value={publication} onChange={(event) => setPublication(event.target.value)}><option value="all">All publication</option><option value="published">Published</option><option value="unpublished">Unpublished</option></SelectInput>
          </div>
          {selected.length ? <div className="menu-bulk-bar"><strong>{selected.length} selected</strong><button type="button" onClick={() => void bulkAvailability(true)}>Mark available</button><button type="button" onClick={() => void bulkAvailability(false)}>Mark sold out</button><button type="button" onClick={() => setSelected([])}>Clear</button></div> : null}
          <div className="menu-list-table">
            <div className="menu-list-head"><span /><span>Item</span><span>Category</span><span>Price (NPR)</span><span>Availability</span><span>Published</span><span>Actions</span></div>
            {visibleItems.map((item, index) => <article className="menu-list-row" key={item.id}>
              <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
              <div className="menu-list-identity">{item.image ? <img src={item.image} alt="" /> : <span><Utensils size={17} /></span>}<div><strong>{item.name}</strong><small>{categoryNames.get(item.category_id) || 'Unknown'} · {item.is_today_special ? "Today's special" : item.is_offer ? item.offer_label || 'Offer' : item.is_published ? 'Public menu' : 'Private draft'}</small></div></div>
              <span>{categoryNames.get(item.category_id) || 'Unknown'}</span><b>{npr(item.price)}</b>
              <button type="button" className={`menu-status is-${item.is_available ? 'available' : 'sold-out'}`} onClick={() => void patchItem(item.id, { is_available: !item.is_available })}><i />{item.is_available ? 'Available' : 'Sold out'}</button>
              <label className="menu-switch"><input type="checkbox" checked={item.is_published} onChange={(event) => void patchItem(item.id, { is_published: event.target.checked })} /><i /><span>{item.is_published ? 'Published' : 'Unpublished'}</span></label>
              <div className="menu-row-actions"><button type="button" aria-label={`Edit ${item.name}`} onClick={() => setDraft(itemDraft(item))}><Pencil size={15} /></button><button type="button" aria-label={`Duplicate ${item.name}`} onClick={() => void duplicateItem(item.id)}><Copy size={15} /></button><button type="button" disabled={index === 0 && visibleItems.length === items.length} aria-label={`Move ${item.name} up`} onClick={() => void moveItem(item.id, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === visibleItems.length - 1 && visibleItems.length === items.length} aria-label={`Move ${item.name} down`} onClick={() => void moveItem(item.id, 1)}><ArrowDown size={15} /></button><button type="button" className="is-danger" aria-label={`Delete ${item.name}`} onClick={() => void removeItem(item.id)}><Trash2 size={15} /></button></div>
            </article>)}
            {!visibleItems.length ? <div className="menu-list-empty"><Utensils size={23} /><strong>No menu items found</strong><p>Adjust the filters or add an item.</p></div> : null}
          </div>
        </div>
      </div>
      {deletingCategory ? <div className="menu-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-category-title"><div><h2 id="delete-category-title">Delete {deletingCategory.name}?</h2>{(counts.get(deletingCategory.id) || 0) > 0 ? <><p>This category contains {counts.get(deletingCategory.id)} item(s). Choose where to move them first.</p><Field label="Move items to"><SelectInput value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)}><option value="">Choose another category</option>{categories.filter((category) => category.id !== deletingCategory.id).map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</SelectInput></Field></> : <p>The empty category will be removed.</p>}<footer><button type="button" className="manage-button" onClick={() => setDeletingCategory(null)}>Cancel</button><button type="button" className="manage-button is-primary" disabled={(counts.get(deletingCategory.id) || 0) > 0 && !moveTarget} onClick={() => void deleteCategory()}>Delete category</button></footer></div></div> : null}
      {draft ? <><button type="button" className="menu-drawer-backdrop" aria-label="Close item editor" onClick={() => setDraft(null)} /><aside className="menu-item-drawer" role="dialog" aria-modal="true" aria-labelledby="menu-item-editor-title"><header><div><h2 id="menu-item-editor-title">{draft.id ? 'Edit item' : 'Add item'}</h2><p>{draft.id ? 'Update this menu item.' : 'Create a new menu item.'}</p></div><button type="button" aria-label="Close item editor" onClick={() => setDraft(null)}><X size={20} /></button></header><form onSubmit={saveItem}><div className="menu-drawer-fields">
        <Field label="Item name"><TextInput required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Chicken Momo" /></Field>
        <div className="menu-drawer-pair"><Field label="Category"><SelectInput required value={draft.category_id || ''} onChange={(event) => setDraft({ ...draft, category_id: Number(event.target.value) })}><option value="">Select category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</SelectInput></Field><Field label="Price (NPR)"><TextInput required inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="e.g. 220" /></Field></div>
        <Field label="Description" hint={`${draft.description.length}/500`}><TextArea maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
        <Field label="Item image"><ImageAdjustInput key={draft.removeImage ? 'removed' : 'active'} label={draft.currentImage || draft.image ? 'Replace item image' : 'Choose and crop image'} mode="featured" currentUrl={draft.removeImage ? '' : draft.currentImage} onChange={(file) => setDraft({ ...draft, image: file, removeImage: false })} />{draft.currentImage || draft.image ? <button type="button" className="menu-remove-image" onClick={() => setDraft({ ...draft, image: null, currentImage: '', removeImage: true })}><Trash2 size={13} /> Remove image</button> : null}</Field>
        <label className="menu-editor-toggle"><span><strong>Published</strong><small>Show this item on the public menu</small></span><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /></label>
        <label className="menu-editor-toggle"><span><strong>Availability</strong><small>Published sold-out items remain visible</small></span><input type="checkbox" checked={draft.is_available} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })} /></label>
        <details className="menu-editor-section"><summary><span><strong>Price variants</strong><small>Add sizes or options such as small / large</small></span><Plus size={15} /></summary><div>{draft.price_variants.map((variant, index) => <div className="menu-variant-row" key={index}><TextInput aria-label={`Variant ${index + 1} name`} value={variant.label} onChange={(event) => setDraft({ ...draft, price_variants: draft.price_variants.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Large" /><TextInput aria-label={`Variant ${index + 1} price`} inputMode="decimal" value={variant.price} onChange={(event) => setDraft({ ...draft, price_variants: draft.price_variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item) })} placeholder="300" /><button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => setDraft({ ...draft, price_variants: draft.price_variants.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /></button></div>)}<button type="button" className="manage-button" onClick={() => setDraft({ ...draft, price_variants: [...draft.price_variants, { label: '', price: '' }] })}><Plus size={14} /> Add variant</button></div></details>
        <details className="menu-editor-section"><summary><span><strong>Today&apos;s special</strong><small>Highlight now or during an optional period</small></span><Tag size={15} /></summary><div><label className="menu-editor-check"><input type="checkbox" checked={draft.is_today_special} onChange={(event) => setDraft({ ...draft, is_today_special: event.target.checked })} /> Mark as today&apos;s special</label>{draft.is_today_special ? <div className="menu-drawer-pair"><Field label="Starts (optional)"><TextInput type="datetime-local" value={draft.special_starts_at} onChange={(event) => setDraft({ ...draft, special_starts_at: event.target.value })} /></Field><Field label="Ends (optional)"><TextInput type="datetime-local" value={draft.special_ends_at} onChange={(event) => setDraft({ ...draft, special_ends_at: event.target.value })} /></Field></div> : null}</div></details>
        <details className="menu-editor-section"><summary><span><strong>Offer settings</strong><small>Add a discount or timed offer</small></span><Tag size={15} /></summary><div><label className="menu-editor-check"><input type="checkbox" checked={draft.is_offer} onChange={(event) => setDraft({ ...draft, is_offer: event.target.checked })} /> Show as offer</label>{draft.is_offer ? <><div className="menu-drawer-pair"><Field label="Original price"><TextInput inputMode="decimal" value={draft.original_price} onChange={(event) => setDraft({ ...draft, original_price: event.target.value })} /></Field><Field label="Offer label"><TextInput value={draft.offer_label} onChange={(event) => setDraft({ ...draft, offer_label: event.target.value })} placeholder="e.g. Save 20%" /></Field></div><div className="menu-drawer-pair"><Field label="Starts (optional)"><TextInput type="datetime-local" value={draft.offer_starts_at} onChange={(event) => setDraft({ ...draft, offer_starts_at: event.target.value })} /></Field><Field label="Ends (optional)"><TextInput type="datetime-local" value={draft.offer_ends_at} onChange={(event) => setDraft({ ...draft, offer_ends_at: event.target.value })} /></Field></div></> : null}</div></details>
      </div><footer><button type="button" className="manage-button" onClick={() => setDraft(null)}>Cancel</button><button className="manage-button is-primary" disabled={saving}>{saving ? 'Saving…' : 'Save item'}</button></footer></form></aside></> : null}
    </section>
  )
}

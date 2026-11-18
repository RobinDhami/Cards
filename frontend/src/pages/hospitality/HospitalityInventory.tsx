import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle.js'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list.js'
import PackagePlus from 'lucide-react/dist/esm/icons/package-plus.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityInventory.css'

type Item = { id: number; name: string; unit: string; quantityOnHand: string; reorderLevel: string; unitCost: string; isActive: boolean; isLow: boolean; usedBy: Array<{ menuItemId: number; menuItemName: string; quantity: string }> }
type Movement = { id: number; itemId: number; itemName: string; quantityChange: string; quantityAfter: string; type: string; note: string; createdAt: string; actor: string }
type MenuItem = { id: number; name: string }
type Draft = { id?: number; name: string; unit: string; quantityOnHand: string; reorderLevel: string; unitCost: string; isActive: boolean }

const units = [['piece', 'Pieces'], ['g', 'Grams'], ['kg', 'Kilograms'], ['ml', 'Millilitres'], ['l', 'Litres'], ['pack', 'Packs'], ['portion', 'Portions']]
const blank = (): Draft => ({ name: '', unit: 'piece', quantityOnHand: '0', reorderLevel: '0', unitCost: '0', isActive: true })
const numeric = (value: string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })

export function HospitalityInventory({ organizationId }: { organizationId: number }) {
  const [items, setItems] = useState<Item[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [adjusting, setAdjusting] = useState<Item | null>(null)
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null)
  const [recipeRows, setRecipeRows] = useState<Array<{ inventoryItemId: string; quantity: string }>>([{ inventoryItemId: '', quantity: '' }])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<{ items: Item[]; movements: Movement[]; menuItems: MenuItem[] }>(`/api/organizations/${organizationId}/venue/inventory/`)
      setItems(data.items); setMovements(data.movements); setMenuItems(data.menuItems); setError('')
    } catch (reason) { setError(displayError(reason)) } finally { setLoading(false) }
  }, [organizationId])
  useEffect(() => { void load() }, [load])

  const low = useMemo(() => items.filter((item) => item.isLow), [items])
  const active = items.filter((item) => item.isActive)
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/inventory/`, { method: draft.id ? 'PATCH' : 'POST', body: jsonBody(draft) })
      setDraft(null); setNotice(draft.id ? 'Inventory item updated.' : 'Inventory item added.'); await load()
    } catch (reason) { setError(displayError(reason)) }
  }
  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!adjusting) return
    const form = new FormData(event.currentTarget)
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/inventory/`, { method: 'POST', body: jsonBody({ action: 'movement', id: adjusting.id, quantityChange: form.get('quantityChange'), movementType: form.get('movementType'), note: form.get('note') }) })
      setAdjusting(null); setNotice('Stock movement recorded.'); await load()
    } catch (reason) { setError(displayError(reason)) }
  }
  function openRecipe(menuItem: MenuItem) {
    const current = items.filter((item) => item.usedBy.some((use) => use.menuItemId === menuItem.id))
    setRecipeItem(menuItem)
    setRecipeRows(current.length ? current.map((item) => ({ inventoryItemId: String(item.id), quantity: item.usedBy.find((use) => use.menuItemId === menuItem.id)?.quantity || '' })) : [{ inventoryItemId: '', quantity: '' }])
  }
  async function saveRecipe(event: FormEvent) {
    event.preventDefault(); if (!recipeItem) return
    const ingredients = recipeRows.filter((row) => row.inventoryItemId && Number(row.quantity) > 0).map((row) => ({ inventoryItemId: Number(row.inventoryItemId), quantity: row.quantity }))
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/inventory/`, { method: 'POST', body: jsonBody({ action: 'recipe', menuItemId: recipeItem.id, ingredients }) })
      setRecipeItem(null); setNotice(`Recipe saved for ${recipeItem.name}.`); await load()
    } catch (reason) { setError(displayError(reason)) }
  }
  if (loading) return <div className="manage-state">Loading inventory…</div>
  return <main className="hospitality-inventory">
    {error ? <div className="manage-alert">{error}</div> : null}{notice ? <div className="manage-notice">{notice}</div> : null}
    <header className="inventory-header"><div><h2>Inventory</h2><p>Track ingredients and supplies. Low stock is highlighted before it affects service.</p></div><button className="manage-button is-primary" onClick={() => setDraft(blank())}><Plus size={16} /> Add inventory item</button></header>
    <section className="inventory-summary" aria-label="Inventory summary"><div><PackagePlus size={19} /><span><strong>{active.length}</strong> active items</span></div><div className={low.length ? 'is-warning' : ''}><AlertTriangle size={19} /><span><strong>{low.length}</strong> low stock</span></div><div><ClipboardList size={19} /><span><strong>{movements.length}</strong> recent movements</span></div></section>
    {low.length ? <section className="inventory-low-stock"><AlertTriangle size={18} /><div><strong>Needs attention</strong><span>{low.map((item) => `${item.name} (${numeric(item.quantityOnHand)} ${item.unit})`).join(' · ')}</span></div></section> : null}
    <section className="inventory-panel"><header><div><h3>Stock on hand</h3><p>Add stock when deliveries arrive, or record waste and corrections.</p></div></header><div className="inventory-table"><div className="inventory-table-head"><span>Item</span><span>On hand</span><span>Reorder at</span><span>Value</span><span>Actions</span></div>{items.length ? items.map((item) => <div className={item.isLow ? 'is-low' : ''} key={item.id}><strong>{item.name}<small>{item.usedBy.length ? `Used in ${item.usedBy.map((use) => use.menuItemName).join(', ')}` : 'Not linked to a recipe yet'}</small></strong><span>{numeric(item.quantityOnHand)} {item.unit}</span><span>{numeric(item.reorderLevel)} {item.unit}</span><span>NPR {numeric(item.unitCost)}</span><span className="inventory-actions"><button title="Adjust stock" aria-label={`Adjust ${item.name} stock`} onClick={() => setAdjusting(item)}><SlidersHorizontal size={16} /></button><button title="Edit item" aria-label={`Edit ${item.name}`} onClick={() => setDraft({ id: item.id, name: item.name, unit: item.unit, quantityOnHand: item.quantityOnHand, reorderLevel: item.reorderLevel, unitCost: item.unitCost, isActive: item.isActive })}><Pencil size={16} /></button></span></div>) : <div className="inventory-empty">Add your first ingredient or supply to begin tracking stock.</div>}</div></section>
    <section className="inventory-panel"><header><div><h3>Menu recipes</h3><p>Set what one sale uses so stock can be connected to your menu.</p></div></header><div className="inventory-recipe-list">{menuItems.map((menuItem) => <button key={menuItem.id} type="button" onClick={() => openRecipe(menuItem)}><span><strong>{menuItem.name}</strong><small>{items.filter((item) => item.usedBy.some((use) => use.menuItemId === menuItem.id)).length ? 'Recipe configured' : 'Add recipe'}</small></span><Pencil size={16} /></button>)}</div></section>
    <section className="inventory-panel"><header><div><h3>Recent stock activity</h3><p>Every stock change remains visible for accountability.</p></div></header><div className="inventory-movements">{movements.length ? movements.map((move) => <div key={move.id}><span className={Number(move.quantityChange) < 0 ? 'is-negative' : 'is-positive'}>{Number(move.quantityChange) > 0 ? '+' : ''}{numeric(move.quantityChange)}</span><strong>{move.itemName}<small>{move.type.replace('_', ' ')} · {move.note || move.actor}</small></strong><span>{new Date(move.createdAt).toLocaleDateString()}</span></div>) : <p>No stock movements yet.</p>}</div></section>
    {draft ? <div className="inventory-modal-wrap"><button className="inventory-modal-backdrop" aria-label="Close inventory editor" onClick={() => setDraft(null)} /><form className="inventory-modal" onSubmit={save}><header><div><h2>{draft.id ? 'Edit inventory item' : 'Add inventory item'}</h2><p>Use the same unit for stock, reorder levels, and recipes.</p></div><button type="button" onClick={() => setDraft(null)} aria-label="Close"><X size={18} /></button></header><label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus /></label><div className="inventory-form-grid"><label>Unit<select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>{units.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Current stock<input type="number" min="0" step="0.001" value={draft.quantityOnHand} disabled={Boolean(draft.id)} onChange={(e) => setDraft({ ...draft, quantityOnHand: e.target.value })} required /></label><label>Low-stock level<input type="number" min="0" step="0.001" value={draft.reorderLevel} onChange={(e) => setDraft({ ...draft, reorderLevel: e.target.value })} required /></label><label>Unit cost (NPR)<input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} required /></label></div>{draft.id ? <p className="inventory-hint">Use Adjust stock to change the on-hand quantity and keep the movement history accurate.</p> : null}<label className="inventory-checkbox"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Active item</label><footer><button type="button" className="manage-button" onClick={() => setDraft(null)}>Cancel</button><button className="manage-button is-primary">Save item</button></footer></form></div> : null}
    {adjusting ? <div className="inventory-modal-wrap"><button className="inventory-modal-backdrop" aria-label="Close stock adjustment" onClick={() => setAdjusting(null)} /><form className="inventory-modal inventory-adjust-modal" onSubmit={adjust}><header><div><h2>Adjust {adjusting.name}</h2><p>Currently {numeric(adjusting.quantityOnHand)} {adjusting.unit} on hand.</p></div><button type="button" onClick={() => setAdjusting(null)} aria-label="Close"><X size={18} /></button></header><label>Movement<select name="movementType" defaultValue="received"><option value="received">Stock received</option><option value="adjustment">Stock adjustment</option><option value="waste">Waste / spoilage</option><option value="count">Stock count correction</option></select></label><label>Quantity change<input name="quantityChange" type="number" step="0.001" placeholder="Use a negative number to remove stock" required /></label><label>Note (optional)<input name="note" maxLength={280} placeholder="Delivery, spoilage, count correction…" /></label><footer><button type="button" className="manage-button" onClick={() => setAdjusting(null)}>Cancel</button><button className="manage-button is-primary">Record movement</button></footer></form></div> : null}
    {recipeItem ? <div className="inventory-modal-wrap"><button className="inventory-modal-backdrop" aria-label="Close recipe editor" onClick={() => setRecipeItem(null)} /><form className="inventory-modal" onSubmit={saveRecipe}><header><div><h2>Recipe: {recipeItem.name}</h2><p>Set ingredients used for one item sold.</p></div><button type="button" onClick={() => setRecipeItem(null)} aria-label="Close"><X size={18} /></button></header><div className="recipe-rows">{recipeRows.map((row, index) => <div key={index}><select value={row.inventoryItemId} onChange={(e) => setRecipeRows((rows) => rows.map((entry, i) => i === index ? { ...entry, inventoryItemId: e.target.value } : entry))}><option value="">Choose ingredient</option>{active.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select><input type="number" min="0.001" step="0.001" placeholder="Quantity" value={row.quantity} onChange={(e) => setRecipeRows((rows) => rows.map((entry, i) => i === index ? { ...entry, quantity: e.target.value } : entry))} /><button type="button" onClick={() => setRecipeRows((rows) => rows.filter((_, i) => i !== index))} aria-label="Remove ingredient"><X size={16} /></button></div>)}</div><button className="inventory-add-row" type="button" onClick={() => setRecipeRows((rows) => [...rows, { inventoryItemId: '', quantity: '' }])}><Plus size={15} /> Add ingredient</button><footer><button type="button" className="manage-button" onClick={() => setRecipeItem(null)}>Cancel</button><button className="manage-button is-primary">Save recipe</button></footer></form></div> : null}
  </main>
}

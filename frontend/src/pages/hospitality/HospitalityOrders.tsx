import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import BellRing from 'lucide-react/dist/esm/icons/bell-ring.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat.js'
import ClipboardCheck from 'lucide-react/dist/esm/icons/clipboard-check.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { Field, TextInput } from '../../components/manage/FormControls'
import './HospitalityOrders.css'

type OrderItem = { id?: number; menuItemId?: number | null; name: string; unitPrice?: string; quantity: number; note: string }
type Order = { id: number; number: number; table: string; status: string; customerName: string; note: string; total: string; createdAt: string; verificationCode: string; verificationExpiresAt: string | null; verifiedAt: string | null; verifiedBy: string; items: OrderItem[] }
type Table = { id: number; name: string; publicIdentifier: string; qrUrl: string }
type MenuItem = { id: number; name: string; price: string }
type Queue = 'waiter' | 'kitchen'

const statusLabel: Record<string, string> = { new: 'Pending verification', accepted: 'Verified', preparing: 'Preparing', ready: 'Ready to serve', completed: 'Served', cancelled: 'Rejected', expired: 'Expired' }

function TableQr({ table }: { table: Table }) {
  const [image, setImage] = useState('')
  useEffect(() => { void QRCode.toDataURL(table.qrUrl, { width: 180, margin: 2 }).then(setImage) }, [table.qrUrl])
  return <article className="hospitality-order-table"><div>{image ? <img src={image} alt={`QR code for ${table.name}`} /> : <QrCode size={40} />}</div><section><strong>{table.name}</strong><small>Customers scan this to open their table menu and order.</small><a className="manage-button" href={image || undefined} download={`${table.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`}>Download QR</a></section></article>
}

function orderAge(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  return minutes < 1 ? 'Just now' : `${minutes} min ago`
}

export function HospitalityOrders({ organizationId }: { organizationId: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [tableName, setTableName] = useState('')
  const [queue, setQueue] = useState<Queue>('waiter')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<Order | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: Order[]; tables: Table[]; menuItems: MenuItem[] }>(`/api/organizations/${organizationId}/venue/orders/`)
      setOrders(data.orders); setTables(data.tables); setMenuItems(data.menuItems)
    } catch (reason) { setError(displayError(reason)) }
  }, [organizationId])
  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({
    pending: orders.filter((order) => order.status === 'new').length,
    verified: orders.filter((order) => order.status === 'accepted').length,
    preparing: orders.filter((order) => order.status === 'preparing').length,
    ready: orders.filter((order) => order.status === 'ready').length,
  }), [orders])
  const queueOrders = queue === 'waiter'
    ? orders.filter((order) => ['new', 'accepted', 'ready'].includes(order.status))
    : orders.filter((order) => ['accepted', 'preparing'].includes(order.status))

  async function createTable(event: React.FormEvent) {
    event.preventDefault(); setError('')
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/orders/`, { method: 'POST', body: jsonBody({ tableName }) })
      setTableName(''); setNotice('Table QR created.'); await load()
    } catch (reason) { setError(displayError(reason)) }
  }
  async function updateOrder(body: Record<string, unknown>, success?: string) {
    setError('')
    try {
      await apiFetch(`/api/organizations/${organizationId}/venue/orders/`, { method: 'PATCH', body: jsonBody(body) })
      if (success) setNotice(success)
      setEditing(null); await load()
    } catch (reason) { setError(displayError(reason)) }
  }
  async function approve(order: Order) {
    const verificationCode = (codes[order.id] || '').trim()
    if (!verificationCode) { setError('Ask the customer for their four-digit order code before approving.'); return }
    await updateOrder({ id: order.id, action: 'approve', verificationCode }, `Order #${order.number} verified and sent to the kitchen queue.`)
  }
  function openEdit(order: Order) { setEditing({ ...order, items: order.items.map((item) => ({ ...item })) }) }
  function addMenuItem() {
    if (!editing || !menuItems.length) return
    const menuItem = menuItems[0]
    setEditing({ ...editing, items: [...editing.items, { menuItemId: menuItem.id, name: menuItem.name, unitPrice: menuItem.price, quantity: 1, note: '' }] })
  }
  async function saveEdit() {
    if (!editing) return
    await updateOrder({ id: editing.id, action: 'edit', note: editing.note, items: editing.items.map(({ id, menuItemId, quantity, note }) => ({ ...(id ? { id } : { menuItemId }), quantity, note })) }, `Order #${editing.number} updated.`)
  }
  function nextAction(order: Order) {
    if (queue === 'kitchen' && order.status === 'accepted') return <button className="hospitality-order-icon is-approve" type="button" title="Start preparing" aria-label="Start preparing" onClick={() => void updateOrder({ id: order.id, status: 'preparing' }, `Order #${order.number} is being prepared.`)}><ChefHat size={17} /></button>
    if (queue === 'kitchen' && order.status === 'preparing') return <button className="hospitality-order-icon is-approve" type="button" title="Mark ready" aria-label="Mark ready" onClick={() => void updateOrder({ id: order.id, status: 'ready' }, `Order #${order.number} is ready to serve.`)}><BellRing size={17} /></button>
    if (queue === 'waiter' && order.status === 'ready') return <button className="hospitality-order-icon is-approve" type="button" title="Mark served" aria-label="Mark served" onClick={() => void updateOrder({ id: order.id, status: 'completed' }, `Order #${order.number} marked as served.`)}><CheckCircle2 size={17} /></button>
    return null
  }

  return <div className="hospitality-orders-page">
    {error ? <div className="manage-alert" role="alert">{error}</div> : null}
    {notice ? <div className="manage-alert is-success">{notice}</div> : null}

    <section className="hospitality-order-card hospitality-order-workspace">
      <header><div><h2>Order workspace</h2><p>Verify requests at the table, then prepare and serve them in order.</p></div></header>
      <div className="hospitality-order-metrics" aria-label="Live order counts"><span><Clock3 size={17} /><b>{counts.pending}</b> awaiting code</span><span><ClipboardCheck size={17} /><b>{counts.verified}</b> verified</span><span><ChefHat size={17} /><b>{counts.preparing}</b> preparing</span><span><BellRing size={17} /><b>{counts.ready}</b> ready</span></div>
      <nav className="hospitality-order-queue-tabs" aria-label="Order workspace"><button type="button" className={queue === 'waiter' ? 'is-active' : ''} onClick={() => setQueue('waiter')}><UserRound size={17} /> Waiter queue <span>{counts.pending + counts.ready}</span></button><button type="button" className={queue === 'kitchen' ? 'is-active' : ''} onClick={() => setQueue('kitchen')}><ChefHat size={17} /> Kitchen queue <span>{counts.verified + counts.preparing}</span></button></nav>
      <div className="hospitality-order-list hospitality-order-queue-list">{queueOrders.map((order) => <article key={order.id} className={`is-${order.status}`}><div className="hospitality-order-copy"><span className={`hospitality-order-status is-${order.status}`}>{statusLabel[order.status]}</span><strong>#{order.number} · {order.table}</strong><small>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</small>{order.note ? <small>Request: {order.note}</small> : null}<small className="hospitality-order-age"><Clock3 size={12} /> {orderAge(order.createdAt)}</small></div><b>Rs. {order.total}</b>{order.status === 'new' ? <div className="hospitality-order-verify"><label>Customer code<input inputMode="numeric" maxLength={4} value={codes[order.id] || ''} onChange={(event) => setCodes((current) => ({ ...current, [order.id]: event.target.value.replace(/\D/g, '') }))} placeholder="0000" /></label><button className="hospitality-order-icon is-approve" type="button" title="Approve order" aria-label="Approve order" onClick={() => void approve(order)}><Check size={17} /></button><button className="hospitality-order-icon" type="button" title="Edit order" aria-label="Edit order" onClick={() => openEdit(order)}><Pencil size={16} /></button><button className="hospitality-order-icon is-reject" type="button" title="Reject order" aria-label="Reject order" onClick={() => void updateOrder({ id: order.id, action: 'reject' }, `Order #${order.number} rejected.`)}><X size={18} /></button></div> : <div className="hospitality-order-active-actions">{['accepted', 'preparing'].includes(order.status) ? <button className="hospitality-order-icon" type="button" title="Edit order" aria-label="Edit order" onClick={() => openEdit(order)}><Pencil size={16} /></button> : null}{nextAction(order)}</div>}</article>)}{!queueOrders.length ? <div className="hospitality-orders-empty is-queue">{queue === 'waiter' ? <UserRound size={48} /> : <ChefHat size={48} />}<strong>{queue === 'waiter' ? 'No waiter actions right now' : 'Kitchen queue is clear'}</strong><p>{queue === 'waiter' ? 'New table orders and meals ready to serve will appear here.' : 'Verified orders will appear here once a waiter confirms them.'}</p></div> : null}</div>
    </section>

    <section className="hospitality-order-card"><header><div><h2>Table QR codes</h2><p>Create a QR code for each table so orders are automatically linked to it.</p></div></header><form onSubmit={createTable}><Field label="Table name"><TextInput required value={tableName} onChange={(event) => setTableName(event.target.value)} placeholder="e.g. Table 1, Patio 2, Counter" /></Field><button className="manage-button is-primary"><Plus size={18} /> Create table QR</button></form><div className="hospitality-order-tables">{tables.map((table) => <TableQr key={table.id} table={table} />)}{!tables.length ? <div className="hospitality-orders-empty"><QrCode size={43} /><strong>No table QR codes yet</strong><p>Create a code above to start taking table orders.</p></div> : null}</div></section>

    {editing ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-edit hospitality-order-edit--expanded" role="dialog" aria-modal="true" aria-labelledby="edit-order-title"><header><div><small>{statusLabel[editing.status].toUpperCase()}</small><h2 id="edit-order-title">Edit order #{editing.number}</h2><p>{editing.table} · add items or record any special request.</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={20} /></button></header><div className="hospitality-order-edit-items">{editing.items.map((item, index) => <div className="hospitality-order-edit-row" key={item.id || `new-${index}`}><select aria-label={`Menu item ${index + 1}`} value={item.menuItemId || ''} disabled={Boolean(item.id)} onChange={(event) => { const menuItem = menuItems.find((candidate) => candidate.id === Number(event.target.value)); if (menuItem) setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, menuItemId: menuItem.id, name: menuItem.name, unitPrice: menuItem.price } : row) } : current) }}><option value="">Choose a menu item</option>{item.id && item.menuItemId && !menuItems.some((menuItem) => menuItem.id === item.menuItemId) ? <option value={item.menuItemId}>{item.name}</option> : null}{menuItems.map((menuItem) => <option key={menuItem.id} value={menuItem.id}>{menuItem.name} · Rs. {menuItem.price}</option>)}</select><input aria-label={`Quantity for ${item.name}`} type="number" min="1" max="50" value={item.quantity} onChange={(event) => setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) || 1 } : row) } : current)} /><input aria-label={`Request for ${item.name}`} value={item.note} placeholder="Item request (optional)" onChange={(event) => setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, note: event.target.value } : row) } : current)} /><button className="hospitality-order-icon is-reject" type="button" title="Remove item" aria-label={`Remove ${item.name}`} disabled={editing.items.length === 1} onClick={() => setEditing((current) => current ? { ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index) } : current)}><Trash2 size={15} /></button></div>)}<button className="hospitality-order-add-item" type="button" onClick={addMenuItem} disabled={!menuItems.length}><Plus size={16} /> Add menu item</button><label className="hospitality-order-request"><span>Special request</span><textarea value={editing.note} placeholder="e.g. no sugar, extra plates, allergy information" maxLength={1000} onChange={(event) => setEditing((current) => current ? { ...current, note: event.target.value } : current)} /></label></div><footer><button className="manage-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="manage-button is-primary" type="button" onClick={() => void saveEdit()}>Save changes</button></footer></section></div> : null}
  </div>
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import BellRing from 'lucide-react/dist/esm/icons/bell-ring.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat.js'
import GitMerge from 'lucide-react/dist/esm/icons/git-merge.js'
import Gift from 'lucide-react/dist/esm/icons/gift.js'
import ClipboardCheck from 'lucide-react/dist/esm/icons/clipboard-check.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import ReceiptText from 'lucide-react/dist/esm/icons/receipt-text.js'
import Trash2 from 'lucide-react/dist/esm/icons/trash-2.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { Field, TextInput } from '../../components/manage/FormControls'
import './HospitalityOrders.css'

type OrderItem = { id?: number; menuItemId?: number | null; name: string; unitPrice?: string; quantity: number; note: string }
type Order = { id: number; number: number; table: string; status: string; customerName: string; note: string; total: string; taxAmount: string; serviceChargeAmount: string; discountAmount: string; finalTotal: string; paymentStatus: string; paidAt?: string | null; createdAt: string; verificationCode: string; verificationExpiresAt: string | null; verifiedAt: string | null; verifiedBy: string; cancellationReason?: string; tableSessionExpiresAt?: string | null; loyaltyRewarded?: boolean; items: OrderItem[] }
type Table = { id: number; name: string; publicIdentifier: string; qrUrl: string }
type MenuItem = { id: number; name: string; price: string }
type WaiterCall = { id: number; table: string; note: string; createdAt: string }
type LoyaltyProgram = { isActive: boolean; programType?: 'rewards' | 'points' | 'stamps'; rewardLabel?: string; stampRewardLabel?: string }
type Queue = 'waiter' | 'kitchen'

const statusLabel: Record<string, string> = { new: 'Pending verification', accepted: 'Verified', preparing: 'Preparing', ready: 'Ready to serve', completed: 'Served', cancelled: 'Rejected', expired: 'Expired' }
const paymentLabel: Record<string, string> = { unpaid: 'Unpaid', paid_cash: 'Paid cash', paid_online: 'Paid online', complimentary: 'Complimentary' }

function TableQr({ table }: { table: Table }) {
  const [image, setImage] = useState('')
  useEffect(() => { void QRCode.toDataURL(table.qrUrl, { width: 180, margin: 2 }).then(setImage) }, [table.qrUrl])
  return <article className="hospitality-order-table"><div>{image ? <img src={image} alt={`QR code for ${table.name}`} /> : <QrCode size={40} />}</div><section><strong>{table.name}</strong><small>Customers scan this to open their table menu and order.</small><a className="manage-button" href={image || undefined} download={`${table.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`}>Download QR</a></section></article>
}

function orderAge(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  return minutes < 1 ? 'Just now' : `${minutes} min ago`
}

export function HospitalityOrders({ organizationId, role = 'owner' }: { organizationId: number; role?: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [kitchenUrl, setKitchenUrl] = useState('')
  const [tableName, setTableName] = useState('')
  const [queue, setQueue] = useState<Queue>('waiter')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [editing, setEditing] = useState<Order | null>(null)
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([])
  const [cancelling, setCancelling] = useState<Order | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [mergeTarget, setMergeTarget] = useState<Order | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState('')
  const [billing, setBilling] = useState<Order | null>(null)
  const [rewarding, setRewarding] = useState<Order | null>(null)
  const [memberCode, setMemberCode] = useState('')
  const [loyalty, setLoyalty] = useState<LoyaltyProgram>({ isActive: false })

  useEffect(() => { if (role === 'kitchen') setQueue('kitchen') }, [role])

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: Order[]; tables: Table[]; menuItems: MenuItem[]; kitchenUrl: string; waiterCalls: WaiterCall[]; loyalty: LoyaltyProgram }>(`/api/organizations/${organizationId}/venue/orders/`)
      setOrders(data.orders); setTables(data.tables); setMenuItems(data.menuItems); setKitchenUrl(data.kitchenUrl); setWaiterCalls(data.waiterCalls); setLoyalty(data.loyalty)
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
  function openCancellation(order: Order) { setCancelling(order); setCancellationReason('') }
  async function cancelOrder() {
    if (!cancelling) return
    await updateOrder({ id: cancelling.id, action: cancelling.status === 'new' ? 'reject' : undefined, status: cancelling.status === 'new' ? undefined : 'cancelled', cancellationReason }, `Order #${cancelling.number} cancelled.`)
    setCancelling(null)
  }
  function openMerge(order: Order) {
    const candidate = orders.find((row) => row.id !== order.id && row.table === order.table && row.status === order.status)
    setMergeTarget(order); setMergeSourceId(candidate ? String(candidate.id) : '')
  }
  async function mergeOrders() {
    if (!mergeTarget || !mergeSourceId) return
    await updateOrder({ id: mergeTarget.id, action: 'merge', sourceOrderId: Number(mergeSourceId) }, `Duplicate order merged into #${mergeTarget.number}.`)
    setMergeTarget(null); setMergeSourceId('')
  }
  async function acknowledgeWaiterCall(call: WaiterCall) {
    await updateOrder({ action: 'acknowledge_waiter_call', waiterCallId: call.id }, `Waiter call from ${call.table} acknowledged.`)
  }
  function openBilling(order: Order) { setBilling({ ...order }) }
  async function saveBilling() {
    if (!billing) return
    await updateOrder({ id: billing.id, action: 'billing', taxAmount: billing.taxAmount, serviceChargeAmount: billing.serviceChargeAmount, discountAmount: billing.discountAmount, paymentStatus: billing.paymentStatus }, `Bill for order #${billing.number} updated.`)
    setBilling(null)
  }
  function openReward(order: Order) { setRewarding(order); setMemberCode('') }
  async function awardLoyalty() {
    if (!rewarding) return
    await updateOrder({ id: rewarding.id, action: 'loyalty_award', memberId: memberCode }, `Loyalty ${loyalty.programType === 'stamps' ? 'stamp' : loyalty.programType === 'points' ? 'points' : 'reward'} added for order #${rewarding.number}.`)
    setRewarding(null)
  }
  function printReceipt(order: Order) {
    const escape = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))
    const receipt = window.open('', '_blank', 'noopener,noreferrer,width=420,height=680')
    if (!receipt) { setError('Allow pop-ups to print the receipt.'); return }
    const lines = order.items.map((item) => `<tr><td>${escape(item.name)}${item.note ? `<small>${escape(item.note)}</small>` : ''}</td><td>${item.quantity}</td><td>Rs. ${(Number(item.unitPrice || 0) * item.quantity).toFixed(2)}</td></tr>`).join('')
    receipt.document.write(`<!doctype html><html><head><title>Receipt #${order.number}</title><style>body{font:14px Arial,sans-serif;color:#172033;max-width:360px;margin:28px auto;padding:0 18px}h1{font-size:21px;margin:0 0 5px}p{color:#526174;margin:4px 0 18px}table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid #e4e8ee;vertical-align:top}td:nth-child(2){text-align:center}td:last-child{text-align:right}small{display:block;color:#68768a;margin-top:3px}.total td{border:0;padding:5px 0}.grand td{font-size:18px;font-weight:700;padding-top:11px;border-top:2px solid #172033}.status{margin-top:18px;padding:9px 11px;background:#eef5ff;border-radius:6px;font-weight:700}</style></head><body><h1>Order #${order.number}</h1><p>${escape(order.table)} · ${new Date(order.createdAt).toLocaleString()}</p><table><tbody>${lines}<tr class="total"><td colspan="2">Subtotal</td><td>Rs. ${order.total}</td></tr><tr class="total"><td colspan="2">Tax</td><td>Rs. ${order.taxAmount}</td></tr><tr class="total"><td colspan="2">Service charge</td><td>Rs. ${order.serviceChargeAmount}</td></tr><tr class="total"><td colspan="2">Discount</td><td>− Rs. ${order.discountAmount}</td></tr><tr class="grand"><td colspan="2">Total</td><td>Rs. ${order.finalTotal}</td></tr></tbody></table><div class="status">${escape(paymentLabel[order.paymentStatus] || 'Unpaid')}</div></body></html>`)
    receipt.document.close(); receipt.focus(); receipt.print()
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
      <header><div><h2>{role === 'kitchen' ? 'Kitchen orders' : 'Order workspace'}</h2><p>{role === 'kitchen' ? 'Start preparation and mark completed dishes ready.' : 'Verify requests at the table, then prepare and serve them in order.'}</p></div>{(role === 'owner' || role === 'manager') && kitchenUrl ? <a className="manage-button" href={kitchenUrl} target="_blank" rel="noreferrer"><ChefHat size={16} /> Open kitchen display</a> : null}</header>
      <div className="hospitality-order-metrics" aria-label="Live order counts"><span><Clock3 size={17} /><b>{counts.pending}</b> awaiting code</span><span><ClipboardCheck size={17} /><b>{counts.verified}</b> verified</span><span><ChefHat size={17} /><b>{counts.preparing}</b> preparing</span><span><BellRing size={17} /><b>{counts.ready}</b> ready</span></div>
      {role === 'owner' || role === 'manager' ? <nav className="hospitality-order-queue-tabs" aria-label="Order workspace"><button type="button" className={queue === 'waiter' ? 'is-active' : ''} onClick={() => setQueue('waiter')}><UserRound size={17} /> Waiter queue <span>{counts.pending + counts.ready}</span></button><button type="button" className={queue === 'kitchen' ? 'is-active' : ''} onClick={() => setQueue('kitchen')}><ChefHat size={17} /> Kitchen queue <span>{counts.verified + counts.preparing}</span></button></nav> : null}
      {queue === 'waiter' && waiterCalls.length && role !== 'kitchen' ? <section className="hospitality-waiter-calls" aria-label="Waiter requests"><header><strong>Waiter requests</strong><span>{waiterCalls.length} waiting</span></header>{waiterCalls.map((call) => <article key={call.id}><div><b>{call.table}</b><small>{call.note || 'Customer asked for assistance'} · {orderAge(call.createdAt)}</small></div><button className="hospitality-order-icon is-approve" type="button" title="Acknowledge waiter request" aria-label={`Acknowledge waiter request from ${call.table}`} onClick={() => void acknowledgeWaiterCall(call)}><Check size={17} /></button></article>)}</section> : null}
      <div className="hospitality-order-list hospitality-order-queue-list">{queueOrders.map((order) => <article key={order.id} className={`is-${order.status}`}><div className="hospitality-order-copy"><span className={`hospitality-order-status is-${order.status}`}>{statusLabel[order.status]}</span><strong>#{order.number} · {order.table}</strong><small>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</small>{order.note ? <small>Request: {order.note}</small> : null}<small className="hospitality-order-age"><Clock3 size={12} /> {orderAge(order.createdAt)}</small></div>{role !== 'kitchen' ? <div className="hospitality-order-total"><b>Rs. {order.finalTotal}</b><small>{paymentLabel[order.paymentStatus]}</small></div> : null}{order.status === 'new' && role !== 'kitchen' ? <div className="hospitality-order-verify"><label>Customer code<input inputMode="numeric" maxLength={4} value={codes[order.id] || ''} onChange={(event) => setCodes((current) => ({ ...current, [order.id]: event.target.value.replace(/\D/g, '') }))} placeholder="0000" /></label><button className="hospitality-order-icon is-approve" type="button" title="Approve order" aria-label="Approve order" onClick={() => void approve(order)}><Check size={17} /></button><button className="hospitality-order-icon" type="button" title="Edit order" aria-label="Edit order" onClick={() => openEdit(order)}><Pencil size={16} /></button>{['owner', 'manager'].includes(role) ? <><button className="hospitality-order-icon" type="button" title="Merge duplicate order" aria-label="Merge duplicate order" onClick={() => openMerge(order)}><GitMerge size={16} /></button><button className="hospitality-order-icon is-reject" type="button" title="Reject order" aria-label="Reject order" onClick={() => openCancellation(order)}><X size={18} /></button></> : null}</div> : <div className="hospitality-order-active-actions">{['accepted', 'preparing'].includes(order.status) && role !== 'kitchen' ? <button className="hospitality-order-icon" type="button" title="Edit order" aria-label="Edit order" onClick={() => openEdit(order)}><Pencil size={16} /></button> : null}{order.status === 'accepted' && ['owner', 'manager'].includes(role) ? <button className="hospitality-order-icon" type="button" title="Merge duplicate order" aria-label="Merge duplicate order" onClick={() => openMerge(order)}><GitMerge size={16} /></button> : null}{['owner', 'manager'].includes(role) ? <button className="hospitality-order-icon" type="button" title="Bill and receipt" aria-label="Bill and receipt" onClick={() => openBilling(order)}><ReceiptText size={16} /></button> : null}{['owner', 'manager'].includes(role) && loyalty.isActive && ['paid_cash', 'paid_online'].includes(order.paymentStatus) && !order.loyaltyRewarded ? <button className="hospitality-order-icon is-loyalty" type="button" title="Add loyalty reward" aria-label="Add loyalty reward" onClick={() => openReward(order)}><Gift size={16} /></button> : null}{['accepted', 'preparing', 'ready'].includes(order.status) && ['owner', 'manager'].includes(role) ? <button className="hospitality-order-icon is-reject" type="button" title="Cancel order" aria-label="Cancel order" onClick={() => openCancellation(order)}><X size={17} /></button> : null}{nextAction(order)}</div>}</article>)}{!queueOrders.length ? <div className="hospitality-orders-empty is-queue">{queue === 'waiter' ? <UserRound size={48} /> : <ChefHat size={48} />}<strong>{queue === 'waiter' ? 'No waiter actions right now' : 'Kitchen queue is clear'}</strong><p>{queue === 'waiter' ? 'New table orders and meals ready to serve will appear here.' : 'Verified orders will appear here once a waiter confirms them.'}</p></div> : null}</div>
    </section>

    {(role === 'owner' || role === 'manager') ? <section className="hospitality-order-card"><header><div><h2>Table QR codes</h2><p>Create a QR code for each table so orders are automatically linked to it.</p></div></header><form onSubmit={createTable}><Field label="Table name"><TextInput required value={tableName} onChange={(event) => setTableName(event.target.value)} placeholder="e.g. Table 1, Patio 2, Counter" /></Field><button className="manage-button is-primary"><Plus size={18} /> Create table QR</button></form><div className="hospitality-order-tables">{tables.map((table) => <TableQr key={table.id} table={table} />)}{!tables.length ? <div className="hospitality-orders-empty"><QrCode size={43} /><strong>No table QR codes yet</strong><p>Create a code above to start taking table orders.</p></div> : null}</div></section> : null}

    {editing ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-edit hospitality-order-edit--expanded" role="dialog" aria-modal="true" aria-labelledby="edit-order-title"><header><div><small>{statusLabel[editing.status].toUpperCase()}</small><h2 id="edit-order-title">Edit order #{editing.number}</h2><p>{editing.table} · add items or record any special request.</p></div><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X size={20} /></button></header><div className="hospitality-order-edit-items">{editing.items.map((item, index) => <div className="hospitality-order-edit-row" key={item.id || `new-${index}`}><select aria-label={`Menu item ${index + 1}`} value={item.menuItemId || ''} disabled={Boolean(item.id)} onChange={(event) => { const menuItem = menuItems.find((candidate) => candidate.id === Number(event.target.value)); if (menuItem) setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, menuItemId: menuItem.id, name: menuItem.name, unitPrice: menuItem.price } : row) } : current) }}><option value="">Choose a menu item</option>{item.id && item.menuItemId && !menuItems.some((menuItem) => menuItem.id === item.menuItemId) ? <option value={item.menuItemId}>{item.name}</option> : null}{menuItems.map((menuItem) => <option key={menuItem.id} value={menuItem.id}>{menuItem.name} · Rs. {menuItem.price}</option>)}</select><input aria-label={`Quantity for ${item.name}`} type="number" min="1" max="50" value={item.quantity} onChange={(event) => setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) || 1 } : row) } : current)} /><input aria-label={`Request for ${item.name}`} value={item.note} placeholder="Item request (optional)" onChange={(event) => setEditing((current) => current ? { ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, note: event.target.value } : row) } : current)} /><button className="hospitality-order-icon is-reject" type="button" title="Remove item" aria-label={`Remove ${item.name}`} disabled={editing.items.length === 1} onClick={() => setEditing((current) => current ? { ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index) } : current)}><Trash2 size={15} /></button></div>)}<button className="hospitality-order-add-item" type="button" onClick={addMenuItem} disabled={!menuItems.length}><Plus size={16} /> Add menu item</button><label className="hospitality-order-request"><span>Special request</span><textarea value={editing.note} placeholder="e.g. no sugar, extra plates, allergy information" maxLength={1000} onChange={(event) => setEditing((current) => current ? { ...current, note: event.target.value } : current)} /></label></div><footer><button className="manage-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="manage-button is-primary" type="button" onClick={() => void saveEdit()}>Save changes</button></footer></section></div> : null}
    {cancelling ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title"><header><div><small>ORDER #{cancelling.number}</small><h2 id="cancel-order-title">Cancel this order?</h2><p>Record why it was cancelled so the team can follow up accurately.</p></div><button type="button" onClick={() => setCancelling(null)} aria-label="Close"><X size={20} /></button></header><label>Cancellation reason<textarea autoFocus value={cancellationReason} maxLength={300} placeholder="e.g. Customer changed their mind" onChange={(event) => setCancellationReason(event.target.value)} /></label><footer><button className="manage-button" type="button" onClick={() => setCancelling(null)}>Keep order</button><button className="manage-button is-danger" type="button" disabled={cancellationReason.trim().length < 3} onClick={() => void cancelOrder()}>Cancel order</button></footer></section></div> : null}
    {mergeTarget ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-dialog" role="dialog" aria-modal="true" aria-labelledby="merge-order-title"><header><div><small>{mergeTarget.table.toUpperCase()}</small><h2 id="merge-order-title">Merge duplicate order</h2><p>Add the selected duplicate into order #{mergeTarget.number}. Both orders must be at the same stage.</p></div><button type="button" onClick={() => setMergeTarget(null)} aria-label="Close"><X size={20} /></button></header><label>Order to merge into #{mergeTarget.number}<select value={mergeSourceId} onChange={(event) => setMergeSourceId(event.target.value)}><option value="">Choose an order</option>{orders.filter((order) => order.id !== mergeTarget.id && order.table === mergeTarget.table && order.status === mergeTarget.status).map((order) => <option key={order.id} value={order.id}>#{order.number} · Rs. {order.total}</option>)}</select></label><footer><button className="manage-button" type="button" onClick={() => setMergeTarget(null)}>Cancel</button><button className="manage-button is-primary" type="button" disabled={!mergeSourceId} onClick={() => void mergeOrders()}><GitMerge size={16} /> Merge orders</button></footer></section></div> : null}
    {rewarding ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-dialog hospitality-loyalty-award" role="dialog" aria-modal="true" aria-labelledby="loyalty-award-title"><header><div><small>PAID ORDER #{rewarding.number}</small><h2 id="loyalty-award-title">Add loyalty reward</h2><p>Scan the member card or enter its loyalty code. This order can only be rewarded once.</p></div><button type="button" onClick={() => setRewarding(null)} aria-label="Close"><X size={20} /></button></header><label>Loyalty member code<input autoFocus value={memberCode} onChange={(event) => setMemberCode(event.target.value)} placeholder="Scan QR or enter T2C-LOYALTY:…" /></label><footer><button className="manage-button" type="button" onClick={() => setRewarding(null)}>Cancel</button><button className="manage-button is-primary" type="button" disabled={!memberCode.trim()} onClick={() => void awardLoyalty()}><Gift size={16} /> Add {loyalty.programType === 'stamps' ? 'stamp' : loyalty.programType === 'points' ? 'points' : 'reward'}</button></footer></section></div> : null}
    {billing ? <div className="hospitality-order-edit-backdrop" role="presentation"><section className="hospitality-order-dialog hospitality-order-billing" role="dialog" aria-modal="true" aria-labelledby="billing-title"><header><div><small>ORDER #{billing.number} · {billing.table.toUpperCase()}</small><h2 id="billing-title">Bill and payment</h2><p>Adjust charges and record how this order was settled.</p></div><button type="button" onClick={() => setBilling(null)} aria-label="Close"><X size={20} /></button></header><div className="hospitality-billing-fields"><label>Subtotal <output>Rs. {billing.total}</output></label><label>Tax <input type="number" min="0" step="0.01" value={billing.taxAmount} onChange={(event) => setBilling((current) => current ? { ...current, taxAmount: event.target.value } : null)} /></label><label>Service charge <input type="number" min="0" step="0.01" value={billing.serviceChargeAmount} onChange={(event) => setBilling((current) => current ? { ...current, serviceChargeAmount: event.target.value } : null)} /></label><label>Discount <input type="number" min="0" step="0.01" value={billing.discountAmount} onChange={(event) => setBilling((current) => current ? { ...current, discountAmount: event.target.value } : null)} /></label><label className="hospitality-billing-payment">Payment status<select value={billing.paymentStatus} onChange={(event) => setBilling((current) => current ? { ...current, paymentStatus: event.target.value } : null)}><option value="unpaid">Unpaid</option><option value="paid_cash">Paid cash</option><option value="paid_online">Paid online</option><option value="complimentary">Complimentary</option></select></label><div className="hospitality-billing-total"><span>Final total</span><strong>Rs. {billing.paymentStatus === 'complimentary' ? '0.00' : Math.max(0, Number(billing.total) + Number(billing.taxAmount || 0) + Number(billing.serviceChargeAmount || 0) - Number(billing.discountAmount || 0)).toFixed(2)}</strong></div></div><footer><button className="manage-button" type="button" onClick={() => printReceipt(billing)}><ReceiptText size={16} /> Print receipt</button><button className="manage-button is-primary" type="button" onClick={() => void saveBilling()}>Save bill</button></footer></section></div> : null}
  </div>
}

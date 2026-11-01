import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import { Field, SelectInput, TextInput } from '../../components/manage/FormControls'
import './HospitalityOrders.css'

type Order = { id: number; number: number; table: string; status: string; customerName: string; note: string; total: string; createdAt: string; items: Array<{ name: string; quantity: number; note: string }> }
type Table = { id: number; name: string; publicIdentifier: string; qrUrl: string }
const statuses = ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']

function TableQr({ table }: { table: Table }) {
  const [image, setImage] = useState('')
  useEffect(() => { void QRCode.toDataURL(table.qrUrl, { width: 180, margin: 2 }).then(setImage) }, [table.qrUrl])
  return <article className="hospitality-order-table"><div>{image ? <img src={image} alt={`QR code for ${table.name}`} /> : <QrCode size={40} />}</div><section><strong>{table.name}</strong><small>Customers scan this to open their table menu and order.</small><a className="manage-button" href={image || undefined} download={`${table.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`}>Download QR</a></section></article>
}

export function HospitalityOrders({ organizationId }: { organizationId: number }) {
  const [orders, setOrders] = useState<Order[]>([]); const [tables, setTables] = useState<Table[]>([]); const [tableName, setTableName] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const load = useCallback(async () => { try { const data = await apiFetch<{ orders: Order[]; tables: Table[] }>(`/api/organizations/${organizationId}/venue/orders/`); setOrders(data.orders); setTables(data.tables) } catch (reason) { setError(displayError(reason)) } }, [organizationId])
  useEffect(() => { void load() }, [load])
  async function createTable(event: React.FormEvent) { event.preventDefault(); setError(''); try { await apiFetch(`/api/organizations/${organizationId}/venue/orders/`, { method: 'POST', body: jsonBody({ tableName }) }); setTableName(''); setNotice('Table QR created.'); await load() } catch (reason) { setError(displayError(reason)) } }
  async function setStatus(id: number, status: string) { try { await apiFetch(`/api/organizations/${organizationId}/venue/orders/`, { method: 'PATCH', body: jsonBody({ id, status }) }); await load() } catch (reason) { setError(displayError(reason)) } }
  return <div className="hospitality-orders-page">
    {error ? <div className="manage-alert" role="alert">{error}</div> : null}{notice ? <div className="manage-alert is-success">{notice}</div> : null}
    <section className="hospitality-order-card"><header><div><h2>Table QR codes</h2><p>Each QR opens the menu for that table. Orders are automatically tagged with its table name.</p></div></header><form onSubmit={createTable}><Field label="Table name"><TextInput required value={tableName} onChange={(event) => setTableName(event.target.value)} placeholder="Table 1, Patio 2, Counter…" /></Field><button className="manage-button is-primary"><Plus size={16} /> Create table QR</button></form><div className="hospitality-order-tables">{tables.map((table) => <TableQr key={table.id} table={table} />)}{!tables.length ? <p className="hospitality-orders-empty">Create a table QR to begin taking table orders.</p> : null}</div></section>
    <section className="hospitality-order-card"><header><div><h2>Order queue</h2><p>Payment is collected at the café. Update the order as the team prepares it.</p></div></header><div className="hospitality-order-list">{orders.map((order) => <article key={order.id}><div><strong>#{order.number} · {order.table}</strong><small>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</small>{order.note ? <small>Note: {order.note}</small> : null}</div><b>Rs. {order.total}</b><SelectInput aria-label={`Status for order ${order.number}`} value={order.status} onChange={(event) => void setStatus(order.id, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</SelectInput></article>)}{!orders.length ? <p className="hospitality-orders-empty">New table orders will appear here.</p> : null}</div></section>
  </div>
}

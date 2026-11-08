import { useCallback, useEffect, useMemo, useState } from 'react'
import BellRing from 'lucide-react/dist/esm/icons/bell-ring.js'
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import UtensilsCrossed from 'lucide-react/dist/esm/icons/utensils-crossed.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityKitchenDisplay.css'

type KitchenOrder = { publicIdentifier: string; number: number; table: string; status: 'accepted' | 'preparing'; note: string; createdAt: string; items: Array<{ name: string; quantity: number; note: string }> }
type KitchenData = { organization: { name: string; logo: string }; orders: KitchenOrder[] }

function elapsed(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
  return minutes < 1 ? 'New' : `${minutes} min`
}

export function HospitalityKitchenDisplay() {
  const match = window.location.pathname.match(/^\/venue\/([^/]+)\/kitchen\/([^/]+)\/?$/)
  const venueIdentifier = match?.[1] || ''
  const accessToken = match?.[2] || ''
  const [data, setData] = useState<KitchenData | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(true)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const result = await apiFetch<KitchenData>(`/api/venue/${venueIdentifier}/kitchen/${accessToken}/orders/`)
      setData(result); setError('')
    } catch (reason) { setError(displayError(reason)) }
    finally { if (!quiet) setRefreshing(false) }
  }, [accessToken, venueIdentifier])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(true), 15_000); return () => window.clearInterval(timer) }, [load])

  const preparing = useMemo(() => data?.orders.filter((order) => order.status === 'preparing') || [], [data])
  const verified = useMemo(() => data?.orders.filter((order) => order.status === 'accepted') || [], [data])
  async function advance(order: KitchenOrder, status: 'preparing' | 'ready') {
    try {
      await apiFetch(`/api/venue/${venueIdentifier}/kitchen/${accessToken}/orders/`, { method: 'PATCH', body: jsonBody({ order: order.publicIdentifier, status }) })
      await load(true)
    } catch (reason) { setError(displayError(reason)) }
  }

  return <main className="kitchen-display">
    <header className="kitchen-display-header"><div className="kitchen-display-brand">{data?.organization.logo ? <img src={data.organization.logo} alt="" /> : <ChefHat size={27} />}<div><strong>{data?.organization.name || 'Kitchen'}</strong><span>Kitchen display</span></div></div><div className="kitchen-display-sync"><Clock3 size={16} /> {refreshing ? 'Refreshing…' : 'Auto-refreshes'}</div></header>
    {error ? <div className="kitchen-display-error" role="alert">{error}</div> : null}
    <section className="kitchen-display-summary"><span><b>{verified.length}</b> to prepare</span><span><b>{preparing.length}</b> preparing</span></section>
    <div className="kitchen-display-columns">
      <section><header><ChefHat size={20} /><h1>To prepare</h1><span>{verified.length}</span></header><div className="kitchen-display-list">{verified.map((order) => <KitchenCard key={order.publicIdentifier} order={order} action="preparing" onAdvance={advance} />)}{!verified.length ? <EmptyKitchen text="No verified orders waiting." /> : null}</div></section>
      <section><header><UtensilsCrossed size={20} /><h1>Preparing</h1><span>{preparing.length}</span></header><div className="kitchen-display-list">{preparing.map((order) => <KitchenCard key={order.publicIdentifier} order={order} action="ready" onAdvance={advance} />)}{!preparing.length ? <EmptyKitchen text="Nothing is being prepared." /> : null}</div></section>
    </div>
  </main>
}

function KitchenCard({ order, action, onAdvance }: { order: KitchenOrder; action: 'preparing' | 'ready'; onAdvance: (order: KitchenOrder, status: 'preparing' | 'ready') => Promise<void> }) {
  return <article className={`kitchen-order-card is-${order.status}`}><header><div><strong>#{order.number}</strong><span>{order.table}</span></div><small><Clock3 size={14} /> {elapsed(order.createdAt)}</small></header><ul>{order.items.map((item, index) => <li key={`${item.name}-${index}`}><b>{item.quantity}×</b><span>{item.name}{item.note ? <small>{item.note}</small> : null}</span></li>)}</ul>{order.note ? <p><b>Request</b>{order.note}</p> : null}<button type="button" onClick={() => void onAdvance(order, action)}>{action === 'preparing' ? <><ChefHat size={18} /> Start preparing</> : <><BellRing size={18} /> Mark ready</>}</button></article>
}

function EmptyKitchen({ text }: { text: string }) { return <div className="kitchen-display-empty"><ChefHat size={32} /><span>{text}</span></div> }

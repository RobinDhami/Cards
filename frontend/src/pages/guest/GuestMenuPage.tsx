import { useEffect, useMemo, useRef, useState } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { ApiError, apiFetch, displayError } from '../../lib/api'
import { GuestBottomNav } from '../../features/hotel-guest/GuestBottomNav'
import { GuestSessionProvider } from '../../features/hotel-guest/GuestSessionContext'
import { GuestAccessDialog } from '../../features/hotel-guest/GuestAccessDialog'
import { GuestCartSheet } from '../../features/hotel-guest/GuestCartSheet'
import { useGuestCart } from '../../features/hotel-guest/GuestCartContext'
import { useGuestSession } from '../../features/hotel-guest/useGuestSession'
import type { GuestMenuCategory, GuestMenuItem, GuestMenuResponse } from '../../features/hotel-guest/types-menu'
import './GuestMenuPage.css'

type Props = { publicIdentifier: string }

function formatPrice(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value || '—'
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount) } catch { return `${currency || ''} ${amount.toFixed(2)}`.trim() }
}

function MenuImage({ item }: { item: GuestMenuItem }) {
  const [failed, setFailed] = useState(false)
  if (!item.image || failed) return <span className="guest-menu-item__image guest-menu-item__image--fallback" aria-hidden="true"><Utensils size={24} /></span>
  return <img className="guest-menu-item__image" src={item.image} alt={item.name} onError={() => setFailed(true)} />
}

function MenuItemCard({ item, currency, onAdd, canOrder }: { item: GuestMenuItem; currency: string; onAdd: () => void; canOrder: boolean }) {
  return <article className={`guest-menu-item${item.isVegetarian ? ' is-vegetarian' : ''}`}>
    <MenuImage item={item} />
    <div className="guest-menu-item__copy">
      <strong>{item.name}</strong>
      {item.description && <p>{item.description}</p>}
      {item.dietaryInfo && <small>{item.dietaryInfo}</small>}
    </div>
    <div className="guest-menu-item__purchase">
      <strong>{formatPrice(item.price, currency)}</strong>
      {canOrder && <button type="button" aria-label={`Add ${item.name}`} onClick={onAdd}><Plus size={17} strokeWidth={2.2} /></button>}
    </div>
  </article>
}

function GuestMenuContent({ categories, capabilities, currency, publicIdentifier }: { categories: GuestMenuCategory[]; capabilities: GuestMenuResponse['capabilities']; currency: string; publicIdentifier: string }) {
  const { verified } = useGuestSession()
  const cart = useGuestCart()
  useEffect(() => { cart.setContext(publicIdentifier) }, [cart.setContext, publicIdentifier])
  const canOrder = capabilities.menuMode === 'ordering' && capabilities.guestAccessEnabled
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug || '')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [accessOpen, setAccessOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [pendingItem, setPendingItem] = useState<GuestMenuItem | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const normalizedQuery = query.trim().toLowerCase()
  const filteredCategories = useMemo(() => categories.map((category) => ({ ...category, items: category.items.filter((item) => !normalizedQuery || `${item.name} ${item.description} ${item.dietaryInfo}`.toLowerCase().includes(normalizedQuery)) })), [categories, normalizedQuery])

  const selectCategory = (slug: string) => {
    setActiveSlug(slug)
    sectionRefs.current[slug]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const addItem = (item: GuestMenuItem, force = false) => {
    if (!verified && !force) { setPendingItem(item); setAccessOpen(true); return }
    cart.add({ identifier: item.identifier, name: item.name, price: item.price, currency, image: item.image, instructions: '' })
    setNotice(`${item.name} added to your stay.`)
  }

  return <div className="guest-app guest-menu-app">
    <main className="guest-menu-page" aria-label="Hotel menu">
      <header className="guest-menu-header">
        <a href={`/guest/${encodeURIComponent(publicIdentifier)}`} className="guest-menu-back" aria-label="Back to hotel home" onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', `/guest/${encodeURIComponent(publicIdentifier)}`); window.dispatchEvent(new PopStateEvent('popstate')) }}><ArrowLeft size={22} strokeWidth={1.7} /></a>
        {searchOpen ? <div className="guest-menu-search"><Search size={17} aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search menu" placeholder="Search menu" /><button type="button" onClick={() => { setQuery(''); setSearchOpen(false) }} aria-label="Close search"><X size={18} /></button></div> : <h1>Menu</h1>}
        <button type="button" className="guest-menu-search-toggle" onClick={() => setSearchOpen(true)} aria-label="Search menu"><Search size={20} strokeWidth={1.7} /></button>
      </header>
      <nav className="guest-menu-tabs" aria-label="Menu categories">
        {categories.map((category) => <button key={category.slug} type="button" className={category.slug === activeSlug ? 'is-active' : ''} onClick={() => selectCategory(category.slug)}>{category.name}</button>)}
      </nav>
      <div className="guest-menu-sections" aria-live="polite">
        {filteredCategories.map((category) => <section key={category.slug} ref={(element) => { sectionRefs.current[category.slug] = element }} className="guest-menu-section" aria-labelledby={`menu-${category.slug}`}>
          <h2 id={`menu-${category.slug}`}>{category.name}</h2>
          {category.description && <p className="guest-menu-section__description">{category.description}</p>}
          {category.items.map((item) => <MenuItemCard key={item.identifier} item={item} currency={currency} canOrder={canOrder} onAdd={() => addItem(item)} />)}
          {!category.items.length && <p className="guest-menu-empty-category">{normalizedQuery ? 'No matching items in this category.' : 'No items available right now.'}</p>}
        </section>)}
        {!filteredCategories.some((category) => category.items.length) && normalizedQuery && <div className="guest-menu-empty"><Search size={23} /><strong>No menu items found</strong><span>Try another dish or clear your search.</span></div>}
        {!categories.length && <div className="guest-menu-empty"><Utensils size={23} /><strong>Menu is resting</strong><span>There are no guest menu categories available right now.</span></div>}
      </div>
    </main>
    {canOrder && cart.itemCount > 0 && <button className="guest-menu-cart" type="button" onClick={() => setCartOpen(true)} aria-label="Open your order"><Check size={15} /> {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · Review order</button>}
    {notice && <button className="guest-notice" type="button" onClick={() => setNotice('')} aria-label="Dismiss message">{notice}</button>}
    {canOrder && <GuestAccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} onVerified={() => { if (pendingItem) addItem(pendingItem, true); setPendingItem(null) }} />}
    {canOrder && cartOpen && <GuestCartSheet publicIdentifier={publicIdentifier} currency={currency} onClose={() => setCartOpen(false)} />}
    <GuestBottomNav publicIdentifier={publicIdentifier} active="menu" showServices={capabilities.servicesVisible} />
  </div>
}

export function GuestMenuPage({ publicIdentifier }: Props) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: GuestMenuResponse; message?: string }>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    apiFetch<GuestMenuResponse>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/menu/`, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof ApiError && error.status === 404 ? 'This guest touchpoint is no longer available.' : displayError(error) }) })
    return () => controller.abort()
  }, [publicIdentifier])

  if (state.status === 'loading') return <div className="guest-state" role="status"><span className="guest-state__mark">A</span><p>Preparing the menu…</p></div>
  if (state.status === 'error' || !state.data) return <div className="guest-state"><span className="guest-state__mark">A</span><h1>Menu unavailable</h1><p>{state.message}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
  return <GuestSessionProvider publicIdentifier={publicIdentifier} guestAccessEnabled={state.data.capabilities.guestAccessEnabled}><GuestMenuContent categories={state.data.categories} capabilities={state.data.capabilities} currency={state.data.currency} publicIdentifier={publicIdentifier} /></GuestSessionProvider>
}

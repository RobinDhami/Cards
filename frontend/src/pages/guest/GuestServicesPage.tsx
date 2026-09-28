import { useCallback, useEffect, useMemo, useState } from 'react'
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import { ApiError, apiFetch, displayError } from '../../lib/api'
import { serviceIconMap } from '../../lib/serviceIcons'
import { GuestBottomNav } from '../../features/hotel-guest/GuestBottomNav'
import { GuestSessionProvider } from '../../features/hotel-guest/GuestSessionContext'
import { GuestAccessDialog } from '../../features/hotel-guest/GuestAccessDialog'
import { GuestServiceRequestSheet } from '../../features/hotel-guest/GuestServiceRequestSheet'
import { useGuestSession } from '../../features/hotel-guest/useGuestSession'
import type { GuestServicesResponse, GuestService } from '../../features/hotel-guest/types-services'
import './GuestServicesPage.css'

type Props = { publicIdentifier: string }

function ServiceCard({ service, onSelect, whatsappHref }: { service: GuestService; onSelect?: () => void; whatsappHref?: string }) {
  const Icon = serviceIconMap[service.iconIdentifier] || Sparkles
  const card = <><span className="guest-service-card__icon"><Icon size={25} strokeWidth={1.7} /></span>
    <span className="guest-service-card__copy"><strong>{service.name}</strong><small>{service.shortDescription || service.description || 'Available during your stay'}</small></span>
    <ChevronRight className="guest-service-card__chevron" size={20} strokeWidth={1.6} aria-hidden="true" /></>
  if (whatsappHref) return <a className="guest-service-card" href={whatsappHref} target="_blank" rel="noreferrer" aria-label={`Contact about ${service.name}`}>{card}</a>
  if (!onSelect) return <article className="guest-service-card is-informational">{card}</article>
  return <button className="guest-service-card" type="button" onClick={onSelect} aria-label={`Request ${service.name}`}>{card}</button>
}

function GuestServicesContent({ categories, capabilities, currency, whatsapp, publicIdentifier }: { categories: GuestServicesResponse['categories']; capabilities: GuestServicesResponse['capabilities']; currency: string; whatsapp: string; publicIdentifier: string }) {
  const [accessOpen, setAccessOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<GuestService | null>(null)
  const [pendingService, setPendingService] = useState<GuestService | null>(null)
  const { verified } = useGuestSession()
  const services = useMemo(() => categories.flatMap((category) => category.services), [categories])
  const canRequest = capabilities.servicesVisible && capabilities.serviceMode === 'digital_request' && capabilities.guestAccessEnabled
  const selectService = (service: GuestService) => { if (verified) setSelectedService(service); else { setPendingService(service); setAccessOpen(true) } }
  const requestAccess = useCallback(() => setAccessOpen(true), [])
  useEffect(() => { const clearSensitiveState = () => { setAccessOpen(false); setSelectedService(null); setPendingService(null) }; window.addEventListener('guest-access-logout', clearSensitiveState); return () => window.removeEventListener('guest-access-logout', clearSensitiveState) }, [])
  const whatsappBase = whatsapp.replace(/\D/g, '').length >= 7 ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : ''
  return <div className="guest-app guest-services-app">
    <main className="guest-services-page" aria-label="Hotel services">
      <header className="guest-services-header">
        <a href={`/guest/${encodeURIComponent(publicIdentifier)}`} className="guest-services-back" aria-label="Back to hotel home" onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', `/guest/${encodeURIComponent(publicIdentifier)}`); window.dispatchEvent(new PopStateEvent('popstate')) }}><ArrowLeft size={22} strokeWidth={1.7} /></a>
        <h1>Services</h1>
        <span className="guest-services-header__balance" aria-hidden="true" />
      </header>
      <section className="guest-services-list" aria-live="polite">
        {services.map((service) => <ServiceCard key={service.identifier} service={service} onSelect={canRequest ? () => selectService(service) : undefined} whatsappHref={capabilities.serviceMode === 'whatsapp' && whatsappBase ? `${whatsappBase}?text=${encodeURIComponent(`Hello, I would like to ask about ${service.name}.`)}` : undefined} />)}
        {!services.length && <div className="guest-services-empty"><Sparkles size={23} /><h2>Services are resting</h2><p>There are no guest services available right now.</p></div>}
      </section>
    </main>
    {canRequest && <GuestAccessDialog open={accessOpen} onClose={() => setAccessOpen(false)} onVerified={() => { if (pendingService) { setSelectedService(pendingService); setPendingService(null) } }} />}
    {canRequest && selectedService && <GuestServiceRequestSheet service={selectedService} currency={currency} publicIdentifier={publicIdentifier} onClose={() => setSelectedService(null)} onAccessRequired={requestAccess} />}
    <GuestBottomNav publicIdentifier={publicIdentifier} active="services" showMenu={capabilities.menuVisible} />
  </div>
}

export function GuestServicesPage({ publicIdentifier }: Props) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; categories?: GuestServicesResponse['categories']; capabilities?: GuestServicesResponse['capabilities']; currency?: string; whatsapp?: string; message?: string }>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    apiFetch<GuestServicesResponse>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/services/`, { signal: controller.signal })
      .then((response) => setState({ status: 'ready', categories: response.categories, capabilities: response.capabilities, currency: response.currency, whatsapp: response.whatsapp }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof ApiError && error.status === 404 ? 'This guest touchpoint is no longer available.' : displayError(error) }) })
    return () => controller.abort()
  }, [publicIdentifier])

  if (state.status === 'loading') return <div className="guest-state" role="status"><span className="guest-state__mark">A</span><p>Preparing services…</p></div>
  if (state.status === 'error' || !state.categories || !state.capabilities) return <div className="guest-state"><span className="guest-state__mark">A</span><h1>Services unavailable</h1><p>{state.message}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
  return <GuestSessionProvider publicIdentifier={publicIdentifier} guestAccessEnabled={state.capabilities.guestAccessEnabled}><GuestServicesContent categories={state.categories} capabilities={state.capabilities} currency={state.currency ?? 'USD'} whatsapp={state.whatsapp ?? ''} publicIdentifier={publicIdentifier} /></GuestSessionProvider>
}

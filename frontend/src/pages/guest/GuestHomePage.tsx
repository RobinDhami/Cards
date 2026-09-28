import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.js'
import Bell from 'lucide-react/dist/esm/icons/bell.js'
import Instagram from 'lucide-react/dist/esm/icons/instagram.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Star from 'lucide-react/dist/esm/icons/star.js'
import Utensils from 'lucide-react/dist/esm/icons/utensils.js'
import { ApiError, apiFetch, displayError } from '../../lib/api'
import { GuestSessionProvider } from '../../features/hotel-guest/GuestSessionContext'
import { GuestBottomNav } from '../../features/hotel-guest/GuestBottomNav'
import { navigateGuest } from '../../features/hotel-guest/guest-navigation'
import type { GuestExperienceResponse, GuestLink } from '../../features/hotel-guest/types'
import './GuestHomePage.css'

type Props = { publicIdentifier: string }

function linkFor(links: GuestLink[], type: string) {
  return links.find((link) => link.type.toLowerCase() === type)
}

function GuestHomeContent({ data, publicIdentifier }: { data: GuestExperienceResponse['experience']; publicIdentifier: string }) {
  const [notice, setNotice] = useState('')
  const { hotel, theme, offer, links, capabilities } = data
  const location = linkFor(links, 'location')
  const instagram = linkFor(links, 'instagram')
  const facebook = linkFor(links, 'facebook')
  const whatsapp = linkFor(links, 'whatsapp')
  const phone = hotel.phone ? `tel:${hotel.phone}` : ''
  const whatsappHref = whatsapp?.value || (hotel.whatsapp ? `https://wa.me/${hotel.whatsapp.replace(/\D/g, '')}` : '')
  const themeStyle = useMemo(() => ({
    '--guest-accent': theme.primaryColor || '#9c6c2c',
    '--guest-page': theme.backgroundColor || '#f7f4ee',
    '--guest-ink': theme.textColor || '#1d2022',
    '--guest-radius': `${theme.cardRadius ?? 18}px`,
    '--guest-button-radius': `${theme.buttonRadius ?? 16}px`,
  }) as CSSProperties, [theme])

  const actionMessage = (message: string) => setNotice(message)
  const protectedFeedback = () => actionMessage('A Google Review link is not available yet.')
  const reviewLink = hotel.googleReviewUrl
  return (
    <div className="guest-app" style={themeStyle}>
      <main className="guest-home" aria-label={`${hotel.name} guest home`}>
        <section className="guest-hero" aria-label={`${hotel.name} welcome image`}>
          {hotel.heroImage ? <img src={hotel.heroImage} alt="" className="guest-hero__image" /> : <div className="guest-hero__fallback" aria-hidden="true" />}
          <div className="guest-hero__shade" aria-hidden="true" />
          <div className="guest-hero__copy"><span>Good<br />Stays<br />Brighter<br />Days</span><small>A KINDER<br />WORLD<br />THROUGH<br />HOSPITALITY</small></div>
          <div className="guest-logo" aria-label={`${hotel.name} logo`}>
            {hotel.logo ? <img src={hotel.logo} alt="" /> : <span aria-hidden="true">A</span>}
            <small>{hotel.name}</small>
          </div>
        </section>

        <section className="guest-welcome">
          <h1>Welcome to {hotel.name}</h1>
          <p>{hotel.shortDescription || 'Everything you need during your stay, one tap away.'}</p>
        </section>

        <section className="guest-actions" aria-label="Quick actions">
          {capabilities.menuVisible && <a href={`/guest/${encodeURIComponent(publicIdentifier)}/menu`} onClick={(event) => navigateGuest(event, `/guest/${encodeURIComponent(publicIdentifier)}/menu`)}><span className="guest-action-icon"><Utensils size={20} /></span><span>View Menu</span></a>}
          {capabilities.servicesVisible && <a href={`/guest/${encodeURIComponent(publicIdentifier)}/services`} onClick={(event) => navigateGuest(event, `/guest/${encodeURIComponent(publicIdentifier)}/services`)}><span className="guest-action-icon"><Bell size={20} /></span><span>{capabilities.serviceMode === 'view_only' ? 'View Services' : capabilities.serviceMode === 'whatsapp' ? 'Contact Services' : 'Request Service'}</span></a>}
          <a href={phone || whatsappHref || '#'} onClick={(event) => { if (!phone && !whatsappHref) { event.preventDefault(); actionMessage('No phone or WhatsApp contact is available.') } }}><span className="guest-action-icon"><Phone size={20} /></span><span>Call / WhatsApp</span></a>
          {capabilities.reviewVisible && (reviewLink ? <a href={reviewLink} target="_blank" rel="noreferrer"><span className="guest-action-icon"><Star size={20} /></span><span>Leave a Review</span></a> : <button type="button" onClick={protectedFeedback}><span className="guest-action-icon"><Star size={20} /></span><span>Leave a Review</span></button>)}
        </section>

        {offer && <section className="guest-offer" aria-label="Special offer" style={offer.image ? { backgroundImage: `url(${offer.image})` } : undefined}>
          <div className="guest-offer__shade" />
          <div className="guest-offer__copy"><small>Special Offer</small><h2>{offer.title}</h2><p>{offer.shortDescription || offer.description}</p></div>
          {offer.destinationUrl && <a href={offer.destinationUrl} target="_blank" rel="noreferrer">{offer.buttonLabel || 'Learn More'}</a>}
        </section>}

        {capabilities.reviewVisible && (reviewLink ? <a className="guest-review-prompt" href={reviewLink} target="_blank" rel="noreferrer">
          <span className="guest-review-prompt__stars"><Star size={14} /><Star size={14} /><Star size={14} /></span><span><strong>Enjoying your stay?</strong><small>Share your experience and help<br />us spread the word.</small></span><ArrowRight size={18} />
        </a> : <button className="guest-review-prompt" type="button" onClick={protectedFeedback}>
          <span className="guest-review-prompt__stars"><Star size={14} /><Star size={14} /><Star size={14} /></span><span><strong>Enjoying your stay?</strong><small>Share your experience and help<br />us spread the word.</small></span><ArrowRight size={18} />
        </button>)}

        <section className="guest-socials" aria-label="Hotel links">
          {capabilities.contactLinksVisible && location && <a href={location.value} target="_blank" rel="noreferrer"><span><MapPin size={18} /></span><small>{location.label || 'Location'}</small></a>}
          {capabilities.contactLinksVisible && instagram && <a href={instagram.value} target="_blank" rel="noreferrer"><span><Instagram size={18} /></span><small>{instagram.label || 'Instagram'}</small></a>}
          {capabilities.contactLinksVisible && facebook && <a href={facebook.value} target="_blank" rel="noreferrer"><span><span className="guest-socials__facebook">f</span></span><small>{facebook.label || 'Facebook'}</small></a>}
          {capabilities.contactLinksVisible && whatsapp && <a href={whatsapp.value} target="_blank" rel="noreferrer"><span><MessageCircle size={18} /></span><small>{whatsapp.label || 'WhatsApp'}</small></a>}
        </section>
      </main>
      {notice && <button className="guest-notice" type="button" onClick={() => setNotice('')} aria-label="Dismiss message">{notice}</button>}
      <GuestBottomNav publicIdentifier={publicIdentifier} showServices={capabilities.servicesVisible} showMenu={capabilities.menuVisible} />
    </div>
  )
}

export function GuestHomePage({ publicIdentifier }: Props) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: GuestExperienceResponse['experience']; message?: string }>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    apiFetch<GuestExperienceResponse>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/`, { signal: controller.signal })
      .then((response) => setState({ status: 'ready', data: response.experience }))
      .catch((error: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof ApiError && error.status === 404 ? 'This guest touchpoint is no longer available.' : displayError(error) }) })
    return () => controller.abort()
  }, [publicIdentifier])

  if (state.status === 'loading') return <div className="guest-state"><span className="guest-state__mark">A</span><p>Preparing your stay…</p></div>
  if (state.status === 'error' || !state.data) return <div className="guest-state"><span className="guest-state__mark">A</span><h1>Guest experience unavailable</h1><p>{state.message}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
  return <GuestSessionProvider publicIdentifier={publicIdentifier} guestAccessEnabled={state.data.capabilities.guestAccessEnabled}><GuestHomeContent data={state.data} publicIdentifier={publicIdentifier} /></GuestSessionProvider>
}

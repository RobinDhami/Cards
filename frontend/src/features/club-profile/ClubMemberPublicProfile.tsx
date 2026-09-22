import { useEffect, useMemo, useState } from 'react'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days.js'
import Facebook from 'lucide-react/dist/esm/icons/facebook.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import IdCard from 'lucide-react/dist/esm/icons/id-card.js'
import Instagram from 'lucide-react/dist/esm/icons/instagram.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Quote from 'lucide-react/dist/esm/icons/quote.js'
import Send from 'lucide-react/dist/esm/icons/send.js'
import Share2 from 'lucide-react/dist/esm/icons/share-2.js'
import Star from 'lucide-react/dist/esm/icons/star.js'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import { apiFetch, backendHref } from '../../lib/api'
import type { PublicStudent } from '../digital-card/types'
import './ClubMemberPublicProfile.css'

type SocialLink = { id: number; platform: string; url: string; label: string }
type ClubEvent = { id: number; title: string; description: string; startsAt: string; endsAt: string; location: string; isPublished: boolean }

type ClubProfile = {
  organization: {
    name: string
    logo: string
    cover: string
    slogan: string
    theme: { primary: string; secondary: string; accent: string }
    district: string
    zone: string
    chartered_on: string
    sponsoring_club: string
    email: string
    phone: string
    website: string
    address: string
    map_url: string
    about: string
    hero_left_text: string
    hero_right_text: string
    hero_quote: string
    cta: { title: string; subtitle: string; button_label: string }
    social_links: SocialLink[]
    events: ClubEvent[]
  }
  member: {
    name: string
    photo: string
    role: string
    member_id: string
    committee: string
    membership_term: string
    join_date: string
    bio: string
    quote: string
    email: string
    phone: string
    address: string
    website: string
    social_links: SocialLink[]
    enable_connect: boolean
    enable_save_contact: boolean
    is_active: boolean
  }
}

type Props = {
  studentId: number
  actions?: Pick<PublicStudent['actions'], 'vcard' | 'qr'>
}

const SOCIAL_ICONS = {
  email: Mail,
  instagram: Instagram,
  facebook: Facebook,
  website: Globe2,
} as const

function displayDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`))
}

function clubSocialLabel(link: SocialLink) {
  if (link.label) return link.label
  return link.platform.charAt(0).toUpperCase() + link.platform.slice(1)
}

function ContactTile({ href, icon, label, value }: { href?: string; icon: React.ReactNode; label: string; value: string }) {
  const body = <>{icon}<strong>{label}</strong><span>{value}</span></>
  return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{body}</a> : <div>{body}</div>
}

export function ClubMemberPublicProfile({ studentId, actions }: Props) {
  const [profile, setProfile] = useState<ClubProfile | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    apiFetch<{ profile: ClubProfile }>(`/api/club-members/${studentId}/`)
      .then((payload) => {
        if (!current) return
        setProfile(payload.profile)
        document.title = `${payload.profile.member.name} | ${payload.profile.organization.name}`
      })
      .catch(() => current && setError('This club member profile is not available.'))
    return () => { current = false }
  }, [studentId])

  const socialLinks = useMemo(() => {
    if (!profile) return []
    const allowed = new Set(['email', 'website', 'facebook', 'instagram'])
    const links = profile.organization.social_links.filter((link) => allowed.has(link.platform.toLowerCase()))
    const organizationPlatforms = new Set(links.map((link) => link.platform.toLowerCase()))
    profile.member.social_links.forEach((link) => {
      if (allowed.has(link.platform.toLowerCase()) && !organizationPlatforms.has(link.platform.toLowerCase())) links.push(link)
    })
    if (profile.member.email && !organizationPlatforms.has('email')) links.unshift({ id: -1, platform: 'email', url: `mailto:${profile.member.email}`, label: 'Email' })
    return links
  }, [profile])

  if (error) return <main className="club-public-state"><h1>Profile unavailable</h1><p>{error}</p></main>
  if (!profile) return <main className="club-public-state"><p>Loading club profile…</p></main>

  const { organization, member } = profile
  const cardActions = actions || {
    vcard: `/student/${studentId}/download-vcard/`,
    qr: `/student/${studentId}/print-qr.png`,
  }
  const publicUrl = window.location.href
  const connectHref = member.email ? `mailto:${member.email}` : member.phone ? `tel:${member.phone}` : organization.website
  const displayedWebsite = organization.website || member.website
  const websiteHref = displayedWebsite ? (displayedWebsite.startsWith('http') ? displayedWebsite : `https://${displayedWebsite}`) : ''
  const mapEmbedUrl = organization.address ? `https://www.google.com/maps?q=${encodeURIComponent(organization.address)}&output=embed` : ''
  const theme = {
    '--club-primary': organization.theme.primary || '#00777c',
    '--club-navy': organization.theme.secondary || '#082b58',
    '--club-gold': organization.theme.accent || '#d7a327',
  } as React.CSSProperties

  async function shareProfile() {
    try {
      if (navigator.share) await navigator.share({ title: member.name, text: `${member.name} — ${organization.name}`, url: publicUrl })
      else {
        await navigator.clipboard.writeText(publicUrl)
        setNotice('Profile link copied')
      }
    } catch { setNotice('Sharing was cancelled') }
  }

  return (
    <main className="club-public-page" style={theme}>
      {notice ? <button className="club-public-toast" type="button" onClick={() => setNotice('')}>{notice}</button> : null}
      <article className="club-profile-card">
        <header className="club-profile-header">
          <div className="club-profile-brand">
            <span>{organization.logo ? <img src={backendHref(organization.logo)} alt={`${organization.name} logo`} /> : <strong className="club-profile-brand__fallback">{organization.name.slice(0, 1)}</strong>}</span>
            <div><strong>{organization.name}</strong><small>{organization.slogan || 'Leadership · Service · Impact'}</small></div>
          </div>
          <nav aria-label="Profile actions">
            <button type="button" onClick={shareProfile} aria-label="Share profile"><Share2 /></button>
            {cardActions.qr ? <a href={backendHref(cardActions.qr)} target="_blank" rel="noreferrer" aria-label="Open QR code"><QrCode /></a> : null}
          </nav>
        </header>

        <section className="club-profile-hero">
          {organization.cover ? <img src={backendHref(organization.cover)} alt="" /> : null}
        </section>

        <section className="club-member-intro">
          <div className="club-member-photo">
            {member.photo ? <img src={backendHref(member.photo)} alt={member.name} /> : <span>{member.name.slice(0, 1)}</span>}
            {member.is_active ? <i aria-label="Active member" /> : null}
          </div>
          <div className="club-member-heading">
            <div><h1>{member.name}</h1><h2>{member.role || 'Club Member'} <i>·</i> {organization.name}</h2>{member.member_id ? <span><IdCard />Member ID: {member.member_id}</span> : null}</div>
            <aside><Star /><strong>{member.committee || 'Club Member'}</strong>{member.membership_term ? <span>{member.membership_term}</span> : null}</aside>
          </div>
        </section>

        {(member.enable_connect || member.enable_save_contact) ? <nav className="club-profile-primary-actions" aria-label="Member actions">
          {member.enable_connect && connectHref ? <a href={connectHref}><MessageCircle />Contact Me</a> : null}
          {member.enable_save_contact && cardActions.vcard ? <a href={backendHref(cardActions.vcard)}><UserPlus />Save Contact</a> : null}
        </nav> : null}

        {(member.bio || member.quote) ? <section className="club-about-panel">
          <Quote aria-hidden="true" />
          <div><h2>About Me</h2>{member.bio ? <p>{member.bio}</p> : null}</div>
          {member.quote ? <blockquote>{member.quote}</blockquote> : null}
        </section> : null}

        {organization.about ? <section className="club-about-panel club-about-panel--organization">
          <Quote aria-hidden="true" />
          <div><h2>About {organization.name}</h2><p>{organization.about}</p></div>
        </section> : null}

        <section className="club-profile-section">
          <h2>Contact Information</h2>
          <div className="club-contact-grid">
            {member.email ? <ContactTile href={`mailto:${member.email}`} icon={<Mail />} label="Email" value={member.email} /> : null}
            {member.address ? <ContactTile icon={<MapPin />} label="Address" value={member.address} /> : null}
            {displayedWebsite ? <ContactTile href={websiteHref} icon={<Globe2 />} label="Website" value={displayedWebsite.replace(/^https?:\/\//, '')} /> : null}
          </div>
        </section>

        <section className="club-profile-section">
          <h2>Club Information</h2>
          <div className="club-information-panel">
            <dl>
              {organization.chartered_on ? <div><dt><CalendarDays />Chartered On</dt><dd>{displayDate(organization.chartered_on)}</dd></div> : null}
              {organization.sponsoring_club ? <div><dt><Users />Sponsoring Club</dt><dd>{organization.sponsoring_club}</dd></div> : null}
              {organization.email ? <div><dt><Mail />Club Email</dt><dd>{organization.email}</dd></div> : null}
              {organization.phone ? <div><dt><Phone />Club Phone</dt><dd>{organization.phone}</dd></div> : null}
            </dl>
            {(organization.map_url || organization.address) ? <div className="club-map-card">
              {mapEmbedUrl ? <iframe title={`${organization.name} location`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div><MapPin /><strong>{organization.name}</strong></div>}
              <a href={organization.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(organization.address)}`} target="_blank" rel="noreferrer"><MapPin />View on Map</a>
            </div> : null}
          </div>
        </section>

        {organization.events.length > 0 ? <section className="club-profile-section">
          <h2>Upcoming Events</h2>
          <div className="club-events-grid">{organization.events.map((event) => <article key={event.id}><strong>{event.title}</strong><time>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.startsAt))}</time>{event.location ? <span>{event.location}</span> : null}{event.description ? <p>{event.description}</p> : null}</article>)}</div>
        </section> : null}

        {socialLinks.length > 0 ? <section className="club-profile-section">
          <h2>Personal Links</h2>
          <div className="club-social-grid">{socialLinks.map((link) => {
            const Icon = SOCIAL_ICONS[link.platform.toLowerCase() as keyof typeof SOCIAL_ICONS] || Globe2
            const href = link.platform.toLowerCase() === 'email' && !link.url.startsWith('mailto:') ? `mailto:${link.url}` : link.url
            return <a className={`club-social-link-${link.platform.toLowerCase()}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} key={link.id}><Icon /><span>{clubSocialLabel(link)}</span></a>
          })}</div>
        </section> : null}

        <footer className="club-profile-cta">
          <span><Users /></span>
          <div><strong>{organization.cta.title || 'Let’s Build a Better Tomorrow'}</strong><small>{organization.cta.subtitle || 'Service today, a brighter tomorrow.'}</small></div>
          {connectHref ? <a href={connectHref}><Send />{organization.cta.button_label || 'Connect with me'}</a> : null}
        </footer>
      </article>
    </main>
  )
}

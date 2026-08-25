import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, CSSProperties, FormEvent, SVGProps } from 'react'
import Badge from 'lucide-react/dist/esm/icons/badge.js'
import BarChart2 from 'lucide-react/dist/esm/icons/bar-chart-2.js'
import BookOpen from 'lucide-react/dist/esm/icons/book-open.js'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check.js'
import Check from 'lucide-react/dist/esm/icons/check.js'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.js'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js'
import FileText from 'lucide-react/dist/esm/icons/file-text.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.js'
import LinkIcon from 'lucide-react/dist/esm/icons/link.js'
import LockKeyhole from 'lucide-react/dist/esm/icons/lock-keyhole.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import MapPinned from 'lucide-react/dist/esm/icons/map-pinned.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import Pencil from 'lucide-react/dist/esm/icons/pencil.js'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.js'
import Radar from 'lucide-react/dist/esm/icons/radar.js'
import Share2 from 'lucide-react/dist/esm/icons/share-2.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import Send from 'lucide-react/dist/esm/icons/send.js'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.js'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { ApiError, apiFetch, appHref, backendHref, displayError, jsonBody } from '../../lib/api'
import { serviceIconMap } from '../../lib/serviceIcons'
import './PublicProfessionalProfile.css'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

type PublicAction = {
  href: string
  label: string
  icon: string
  brand_class: string
  external?: boolean
}

type PublicProfile = {
  id: number
  slug: string
  templateName: 'modern_identity'
  profileFocus: 'organization' | 'personal'
  fullName: string
  initials: string
  profilePhotoUrl: string
  coverPhotoUrl: string
  profession: string
  designation: string
  companyName: string
  headerIdentity: 'organization' | 'personal' | 'hidden'
  organizationLogoUrl: string
  organizationTagline: string
  personalLogoUrl: string
  brandName: string
  brandTagline: string
  profileIdentifierLabel: string
  profileIdentifier: string
  industry: string
  workRole: string
  workOrganization: string
  workExperience: string
  workAddress: string
  academicTitle: string
  academicSection: string
  academicInstitution: string
  academicLevel: string
  academicYear: string
  academicSpecialization: string
  academicStatus: string
  academicCertification: string
  academicAddress: string
  shortTagline: string
  about: string
  currentFocus: string
  featuredInterest: string
  currentStatusLabel: string
  lookingForLabels: string[]
  preferredWorkModeLabel: string
  networkingStatement: string
  phone: string
  whatsappNumber: string
  email: string
  website: string
  bookingUrl: string
  officeAddress: string
  publicMapUrl: string
  businessHours: string
  location: string
  isVerified: boolean
  accentColor: string
}

type ServiceItem = {
  id: number
  title: string
  description: string
  icon: string
  href: string
}

type HighlightItem = {
  id: number
  title: string
  highlightTypeLabel: string
  organization: string
  period: string
  description: string
  imageUrl: string
  link: string
}

type TestimonialItem = {
  id: number
  clientName: string
  clientRole: string
  organization: string
  reviewText: string
}

type DocumentItem = {
  id: number
  title: string
  url: string
  documentTypeLabel: string
}

type PublicProfileData = {
  seo: {
    title: string
    description: string
    publicUrl: string
    schema: Record<string, string>
  }
  profile: PublicProfile
  actions: {
    primary: PublicAction[]
    organizationLinks: PublicAction[]
    extra: PublicAction[]
    featuredCta: PublicAction | null
    qrCodeUrl: string
    vcardUrl: string
    editLoginUrl: string
    analyticsUrl: string
    isProfileOwnerView: boolean
    canEditProfile?: boolean
  }
  services: ServiceItem[]
  highlights: HighlightItem[]
  testimonials: TestimonialItem[]
  documents: DocumentItem[]
}

const actionIcons: Record<string, LucideIcon> = {
  'calendar-check': CalendarCheck,
  'external-link': ExternalLink,
  globe: Globe2,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  phone: Phone,
  'user-plus': UserPlus,
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M14 8.5V6.7c0-.9.6-1.1 1-1.1h2.7V2.1L14.2 2C10.8 2 9 4.1 9 6.4v2.1H6v3.9h3V22h4.1v-9.6h3.3l.5-3.9H13Z" />
    </svg>
  )
}

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.8 8.7c-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.9 1.1A9.8 9.8 0 0 1 12 6.7c.8 0 1.5.1 2.2.3 2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.5.1 2.8a3.9 3.9 0 0 1 1.1 2.8c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
    </svg>
  )
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5-2.7a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
    </svg>
  )
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M5 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.6h.1c.5-.9 1.8-1.9 3.7-1.9 4 0 4.7 2.6 4.7 6V21h-4v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9Z" />
    </svg>
  )
}

function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M21.6 7.2s-.2-1.6-.8-2.3c-.8-.8-1.7-.8-2.1-.9C15.8 3.8 12 3.8 12 3.8s-3.8 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.7-.8 2.3-.8 2.3S2.2 9.1 2.2 11v1.8c0 1.9.2 3.8.2 3.8s.2 1.6.8 2.3c.8.8 1.9.8 2.4.9 1.7.2 6.4.2 6.4.2s3.8 0 6.7-.2c.4-.1 1.3-.1 2.1-.9.6-.7.8-2.3.8-2.3s.2-1.9.2-3.8V11c0-1.9-.2-3.8-.2-3.8ZM10 15.2V8.6l6.2 3.3-6.2 3.3Z" />
    </svg>
  )
}

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M14.2 2h3.1c.3 2.2 1.6 3.8 3.7 4.4v3.2c-1.4 0-2.7-.4-3.8-1.1v6.4a7 7 0 1 1-6-6.9v3.3a3.8 3.8 0 1 0 2.9 3.7V2Z" />
    </svg>
  )
}

const socialIcons: Record<string, LucideIcon> = {
  facebook: FacebookIcon,
  github: GitHubIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
}

function profileSlugFromPath() {
  const match = window.location.pathname.match(/^\/p\/([^/]+)\/?/)
  return match?.[1] ?? ''
}

function isTruthy(value: string | number | null | undefined) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function socialTone(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-')
}

function actionHref(href: string) {
  return href.startsWith('/') ? backendHref(href) : appHref(href)
}

function TopBar({ data, onShare }: { data: PublicProfileData; onShare: () => void }) {
  const { profile } = data
  const isPersonal = profile.headerIdentity === 'personal'
  const logoUrl = isPersonal ? profile.personalLogoUrl : profile.organizationLogoUrl
  const brandTitle = isPersonal
    ? profile.brandName || profile.fullName
    : profile.companyName || profile.brandName || profile.fullName
  const brandSubtitle = isPersonal
    ? profile.brandTagline || profile.profession || 'Personal brand'
    : profile.organizationTagline || profile.brandTagline || 'Verified digital profile'
  const MarkIcon = isPersonal ? Badge : Building2

  return (
    <header className="profile-topbar">
      {profile.headerIdentity !== 'hidden' ? (
        <div className="profile-brand">
          <span className="profile-brand-mark">
            {logoUrl ? <img src={logoUrl} alt={`${brandTitle} logo`} /> : <MarkIcon size={21} aria-hidden="true" />}
          </span>
          <span className="profile-brand-copy">
            <strong>{brandTitle}</strong>
            <span>{brandSubtitle}</span>
          </span>
        </div>
      ) : (
        <div className="profile-brand is-hidden" />
      )}
      <div className="profile-top-actions">
        {data.actions.editLoginUrl ? (
          <a className="profile-top-action" href={appHref(data.actions.editLoginUrl)} aria-label="Edit profile" title="Edit profile">
            <Pencil size={18} aria-hidden="true" />
          </a>
        ) : null}
        <button className="profile-top-action" type="button" aria-label="Share profile" onClick={onShare}>
          <Share2 size={18} aria-hidden="true" />
        </button>
        <a className="profile-top-action" href={backendHref(data.actions.qrCodeUrl)} aria-label="Open QR code">
          <QrCode size={18} aria-hidden="true" />
        </a>
      </div>
    </header>
  )
}

function Hero({ profile }: { profile: PublicProfile }) {
  return (
    <>
      <section className="profile-hero" aria-label="Profile header">
        <div className="profile-cover">{profile.coverPhotoUrl ? <img src={profile.coverPhotoUrl} alt={`${profile.fullName} cover`} /> : null}</div>
        <div className="profile-portrait">
          {profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt={profile.fullName} /> : profile.initials}
        </div>
      </section>

      <section className="profile-identity">
        <div className="profile-name-line">
          <h1>{profile.fullName}</h1>
          {profile.isVerified ? (
            <span className="profile-verified" title="Verified profile">
              <Check size={13} aria-hidden="true" />
            </span>
          ) : null}
        </div>
        <p className="profile-role">
          {profile.designation || profile.profession || 'Professional Profile'}
          {profile.companyName ? ` · ${profile.companyName}` : ''}
        </p>
        {profile.location ? (
          <p className="profile-location">
            <MapPin aria-hidden="true" />
            {profile.location}
          </p>
        ) : null}
      </section>
    </>
  )
}

function PrimaryActions({ actions }: { actions: PublicAction[] }) {
  if (actions.length === 0) {
    return null
  }
  return (
    <nav className="profile-actions" aria-label="Contact actions">
      {actions.map((action) => {
        const Icon = actionIcons[action.icon] ?? LinkIcon
        return (
          <a className="profile-action" href={actionHref(action.href)} target={action.external ? '_blank' : undefined} rel={action.external ? 'noopener noreferrer' : undefined} key={action.label}>
            <span className={`profile-action-icon ${action.brand_class}`}>
              <Icon size={16} aria-hidden="true" />
            </span>
            <span>{action.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

function OrganizationActionPair({ data }: { data: PublicProfileData }) {
  const { featuredCta, primary, vcardUrl } = data.actions
  const cta = featuredCta?.label.toLowerCase() === 'save contact'
    ? primary[0] ?? null
    : featuredCta
  const CtaIcon = cta ? actionIcons[cta.icon] ?? LinkIcon : LinkIcon
  return (
    <nav className="profile-organization-actions" aria-label="Organization actions">
      {cta ? (
        <a
          className="profile-organization-action is-primary"
          href={actionHref(cta.href)}
          target={cta.external ? '_blank' : undefined}
          rel={cta.external ? 'noopener noreferrer' : undefined}
        >
          <CtaIcon size={17} aria-hidden="true" />
          <span>{cta.label}</span>
        </a>
      ) : (
        <span className="profile-organization-action is-primary is-disabled">Add a primary action</span>
      )}
      <a className="profile-organization-action is-secondary" href={backendHref(vcardUrl)}>
        <UserPlus size={17} aria-hidden="true" />
        <span>Save Contact</span>
      </a>
    </nav>
  )
}

function OrganizationContactLinks({ actions }: { actions: PublicAction[] }) {
  if (actions.length === 0) return null
  return (
    <section className="profile-section profile-organization-links" aria-labelledby="organization-links-title">
      <h2 className="profile-section-title" id="organization-links-title">Contact &amp; Links</h2>
      <nav aria-label="Organization contact links">
        {actions.map((action) => {
          const Icon = actionIcons[action.icon] ?? LinkIcon
          return (
            <a
              className={`profile-organization-link ${action.brand_class}`}
              href={actionHref(action.href)}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              key={action.label}
            >
              <span><Icon size={18} aria-hidden="true" /></span>
              <strong>{action.label}</strong>
            </a>
          )
        })}
      </nav>
    </section>
  )
}

function Intro({ children }: { children: string }) {
  if (!children) {
    return null
  }
  return (
    <section className="profile-intro">
      <span className="profile-quote">"</span>
      {children}
    </section>
  )
}

function Opportunity({ profile }: { profile: PublicProfile }) {
  const tags = [...profile.lookingForLabels]
  if (profile.preferredWorkModeLabel) {
    tags.push(profile.preferredWorkModeLabel)
  }
  if (!profile.currentStatusLabel && tags.length === 0 && !profile.networkingStatement) {
    return null
  }
  return (
    <section className="profile-section profile-opportunity">
      <h2>
        <Radar size={17} aria-hidden="true" />
        {profile.currentStatusLabel || 'Networking goal'}
      </h2>
      {tags.length > 0 ? (
        <div className="profile-tags">
          {tags.map((tag) => (
            <span className="profile-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {profile.networkingStatement ? <p>{profile.networkingStatement}</p> : null}
    </section>
  )
}

function FocusSection({ profile }: { profile: PublicProfile }) {
  if (!profile.currentFocus && !profile.featuredInterest) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Current Focus</h2>
      <div className="profile-focus-list">
        {profile.currentFocus ? (
          <article className="profile-focus-item">
            <strong>What I am working on</strong>
            <p>{profile.currentFocus}</p>
          </article>
        ) : null}
        {profile.featuredInterest ? (
          <article className="profile-focus-item">
            <strong>Featured interest</strong>
            <p>{profile.featuredInterest}</p>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function Services({ services, title, variant = 'personal' }: { services: ServiceItem[]; title: string; variant?: 'personal' | 'organization' }) {
  if (services.length === 0) {
    return null
  }
  return (
    <section className={`profile-section profile-offerings-section is-${variant}`}>
      <h2 className="profile-section-title">{title}</h2>
      <div className="profile-services">
        {services.slice(0, 8).map((service) => {
          const Icon = serviceIconMap[service.icon] ?? BriefcaseBusiness
          const content = (
            <>
              <span className="profile-service-icon">
                <Icon size={variant === 'organization' ? 20 : 16} aria-hidden="true" />
              </span>
              <div>
                <strong>{service.title}</strong>
                {service.description ? <p>{service.description}</p> : null}
              </div>
              {service.href ? <ChevronRight className="profile-service-arrow" size={19} aria-hidden="true" /> : null}
            </>
          )
          const className = `profile-service${service.href ? ' is-linked' : ''}`
          return service.href ? (
            <a className={className} href={backendHref(service.href)} target="_blank" rel="noopener noreferrer" key={service.id}>{content}</a>
          ) : (
            <article className={className} key={service.id}>{content}</article>
          )
        })}
      </div>
    </section>
  )
}

type IdentityFact = {
  icon: LucideIcon
  label: string
  value: string
}

function IdentityPanel({
  facts,
  headline,
  icon: Icon,
  subtitle,
  title,
  tone,
}: {
  facts: IdentityFact[]
  headline: string
  icon: LucideIcon
  subtitle: string
  title: string
  tone: 'work' | 'academic'
}) {
  return (
    <article className={`profile-identity-card is-${tone}`}>
      <header className="profile-identity-card-head">
        <span className="profile-identity-badge">
          <Icon size={18} aria-hidden="true" />
        </span>
        <h2>{title}</h2>
      </header>
      <div className="profile-identity-summary">
        <h3>{headline}</h3>
        {subtitle ? <p><Building2 size={15} aria-hidden="true" />{subtitle}</p> : null}
      </div>
      {facts.length > 0 ? (
        <dl className="profile-facts">
          {facts.map((fact) => <Fact {...fact} key={fact.label} />)}
        </dl>
      ) : null}
    </article>
  )
}

function IdentityCards({ profile }: { profile: PublicProfile }) {
  const hasWork = Boolean(profile.workRole || profile.workOrganization || profile.workExperience || profile.workAddress)
  const hasAcademic = Boolean(
    profile.academicTitle
    || profile.academicSection
    || profile.academicInstitution
    || profile.academicLevel
    || profile.academicYear
    || profile.academicSpecialization
    || profile.academicStatus
    || profile.academicCertification
    || profile.academicAddress,
  )
  const workFacts: IdentityFact[] = [
    { icon: Clock3, label: 'Experience', value: profile.workExperience },
    { icon: MapPin, label: 'Work location', value: profile.workAddress },
  ].filter((fact) => isTruthy(fact.value))
  const academicFacts: IdentityFact[] = [
    { icon: BookOpen, label: 'Level', value: profile.academicLevel },
    { icon: CalendarCheck, label: 'Year / Semester', value: profile.academicYear },
    { icon: Users, label: 'Class / Batch / Section', value: profile.academicSection },
    { icon: Sparkles, label: 'Specialization', value: profile.academicSpecialization },
    { icon: ShieldCheck, label: 'Status', value: profile.academicStatus },
    { icon: Badge, label: 'Certification', value: profile.academicCertification },
    { icon: MapPinned, label: 'Campus', value: profile.academicAddress },
  ].filter((fact) => isTruthy(fact.value))
  if (!hasWork && !hasAcademic) {
    return null
  }
  return (
    <section className="profile-section profile-identity-section" aria-label="Work and academic identity">
      <div className="profile-identity-cards">
        {hasWork ? (
          <IdentityPanel
            facts={workFacts}
            headline={profile.workRole || 'Professional role'}
            icon={BriefcaseBusiness}
            subtitle={profile.workOrganization}
            title="Work Identity"
            tone="work"
          />
        ) : null}
        {hasAcademic ? (
          <IdentityPanel
            facts={academicFacts}
            headline={profile.academicTitle || profile.academicLevel || 'Academic profile'}
            icon={GraduationCap}
            subtitle={profile.academicInstitution}
            title="Academic Background"
            tone="academic"
          />
        ) : null}
      </div>
    </section>
  )
}

function Fact({ icon: Icon, label, value }: IdentityFact) {
  return (
    <div className="profile-fact">
      <dt><Icon size={15} aria-hidden="true" /><span>{label}</span></dt>
      <dd>{value}</dd>
    </div>
  )
}

function Highlights({ highlights, title = 'Highlights', variant = 'personal' }: { highlights: HighlightItem[]; title?: string; variant?: 'personal' | 'organization' }) {
  if (highlights.length === 0) {
    return null
  }
  if (variant === 'organization') {
    return (
      <section className="profile-section profile-highlights-section is-organization">
        <h2 className="profile-section-title">{title}</h2>
        <div className="profile-highlights">
          {highlights.map((highlight, index) => {
            const content = (
              <>
                <span className="profile-highlight-achievement-icon"><Sparkles size={17} aria-hidden="true" /></span>
                <span className="profile-highlight-achievement-copy">
                  <small>{index === 0 ? 'Featured work' : 'Recent achievement'}</small>
                  <strong>{highlight.title}</strong>
                  {highlight.description ? <p>{highlight.description}</p> : null}
                </span>
                {highlight.link ? <ChevronRight className="profile-highlight-achievement-arrow" size={18} aria-hidden="true" /> : null}
              </>
            )
            return highlight.link ? (
              <a className="profile-highlight is-achievement" href={highlight.link} target="_blank" rel="noopener noreferrer" key={highlight.id}>{content}</a>
            ) : (
              <article className="profile-highlight is-achievement" key={highlight.id}>{content}</article>
            )
          })}
        </div>
      </section>
    )
  }
  return (
    <section className={`profile-section profile-highlights-section is-${variant}`}>
      <h2 className="profile-section-title">{title}</h2>
      <div className="profile-highlights">
        {highlights.map((highlight) => (
          <article className="profile-highlight" key={highlight.id}>
            <div className="profile-highlight-image">
              {highlight.imageUrl ? <img src={highlight.imageUrl} alt={highlight.title} /> : 'Project'}
            </div>
            <div>
              <strong>{highlight.title}</strong>
              {highlight.organization || highlight.period ? (
                <span className="profile-highlight-meta">
                  {[highlight.organization, highlight.period].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              {highlight.description ? <p>{highlight.description}</p> : null}
              {highlight.link ? (
                <a className="profile-highlight-link" href={highlight.link} target="_blank" rel="noopener noreferrer">
                  Open project
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function BusinessHours({ profile }: { profile: PublicProfile }) {
  if (!profile.businessHours) return null
  return (
    <section className="profile-section profile-business-hours">
      <span className="profile-business-hours-icon"><Clock3 size={19} aria-hidden="true" /></span>
      <div>
        <h2>Business Hours</h2>
        <p>{profile.businessHours}</p>
      </div>
    </section>
  )
}

function SocialLinks({ actions, variant = 'modern' }: { actions: PublicAction[]; variant?: 'modern' | 'organization' }) {
  if (actions.length === 0) {
    return null
  }
  return (
    <section className={`profile-section profile-social-section is-${variant}`}>
      <h2 className="profile-section-title">{variant === 'organization' ? 'Brand Channels' : 'Find Me Online'}</h2>
      <div className="profile-social-row">
        {actions.map((action) => {
          const tone = socialTone(action.label)
          const Icon = socialIcons[action.icon] ?? actionIcons[action.icon] ?? LinkIcon
          return (
            <a className={`profile-social is-${tone}`} href={actionHref(action.href)} target="_blank" rel="noopener noreferrer" aria-label={action.label} title={action.label} key={action.label}>
              <Icon size={21} aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </section>
  )
}

function documentExtension(url: string) {
  const path = url.split(/[?#]/, 1)[0]
  const extension = path.split('.').pop()
  return extension && extension.length <= 5 ? extension.toUpperCase() : 'FILE'
}

function Documents({ documents }: { documents: DocumentItem[] }) {
  if (documents.length === 0) {
    return null
  }
  return (
    <section className="profile-section profile-documents-section">
      <div className="profile-section-heading">
        <span className="profile-section-heading-icon"><FileText size={17} aria-hidden="true" /></span>
        <h2>Documents</h2>
      </div>
      <div className="profile-documents">
        {documents.map((document) => (
          <a
            aria-label={`Open ${document.title} in a new tab`}
            className="profile-document"
            href={backendHref(document.url)}
            target="_blank"
            rel="noopener noreferrer"
            key={document.id}
          >
            <span className="profile-document-icon">
              <FileText size={18} aria-hidden="true" />
            </span>
            <span className="profile-document-copy">
              <strong>{document.title}</strong>
              <span>{documentExtension(document.url)} / {document.documentTypeLabel}</span>
            </span>
            <span className="profile-document-open">
              <ExternalLink size={16} aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

function Testimonials({ testimonials }: { testimonials: TestimonialItem[] }) {
  if (testimonials.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Recommendations</h2>
      <div className="profile-services">
        {testimonials.slice(0, 3).map((testimonial) => (
          <article className="profile-card-box" key={testimonial.id}>
            <p>{testimonial.reviewText}</p>
            <strong>{testimonial.clientName}</strong>
            <p>{[testimonial.clientRole, testimonial.organization].filter(Boolean).join(' · ')}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function DetailsTrigger({
  description = 'Work, education, contact and profile information',
  label = 'View complete details',
  onClick,
}: {
  description?: string
  label?: string
  onClick: () => void
}) {
  return (
    <button className="profile-details-trigger" type="button" onClick={onClick}>
      <span className="profile-detail-icon">
        <ShieldCheck size={18} aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}

type ConnectResponse = {
  state: 'pending' | 'accepted' | 'received'
  message: string
  connectionsUrl: string
}

function ConnectFlow({ profile, showToast }: { profile: PublicProfile; showToast: (message: string) => void }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(() => window.localStorage.getItem('t2c.connection-id.v1') ?? '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ConnectResponse | null>(null)
  const firstName = profile.fullName.split(' ')[0] || profile.fullName

  function close() {
    if (submitting) return
    setOpen(false)
    setError('')
    setResult(null)
  }

  async function sendRequest(credentials?: { username: string; password: string }) {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await apiFetch<ConnectResponse>(`/api/professional-profiles/${profile.slug}/connect/`, {
        method: 'POST',
        body: jsonBody(credentials ?? {}),
      })
      setResult(response)
      setPassword('')
      if (credentials?.username) {
        window.localStorage.setItem('t2c.connection-id.v1', credentials.username)
      }
      setOpen(true)
      showToast(response.message)
    } catch (reason) {
      if (!credentials && reason instanceof ApiError && reason.status === 401) {
        setResult(null)
        setOpen(true)
      } else {
        setError(displayError(reason))
        setOpen(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendRequest({ username, password })
  }

  return (
    <>
      <section className="profile-connect-soon" aria-labelledby="profile-connect-heading">
        <div className="profile-connect-main">
          <span className="profile-connect-art"><Users size={25} aria-hidden="true" /></span>
          <span className="profile-connect-copy">
            <strong id="profile-connect-heading">Grow your network</strong>
          </span>
        </div>
        <button className="profile-connect-action" type="button" onClick={() => void sendRequest()} disabled={submitting}>
          <ShieldCheck size={18} aria-hidden="true" />
          {submitting ? 'Checking your ID...' : `Connect with ${firstName}`}
        </button>
        <nav className="profile-connect-links" aria-label="Network shortcuts">
          <a className="profile-connect-link" href={appHref('/connections/')}>
            View my connections <ChevronRight size={16} aria-hidden="true" />
          </a>
        </nav>
      </section>

      {open ? (
        <div className="profile-connect-modal" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) close()
        }}>
          <section className="profile-connect-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-connect-title">
            <header>
              <span className="profile-connect-dialog-icon"><UserPlus size={22} aria-hidden="true" /></span>
              <div>
                <h2 id="profile-connect-title">Connect with {profile.fullName}</h2>
                <p>Confirm your Tap2Connect account to send this request.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close connection dialog"><X size={18} /></button>
            </header>

            {result ? (
              <div className="profile-connect-success" role="status">
                <span><Check size={22} aria-hidden="true" /></span>
                <strong>{result.state === 'accepted' ? 'Already connected' : 'Request ready'}</strong>
                <p>{result.message}</p>
                <a href={appHref(result.connectionsUrl)}>Open my connections <ChevronRight size={16} /></a>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label>
                  <span>Connection ID or username</span>
                  <input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </label>
                {error ? <div className="profile-connect-error" role="alert">{error}</div> : null}
                <p className="profile-connect-security"><LockKeyhole size={14} aria-hidden="true" />Your password is used only to verify your account and is never shared with {profile.fullName}.</p>
                <button className="profile-connect-submit" type="submit" disabled={submitting}>
                  <Send size={17} aria-hidden="true" />
                  {submitting ? 'Sending request...' : 'Send connection request'}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}

function Footer({ profile, variant = 'modern' }: { profile: PublicProfile; variant?: 'modern' | 'organization' }) {
  if (variant === 'organization') {
    const brandTitle = profile.companyName || profile.brandName || 'Organization'
    const brandSubtitle = profile.organizationTagline || profile.brandTagline || profile.industry || 'Digital business card'
    return (
      <footer className="profile-footer profile-brand-footer">
        <span className="profile-footer-brand-mark">
          {profile.organizationLogoUrl ? <img src={profile.organizationLogoUrl} alt={`${brandTitle} logo`} /> : <Building2 size={18} aria-hidden="true" />}
        </span>
        <span className="profile-footer-brand-copy">
          <strong>{brandTitle}</strong>
          <span>{brandSubtitle}</span>
        </span>
        <span className="profile-powered">
          Powered by <b>T2C</b>
        </span>
      </footer>
    )
  }
  return (
    <footer className="profile-footer">
      <ShieldCheck size={12} aria-hidden="true" />
      <span className="profile-footer-line">
        <span>{profile.isVerified ? 'Verified identity' : 'Digital Identity'}</span>
        <span className="profile-footer-separator" />
        <span>{profile.companyName || profile.academicInstitution || 'Tap2Connect Profile'}</span>
        <span className="profile-footer-separator" />
        <span>Powered by T2C</span>
      </span>
    </footer>
  )
}

function DetailsDrawer({ data, open, onClose }: { data: PublicProfileData; open: boolean; onClose: () => void }) {
  const { profile } = data
  const isOrganization = profile.profileFocus === 'organization'
  const groups = (isOrganization ? [
    {
      icon: Building2,
      title: 'Brand profile',
      rows: [
        ['Organization', profile.companyName || profile.brandName],
        ['Tagline', profile.organizationTagline || profile.brandTagline],
        ['About', profile.about || profile.shortTagline],
        ['Industry / field', profile.industry],
      ],
    },
    {
      icon: Badge,
      title: 'Representative',
      rows: [
        ['Name', profile.fullName],
        ['Role', profile.designation || profile.profession],
      ],
    },
    {
      icon: Globe2,
      title: 'Business contact',
      rows: [
        ['Phone', profile.phone],
        ['WhatsApp', profile.whatsappNumber],
        ['Email', profile.email],
        ['Website', profile.website],
        ['Booking / Inquiry', profile.bookingUrl],
        ['Office address', profile.officeAddress],
        ['Business hours', profile.businessHours],
      ],
    },
  ] : [
    {
      icon: Badge,
      title: 'Profile',
      rows: [
        ['About', profile.about],
        [profile.profileIdentifierLabel || 'Profile ID', profile.profileIdentifier],
        ['Industry / field', profile.industry],
      ],
    },
    {
      icon: BriefcaseBusiness,
      title: 'Work identity',
      rows: [
        ['Role', profile.workRole],
        ['Organization', profile.workOrganization],
        ['Experience', profile.workExperience],
        ['Work location', profile.workAddress],
      ],
    },
    {
      icon: GraduationCap,
      title: 'Academic background',
      rows: [
        ['Degree / Program', profile.academicTitle],
        ['Institution', profile.academicInstitution],
        ['Level', profile.academicLevel],
        ['Year / Semester', profile.academicYear],
        ['Class / Batch / Section', profile.academicSection],
        ['Specialization', profile.academicSpecialization],
        ['Status', profile.academicStatus],
        ['Certification', profile.academicCertification],
        ['Campus', profile.academicAddress],
      ],
    },
    {
      icon: Globe2,
      title: 'Contact and links',
      rows: [
        ['Phone', profile.phone],
        ['WhatsApp', profile.whatsappNumber],
        ['Email', profile.email],
        ['Website', profile.website],
        ['Booking / Inquiry', profile.bookingUrl],
        ['Office / campus', profile.officeAddress],
        ['Business hours', profile.businessHours],
      ],
    },
  ]).map((group) => ({
    ...group,
    rows: group.rows.filter(([, value]) => isTruthy(value)),
  })).filter((group) => group.rows.length > 0)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="profile-drawer is-open" onClick={onClose} role="presentation">
      <section
        aria-labelledby="profile-details-title"
        aria-modal="true"
        className="profile-drawer-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="profile-drawer-head">
          <div>
            <h2 id="profile-details-title">{isOrganization ? 'Business details' : 'Complete details'}</h2>
            <p>{isOrganization ? `Brand and contact information for ${profile.companyName || profile.brandName || profile.fullName}.` : `Verified information shared by ${profile.fullName}.`}</p>
          </div>
          <button autoFocus className="profile-close" type="button" aria-label="Close details" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="profile-drawer-groups">
          {groups.map((group) => {
            const Icon = group.icon
            return (
              <section className="profile-drawer-group" key={group.title}>
                <h3><Icon size={16} aria-hidden="true" />{group.title}</h3>
                <dl>
                  {group.rows.map(([label, value]) => (
                    <div className="profile-drawer-row" key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })}
          {isOrganization && data.documents.length > 0 ? (
            <section className="profile-drawer-group">
              <h3><FileText size={16} aria-hidden="true" />Documents</h3>
              <div className="profile-drawer-documents">
                {data.documents.map((document) => (
                  <a href={backendHref(document.url)} target="_blank" rel="noopener noreferrer" key={document.id}>
                    <FileText size={16} aria-hidden="true" />
                    <span>
                      <strong>{document.title}</strong>
                      <small>{documentExtension(document.url)} / {document.documentTypeLabel}</small>
                    </span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <a className="profile-save-contact" href={backendHref(data.actions.vcardUrl)}>
          <UserPlus size={17} aria-hidden="true" />
          Save contact
        </a>
      </section>
    </div>
  )
}

function ModernTemplate({ data, showToast }: { data: PublicProfileData; showToast: (message: string) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { profile } = data
  return (
    <>
      <TopBar data={data} onShare={() => shareProfile(data, showToast)} />
      <Hero profile={profile} />
      <PrimaryActions actions={data.actions.primary} />
      <Intro>{profile.shortTagline}</Intro>
      <Opportunity profile={profile} />
      <FocusSection profile={profile} />
      <Services services={data.services} title="Skills & Services" />
      <IdentityCards profile={profile} />
      <Highlights highlights={data.highlights} />
      <Testimonials testimonials={data.testimonials} />
      <SocialLinks actions={data.actions.extra} />
      <Documents documents={data.documents} />
      <DetailsTrigger onClick={() => setDetailsOpen(true)} />
      <ConnectFlow profile={profile} showToast={showToast} />
      <Footer profile={profile} />
      <DetailsDrawer data={data} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </>
  )
}

function OrganizationTemplate({ data, showToast }: { data: PublicProfileData; showToast: (message: string) => void }) {
  const { profile } = data
  return (
    <>
      <TopBar data={data} onShare={() => shareProfile(data, showToast)} />
      <Hero profile={profile} />
      <OrganizationActionPair data={data} />
      <Intro>{profile.about || profile.shortTagline || profile.organizationTagline}</Intro>
      <OrganizationContactLinks actions={data.actions.organizationLinks} />
      <Services services={data.services} title="What We Offer" variant="organization" />
      <Highlights highlights={data.highlights} title="Featured Work" variant="organization" />
      <BusinessHours profile={profile} />
      <SocialLinks actions={data.actions.extra} variant="organization" />
      <ConnectFlow profile={profile} showToast={showToast} />
      <Footer profile={profile} variant="organization" />
    </>
  )
}

async function shareProfile(data: PublicProfileData, showToast: (message: string) => void) {
  const shareData = {
    title: data.profile.fullName,
    text: `View ${data.profile.fullName}'s digital profile.`,
    url: window.location.href,
  }
  try {
    if (navigator.share) {
      await navigator.share(shareData)
      return
    }
    await navigator.clipboard.writeText(shareData.url)
    showToast('Profile link copied.')
  } catch {
    showToast('Share was not completed.')
  }
}

export function PublicProfessionalProfile() {
  const slug = useMemo(() => profileSlugFromPath(), [])
  const [data, setData] = useState<PublicProfileData | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!slug) {
      setError('Profile URL is missing.')
      return
    }
    let isCurrent = true
    async function loadProfile() {
      try {
        const response = await fetch(`/api/professional-profiles/${slug}/`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Profile could not be loaded.')
        }
        const payload = (await response.json()) as PublicProfileData
        if (isCurrent) {
          setData(payload)
          document.title = payload.seo.title
        }
      } catch (caughtError) {
        if (isCurrent) {
          setError(caughtError instanceof Error ? caughtError.message : 'Profile could not be loaded.')
        }
      }
    }
    void loadProfile()
    return () => {
      isCurrent = false
    }
  }, [slug])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) {
    return (
      <div className="profile-state-screen">
        <div className="profile-state-card">
          <strong>Profile unavailable</strong>
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="profile-state-screen">
        <div className="profile-state-card">
          <strong>Loading profile</strong>
          Preparing the digital card...
        </div>
      </div>
    )
  }

  const profileStyle = { '--profile-accent': data.profile.accentColor } as CSSProperties
  const isOrganization = data.profile.profileFocus === 'organization'

  return (
    <main className="public-profile-page" style={profileStyle}>
      {data.actions.isProfileOwnerView ? (
        <nav className="profile-owner-bar" aria-label="Profile owner navigation">
          <span>Owner preview · This is how visitors see your profile.</span>
          <div className="profile-owner-actions">
            <a className="is-analytics" href={appHref(data.actions.analyticsUrl)}>
              <BarChart2 size={14} aria-hidden="true" /> Analytics
            </a>
            <a href={appHref(data.actions.editLoginUrl)}>Edit profile</a>
          </div>
        </nav>
      ) : null}
      <article className={`public-profile-card is-${isOrganization ? 'organization' : 'modern'}-template`}>
        <div className="public-profile-inner">
          {isOrganization ? <OrganizationTemplate data={data} showToast={setToast} /> : <ModernTemplate data={data} showToast={setToast} />}
        </div>
      </article>
      <div className={`profile-toast${toast ? ' is-visible' : ''}`}>{toast}</div>
    </main>
  )
}

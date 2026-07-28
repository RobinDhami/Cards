import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, CSSProperties, SVGProps } from 'react'
import Badge from 'lucide-react/dist/esm/icons/badge.mjs'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.mjs'
import Building2 from 'lucide-react/dist/esm/icons/building-2.mjs'
import CalendarCheck from 'lucide-react/dist/esm/icons/calendar-check.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import Clock3 from 'lucide-react/dist/esm/icons/clock-3.mjs'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.mjs'
import FileText from 'lucide-react/dist/esm/icons/file-text.mjs'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.mjs'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import LinkIcon from 'lucide-react/dist/esm/icons/link.mjs'
import Mail from 'lucide-react/dist/esm/icons/mail.mjs'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.mjs'
import MapPinned from 'lucide-react/dist/esm/icons/map-pinned.mjs'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.mjs'
import Phone from 'lucide-react/dist/esm/icons/phone.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import Radar from 'lucide-react/dist/esm/icons/radar.mjs'
import Share2 from 'lucide-react/dist/esm/icons/share-2.mjs'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.mjs'
import Sparkles from 'lucide-react/dist/esm/icons/sparkles.mjs'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
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
  slug: string
  templateName: 'modern_identity' | 'organization_focus'
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
    extra: PublicAction[]
    qrCodeUrl: string
    vcardUrl: string
    editLoginUrl: string
    isProfileOwnerView: boolean
  }
  services: ServiceItem[]
  highlights: HighlightItem[]
  testimonials: TestimonialItem[]
  documents: DocumentItem[]
}

const actionIcons: Record<string, LucideIcon> = {
  'calendar-check': CalendarCheck,
  github: LinkIcon,
  globe: Globe2,
  linkedin: LinkIcon,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  phone: Phone,
  youtube: LinkIcon,
  facebook: LinkIcon,
  instagram: LinkIcon,
}

const serviceIcons: Record<string, LucideIcon> = {
  briefcase: BriefcaseBusiness,
  school: GraduationCap,
  globe: Globe2,
  link: LinkIcon,
  sparkles: Sparkles,
  users: UserPlus,
}

const backendOrigin = import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''

function legacyHref(href: string) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href
  }
  return `${backendOrigin}${href}`
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
        <button className="profile-top-action" type="button" aria-label="Share profile" onClick={onShare}>
          <Share2 size={18} aria-hidden="true" />
        </button>
        <a className="profile-top-action" href={legacyHref(data.actions.qrCodeUrl)} aria-label="Open QR code">
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
          <a className="profile-action" href={legacyHref(action.href)} target={action.external ? '_blank' : undefined} rel={action.external ? 'noopener noreferrer' : undefined} key={action.label}>
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

function Services({ services, title }: { services: ServiceItem[]; title: string }) {
  if (services.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">{title}</h2>
      <div className="profile-services">
        {services.slice(0, 8).map((service) => {
          const Icon = serviceIcons[service.icon] ?? BriefcaseBusiness
          return (
            <article className="profile-service" key={service.id}>
              <span className="profile-service-icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div>
                <strong>{service.title}</strong>
                {service.description ? <p>{service.description}</p> : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function IdentityCards({ profile }: { profile: PublicProfile }) {
  const hasWork = profile.workRole || profile.workOrganization || profile.workExperience || profile.workAddress
  const academicFacts = [
    ['Degree / Program', profile.academicTitle],
    ['Institution', profile.academicInstitution],
    ['Level', profile.academicLevel],
    ['Year / Semester', profile.academicYear],
    ['Specialization', profile.academicSpecialization],
    ['Status', profile.academicStatus],
  ].filter(([, value]) => isTruthy(value))
  if (!hasWork && academicFacts.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Identity</h2>
      <div className="profile-identity-cards">
        {hasWork ? (
          <article className="profile-identity-card is-work">
            <span className="profile-identity-badge">
              <BriefcaseBusiness size={18} aria-hidden="true" />
            </span>
            <p className="profile-identity-eyebrow">Work Identity</p>
            <h2 className="profile-identity-title">{profile.workRole || 'Work role not added'}</h2>
            <p className="profile-identity-subtitle">{profile.workOrganization || 'Organization not added'}</p>
            <div className="profile-facts">
              {profile.workExperience ? <Fact label="Experience" value={profile.workExperience} /> : null}
              {profile.workAddress ? <Fact label="Address" value={profile.workAddress} /> : null}
            </div>
          </article>
        ) : null}
        {academicFacts.length > 0 ? (
          <article className="profile-identity-card is-academic">
            <span className="profile-identity-badge">
              <GraduationCap size={18} aria-hidden="true" />
            </span>
            <p className="profile-identity-eyebrow">Academic Background</p>
            <h2 className="profile-identity-title">{profile.academicTitle || 'Academic profile'}</h2>
            <p className="profile-identity-subtitle">{profile.academicInstitution || profile.academicLevel}</p>
            <div className="profile-facts">
              {academicFacts.map(([label, value]) => (
                <Fact label={label} value={value} key={label} />
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Highlights({ highlights }: { highlights: HighlightItem[] }) {
  if (highlights.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Highlights</h2>
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

function SocialLinks({ actions }: { actions: PublicAction[] }) {
  if (actions.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Find Me Online</h2>
      <div className="profile-social-row">
        {actions.map((action) => (
          <a className={`profile-social is-${socialTone(action.label)}`} href={legacyHref(action.href)} target="_blank" rel="noopener noreferrer" aria-label={action.label} key={action.label}>
            {action.label.slice(0, 2)}
          </a>
        ))}
      </div>
    </section>
  )
}

function Documents({ documents }: { documents: DocumentItem[] }) {
  if (documents.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Documents</h2>
      <div className="profile-documents">
        {documents.slice(0, 2).map((document) => (
          <a className="profile-document" href={legacyHref(document.url)} target="_blank" rel="noopener noreferrer" key={document.id}>
            <span className="profile-document-icon">
              <FileText size={14} aria-hidden="true" />
            </span>
            <span>
              <strong>{document.title}</strong>
              <span>{document.documentTypeLabel}</span>
            </span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  )
}

function BusinessDetails({ profile }: { profile: PublicProfile }) {
  const details = [
    { label: 'Hours', value: profile.businessHours, href: '', icon: Clock3 },
    { label: 'Address', value: profile.officeAddress, href: '', icon: MapPinned },
    { label: 'Website', value: profile.website, href: profile.website, icon: Globe2 },
    { label: 'Booking / Inquiry', value: profile.bookingUrl ? 'Open appointment or inquiry link' : '', href: profile.bookingUrl, icon: CalendarCheck },
  ].filter((item) => item.value)
  if (details.length === 0) {
    return null
  }
  return (
    <section className="profile-section">
      <h2 className="profile-section-title">Inquiry Details</h2>
      <div className="profile-details-list">
        {details.map((detail) => {
          const Icon = detail.icon
          const content = (
            <>
              <span className="profile-detail-icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <p>
                <span>{detail.label}</span>
                <strong>{detail.value}</strong>
              </p>
            </>
          )
          return detail.href ? (
            <a className="profile-detail-row" href={detail.href} target="_blank" rel="noopener noreferrer" key={detail.label}>
              {content}
            </a>
          ) : (
            <div className="profile-detail-row" key={detail.label}>
              {content}
            </div>
          )
        })}
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

function DetailsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button className="profile-details-trigger" type="button" onClick={onClick}>
      <span className="profile-detail-icon">
        <ShieldCheck size={18} aria-hidden="true" />
      </span>
      <span>
        <strong>View complete details</strong>
        <span>Website, booking, address, and profile details.</span>
      </span>
      <ExternalLink size={16} aria-hidden="true" />
    </button>
  )
}

function ConnectSoon({ onClick }: { onClick: () => void }) {
  return (
    <button className="profile-connect-soon" type="button" onClick={onClick} aria-label="Let's Connect coming soon">
      <span className="profile-connect-art">
        <UserPlus size={27} aria-hidden="true" />
      </span>
      <span className="profile-connect-copy">
        <strong>Let&apos;s Connect</strong>
        <span>Tap to preview</span>
        <p>A friend-connection feature is on the way for Tap2Connect profiles.</p>
      </span>
      <span className="profile-connect-arrow">
        <ExternalLink size={16} aria-hidden="true" />
      </span>
    </button>
  )
}

function Footer({ profile }: { profile: PublicProfile }) {
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
  const rows = [
    ['About', profile.about],
    ['Website', profile.website],
    ['Booking', profile.bookingUrl],
    ['Office / campus', profile.officeAddress],
    [profile.profileIdentifierLabel || 'Profile ID', profile.profileIdentifier],
    ['Industry', profile.industry],
  ].filter(([, value]) => isTruthy(value))
  return (
    <div className={`profile-drawer${open ? ' is-open' : ''}`} onClick={onClose}>
      <section className="profile-drawer-panel" onClick={(event) => event.stopPropagation()}>
        <header className="profile-drawer-head">
          <div>
            <h2>{profile.fullName}</h2>
            <p>{profile.designation || profile.profession || profile.companyName}</p>
          </div>
          <button className="profile-close" type="button" aria-label="Close details" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="profile-detail-list">
          {rows.map(([label, value]) => (
            <div className="profile-drawer-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <a className="profile-save-contact" href={legacyHref(data.actions.vcardUrl)}>
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
      <ConnectSoon onClick={() => showToast('This feature will be available soon, and you will be able to connect with friends.')} />
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
      <PrimaryActions actions={data.actions.primary} />
      <Intro>{profile.about || profile.shortTagline || profile.organizationTagline}</Intro>
      <Services services={data.services} title="What We Provide" />
      <BusinessDetails profile={profile} />
      <SocialLinks actions={data.actions.extra} />
      <a className="profile-save-contact" href={legacyHref(data.actions.vcardUrl)}>
        <UserPlus size={17} aria-hidden="true" />
        Save Business Contact
      </a>
      <Footer profile={profile} />
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
  const isOrganization = data.profile.templateName === 'organization_focus'

  return (
    <main className="public-profile-page" style={profileStyle}>
      {data.actions.isProfileOwnerView ? (
        <nav className="profile-owner-bar" aria-label="Profile owner navigation">
          <span>Owner preview · This is how visitors see your profile.</span>
          <a href={legacyHref(data.actions.editLoginUrl)}>Edit profile</a>
        </nav>
      ) : null}
      <article className="public-profile-card">
        <div className="public-profile-inner">
          {isOrganization ? <OrganizationTemplate data={data} showToast={setToast} /> : <ModernTemplate data={data} showToast={setToast} />}
        </div>
      </article>
      <div className={`profile-toast${toast ? ' is-visible' : ''}`}>{toast}</div>
    </main>
  )
}

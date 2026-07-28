import {
  Building2,
  Check,
  Clock3,
  MapPin,
  QrCode,
  Share2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ProfessionalProfile } from '../types'
import { ContactActions } from './ContactActions'

type OrganizationFocusPreviewProps = {
  profile: ProfessionalProfile
}

export function OrganizationFocusPreview({ profile }: OrganizationFocusPreviewProps) {
  const accentStyle = { '--accent': profile.accentColor } as CSSProperties

  return (
    <article className="phone-card" style={accentStyle}>
      <div className="phone-card__inner">
        <header className="profile-topbar">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Building2 aria-hidden="true" />
            </span>
            <span className="brand-copy">
              <strong>{profile.organization}</strong>
              <span>{profile.organizationTagline}</span>
            </span>
          </div>
          <div className="top-actions">
            <button aria-label="Share profile" type="button">
              <Share2 aria-hidden="true" />
            </button>
            <button aria-label="Open QR code" type="button">
              <QrCode aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="profile-hero" aria-label="Organization profile">
          <div className="cover-image" />
          <div className="portrait">RD</div>
        </section>

        <section className="identity-block">
          <div className="name-line">
            <h2>{profile.fullName}</h2>
            {profile.verified ? (
              <span className="verified-mark" title="Verified profile">
                <Check aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <p className="role-line">
            {profile.role} · {profile.organization}
          </p>
          <p className="location-line">
            <MapPin aria-hidden="true" />
            {profile.location}
          </p>
        </section>

        <ContactActions actions={profile.contactActions} />

        <section className="quote-panel">
          <span aria-hidden="true">"</span>
          <p>{profile.about}</p>
        </section>

        <section className="card-section">
          <h3>What We Provide</h3>
          <div className="service-list">
            {profile.services.map((service) => {
              const Icon = service.icon
              return (
                <article className="service-row" key={service.title}>
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{service.title}</strong>
                    <p>{service.description}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="card-section">
          <h3>Inquiry Details</h3>
          <div className="info-list">
            <p>
              <Clock3 aria-hidden="true" />
              <span>
                <small>Hours</small>
                <strong>{profile.businessHours}</strong>
              </span>
            </p>
            <p>
              <MapPin aria-hidden="true" />
              <span>
                <small>Address</small>
                <strong>{profile.officeAddress}</strong>
              </span>
            </p>
          </div>
        </section>

        <section className="card-section">
          <h3>Find Us Online</h3>
          <div className="social-row">
            {profile.socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <a className={`social-dot social-dot--${social.tone}`} href={social.href} key={social.label}>
                  <Icon aria-hidden="true" />
                  <span>{social.label}</span>
                </a>
              )
            })}
          </div>
        </section>

        <a className="save-contact" href="#save">
          <UserPlus aria-hidden="true" />
          Save Business Contact
        </a>

        <footer className="profile-footer">
          <ShieldCheck aria-hidden="true" />
          <span>Verified organization contact</span>
          <span>{profile.organization}</span>
        </footer>
      </div>
    </article>
  )
}

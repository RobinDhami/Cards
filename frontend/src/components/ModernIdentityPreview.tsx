import { Check, MapPin, QrCode, Share2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ProfessionalProfile } from '../types'
import { ContactActions } from './ContactActions'

type ModernIdentityPreviewProps = {
  profile: ProfessionalProfile
}

export function ModernIdentityPreview({ profile }: ModernIdentityPreviewProps) {
  const accentStyle = { '--accent': '#5b21f6' } as CSSProperties

  return (
    <article className="phone-card phone-card--modern" style={accentStyle}>
      <div className="phone-card__inner">
        <header className="profile-topbar">
          <div className="brand-lockup">
            <span className="brand-mark brand-mark--photo">RD</span>
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

        <section className="profile-hero" aria-label="Modern profile">
          <div className="cover-image cover-image--modern" />
          <div className="portrait">RD</div>
        </section>

        <section className="identity-block">
          <div className="name-line">
            <h2>{profile.fullName}</h2>
            <span className="verified-mark">
              <Check aria-hidden="true" />
            </span>
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
          <p>{profile.organizationTagline}</p>
        </section>

        <section className="card-section">
          <h3>Current Focus</h3>
          <div className="timeline-card">
            <p>
              <strong>What I’m working on</strong>
              <span>React frontend migration with Django APIs.</span>
            </p>
            <p>
              <strong>Featured interest</strong>
              <span>Reusable profile and shop builder components.</span>
            </p>
          </div>
        </section>
      </div>
    </article>
  )
}

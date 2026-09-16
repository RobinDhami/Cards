import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days.js'
import Globe2 from 'lucide-react/dist/esm/icons/globe-2.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import Map from 'lucide-react/dist/esm/icons/map.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import UsersRound from 'lucide-react/dist/esm/icons/users-round.js'
import { useCallback, useState } from 'react'
import { brandLogo } from '../../lib/assets'
import { ConnectPreview } from './ConnectPreview'
import { ContactActions } from './ContactActions'
import { ContactDocuments } from './ContactDocuments'
import { DetailsDrawer } from './DetailsDrawer'
import { IdentityHero } from './IdentityHero'
import { OrganizationHeader } from './OrganizationHeader'
import { ProfileSection } from './ProfileSection'
import { SocialLinks } from './SocialLinks'
import type { PublicStudent } from './types'
import './DigitalContactCard.css'

export function DigitalContactCard({ profile }: { profile: PublicStudent }) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [toast, setToast] = useState('')

  const closeDetails = useCallback(() => setDetailsOpen(false), [])

  async function shareProfile() {
    try {
      if (navigator.share) {
        await navigator.share({ title: profile.name, url: profile.publicUrl })
      } else {
        await navigator.clipboard.writeText(profile.publicUrl)
        setToast('Profile link copied.')
      }
    } catch {
      setToast('Sharing was cancelled.')
    }
  }

  const organizationName = profile.school.name || profile.organization
  const identityDetail = [profile.role, profile.memberSummary].filter(Boolean).join(' • ')
  const focusTitle = profile.memberType.toLowerCase().includes('teacher')
    ? 'About & Availability'
    : 'About & Current Focus'
  const isClub = profile.school.organizationType === 'club'

  return (
    <main className="t2c-ui digital-card-page">
      {toast ? (
        <button className="digital-card-toast" type="button" onClick={() => setToast('')} role="status">
          {toast}
        </button>
      ) : null}

      <article className={`digital-contact-card${isClub ? ' is-club-template' : ''}`}>
        <OrganizationHeader
          organization={profile.school}
          fallbackName={profile.organization}
          editHref={profile.actions.edit}
          qrHref={profile.actions.qr}
          onShare={shareProfile}
        />

        <div className="digital-contact-card__layout">
          <IdentityHero profile={profile} />

          <div className="digital-contact-card__content">
            <section className="digital-card-identity">
              <div className="digital-card-identity__name">
                <h1>{profile.name}</h1>
                <BadgeCheck size={25} aria-label="Verified identity" />
              </div>
              <p>{identityDetail} · {profile.organization}</p>
              {profile.address ? (
                <span className="digital-card-identity__location">
                  <MapPin size={18} aria-hidden="true" />
                  {profile.address}
                </span>
              ) : null}
            </section>

            <ContactActions profile={profile} />

            {isClub ? <>
              <ProfileSection className="digital-card-club-contact" title="Club contact">
                <div className="digital-card-club-contact__grid">
                  {profile.school.email ? <a href={`mailto:${profile.school.email}`}><strong>Email</strong><span>{profile.school.email}</span></a> : null}
                  {profile.school.phone ? <a href={`tel:${profile.school.phone}`}><strong>Phone</strong><span>{profile.school.phone}</span></a> : null}
                  {profile.school.websiteUrl ? <a href={profile.school.websiteUrl} target="_blank" rel="noreferrer"><Globe2 size={18} /><strong>Website</strong><span>{profile.school.website}</span></a> : null}
                  {profile.school.mapUrl ? <a href={profile.school.mapUrl} target="_blank" rel="noreferrer"><Map size={18} /><strong>View map</strong><span>{profile.school.address || 'Club location'}</span></a> : null}
                </div>
              </ProfileSection>
              {(profile.school.clubDistrict || profile.school.charteredOn || profile.school.sponsoringClub) ? <ProfileSection className="digital-card-club-information" title="Club information">
                <dl>
                  <div><dt><UsersRound size={18} />Club name</dt><dd>{profile.school.name}</dd></div>
                  {profile.school.clubDistrict ? <div><dt><MapPin size={18} />District</dt><dd>{profile.school.clubDistrict}</dd></div> : null}
                  {profile.school.charteredOn ? <div><dt><CalendarDays size={18} />Chartered on</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(`${profile.school.charteredOn}T00:00:00`))}</dd></div> : null}
                  {profile.school.sponsoringClub ? <div><dt><UsersRound size={18} />Sponsoring club</dt><dd>{profile.school.sponsoringClub}</dd></div> : null}
                </dl>
              </ProfileSection> : null}
            </> : null}

            {profile.intro ? (
              <blockquote className="digital-card-quote">
                <span aria-hidden="true">“</span>
                {profile.intro}
              </blockquote>
            ) : null}

            {profile.structuredDetails.length > 0 ? (
              <ProfileSection className="digital-card-structured-details" title="Member details">
                <dl>{profile.structuredDetails.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
              </ProfileSection>
            ) : null}

            {profile.current || profile.featured ? (
              <ProfileSection className="digital-card-focus" title={focusTitle}>
                <div className="digital-card-focus__list">
                  {profile.current ? <div><strong>Current focus</strong><p>{profile.current}</p></div> : null}
                  {profile.featured ? <div><strong>Featured</strong><p>{profile.featured}</p></div> : null}
                </div>
              </ProfileSection>
            ) : null}

            {profile.skills.length > 0 ? (
              <ProfileSection className="digital-card-skills" title="Skills & Interests">
                <div>
                  {profile.skills.map((skill) => <span key={skill}>{skill}</span>)}
                </div>
              </ProfileSection>
            ) : null}

            <SocialLinks socials={profile.socials} />
            <ContactDocuments profile={profile} onOpenDetails={() => setDetailsOpen(true)} />
            <ConnectPreview onPreview={() => setToast('Friend connections will be available soon.')} />
          </div>
        </div>

        <footer className="digital-card-footer">
          <span className="digital-card-footer__rule" aria-hidden="true" />
          <div className="digital-card-footer__identity">
            <ShieldCheck size={20} aria-hidden="true" />
            <span>Verified identity</span>
            <i aria-hidden="true">·</i>
            <span>{organizationName}</span>
          </div>
          <div className="digital-card-footer__powered">
            <span>Powered by</span>
            <img src={brandLogo} alt="Tap2Connect" />
          </div>
        </footer>
      </article>

      {detailsOpen ? <DetailsDrawer profile={profile} onClose={closeDetails} /> : null}
    </main>
  )
}

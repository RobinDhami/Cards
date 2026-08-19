import type { PublicStudent } from './types'

export function IdentityHero({ profile }: { profile: PublicStudent }) {
  return (
    <section className="digital-card-hero" aria-label={`${profile.name} profile image`}>
      <div className="digital-card-hero__cover">
        {profile.coverPhoto ? <img src={profile.coverPhoto} alt="" /> : <span aria-hidden="true" />}
      </div>
      <span className="digital-card-hero__portrait">
        {profile.profilePhoto ? <img src={profile.profilePhoto} alt={profile.name} /> : profile.name.slice(0, 1)}
      </span>
      {profile.identifier ? (
        <span className="digital-card-hero__identifier">
          <small>{profile.identifierLabel}</small>
          <strong>{profile.identifier}</strong>
        </span>
      ) : null}
    </section>
  )
}

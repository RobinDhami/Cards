import Edit3 from 'lucide-react/dist/esm/icons/edit-3.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { useEffect } from 'react'
import { ButtonLink } from '../../design-system/Button'
import { IconButton } from '../../design-system/IconButton'
import type { PublicStudent } from './types'

export function DetailsDrawer({
  onClose,
  profile,
}: {
  onClose: () => void
  profile: PublicStudent
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <>
      <div className="t2c-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="t2c-modal-panel digital-card-details"
        role="dialog"
        aria-modal="true"
        aria-labelledby="digital-card-details-title"
      >
        <header>
          <div>
            <h2 id="digital-card-details-title">Complete details</h2>
            <p>Verified information shared by this profile.</p>
          </div>
          <IconButton type="button" onClick={onClose} aria-label="Close details" autoFocus>
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <dl>
          <div><dt>Role</dt><dd>{profile.role}</dd></div>
          <div><dt>Organization</dt><dd>{profile.organization}</dd></div>
          <div><dt>Class / level</dt><dd>{profile.gradeSection || 'Not provided'}</dd></div>
          <div><dt>{profile.identifierLabel}</dt><dd>{profile.identifier || 'Not provided'}</dd></div>
          {profile.bloodGroup ? <div><dt>Blood group</dt><dd>{profile.bloodGroup}</dd></div> : null}
          {profile.guardianName ? <div><dt>{profile.guardianLabel}</dt><dd>{profile.guardianName}</dd></div> : null}
          {profile.additionalInfoHeading ? (
            <div><dt>{profile.additionalInfoHeading}</dt><dd>{profile.additionalInfoDescription}</dd></div>
          ) : null}
        </dl>
        <ButtonLink href={profile.actions.edit}>
          <Edit3 size={17} aria-hidden="true" />
          Manage profile
        </ButtonLink>
      </aside>
    </>
  )
}

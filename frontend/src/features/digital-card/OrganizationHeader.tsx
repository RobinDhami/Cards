import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import Pencil from 'lucide-react/dist/esm/icons/pencil.mjs'
import QrCode from 'lucide-react/dist/esm/icons/qr-code.mjs'
import Share2 from 'lucide-react/dist/esm/icons/share-2.mjs'
import { IconButton, IconLink } from '../../design-system/IconButton'
import { appHref, backendHref } from '../../lib/api'
import type { PublicStudent } from './types'

type OrganizationHeaderProps = {
  organization: PublicStudent['school']
  fallbackName: string
  editHref: string
  qrHref: string
  onShare: () => void
}

export function OrganizationHeader({
  organization,
  fallbackName,
  editHref,
  qrHref,
  onShare,
}: OrganizationHeaderProps) {
  const name = organization.name || fallbackName

  return (
    <header className="digital-card-organization">
      <div className="digital-card-organization__brand">
        <span className="digital-card-organization__logo">
          {organization.logo ? <img src={organization.logo} alt={`${name} logo`} /> : <GraduationCap size={22} aria-hidden="true" />}
        </span>
        <span className="digital-card-organization__copy">
          <strong>{name}</strong>
          <small>Tap2Connect verified digital identity</small>
        </span>
      </div>
      <div className="digital-card-organization__actions">
        <IconButton type="button" onClick={onShare} aria-label="Share profile" title="Share profile">
          <Share2 size={18} aria-hidden="true" />
        </IconButton>
        {editHref ? (
          <IconLink
            href={appHref(editHref)}
            aria-label="Edit profile"
            title="Edit profile"
          >
            <Pencil size={18} aria-hidden="true" />
          </IconLink>
        ) : null}
        {qrHref ? (
          <IconLink
            href={backendHref(qrHref)}
            target="_blank"
            rel="noreferrer"
            aria-label="Open QR code"
            title="Open QR code"
          >
            <QrCode size={18} aria-hidden="true" />
          </IconLink>
        ) : null}
      </div>
    </header>
  )
}

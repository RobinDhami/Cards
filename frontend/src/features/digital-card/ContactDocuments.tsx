import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Download from 'lucide-react/dist/esm/icons/download.js'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import FileText from 'lucide-react/dist/esm/icons/file-text.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import UserRound from 'lucide-react/dist/esm/icons/user-round.js'
import { backendHref } from '../../lib/api'
import { ProfileSection } from './ProfileSection'
import type { PublicStudent } from './types'

type ContactDocumentsProps = {
  profile: PublicStudent
  onOpenDetails: () => void
}

export function ContactDocuments({ profile, onOpenDetails }: ContactDocumentsProps) {
  return (
    <ProfileSection className="digital-card-documents" title="Documents">
      <div className="digital-card-rows">
        <a className="digital-card-row" href={backendHref(profile.actions.vcard)}>
          <span className="digital-card-row__icon"><FileText size={20} aria-hidden="true" /></span>
          <strong>Save contact<small>Download vCard</small></strong>
          <Download size={19} aria-hidden="true" />
        </a>
        {profile.actions.birthCertificate ? (
          <a className="digital-card-row" href={backendHref(profile.actions.birthCertificate)}>
            <span className="digital-card-row__icon digital-card-row__icon--gold"><ShieldCheck size={20} aria-hidden="true" /></span>
            <strong>Identity document<small>Authorized access</small></strong>
            <Eye size={19} aria-hidden="true" />
          </a>
        ) : null}
        <button className="digital-card-row" type="button" onClick={onOpenDetails}>
          <span className="digital-card-row__icon"><UserRound size={20} aria-hidden="true" /></span>
          <strong>View complete details<small>School, identity, and contact information</small></strong>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </ProfileSection>
  )
}

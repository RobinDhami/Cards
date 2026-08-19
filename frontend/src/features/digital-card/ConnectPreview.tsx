import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right.js'
import Users from 'lucide-react/dist/esm/icons/users.js'

export function ConnectPreview({ onPreview }: { onPreview: () => void }) {
  return (
    <button className="digital-card-row digital-card-connect" type="button" onClick={onPreview}>
      <span className="digital-card-row__icon"><Users size={20} aria-hidden="true" /></span>
      <strong>Connect with me<small>Tap to preview · connections coming soon</small></strong>
      <ChevronRight size={19} aria-hidden="true" />
    </button>
  )
}

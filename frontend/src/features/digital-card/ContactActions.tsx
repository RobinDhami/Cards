import Mail from 'lucide-react/dist/esm/icons/mail.js'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle.js'
import Phone from 'lucide-react/dist/esm/icons/phone.js'
import type { ReactNode } from 'react'
import { backendHref } from '../../lib/api'
import type { PublicStudent } from './types'

type ActionLinkProps = {
  href: string
  icon: ReactNode
  label: string
  tone: string
}

function ActionLink({ href, icon, label, tone }: ActionLinkProps) {
  if (!href) return null
  return (
    <a className={`digital-card-action digital-card-action--${tone}`} href={backendHref(href)}>
      <span aria-hidden="true">{icon}</span>
      <strong>{label}</strong>
    </a>
  )
}

export function ContactActions({ profile }: { profile: PublicStudent }) {
  return (
    <nav className="digital-card-actions" aria-label="Contact actions">
      <ActionLink href={profile.actions.phone} icon={<Phone size={20} />} label="Call" tone="call" />
      <ActionLink href={profile.actions.whatsapp} icon={<MessageCircle size={20} />} label="WhatsApp" tone="whatsapp" />
      <ActionLink href={profile.email ? `mailto:${profile.email}` : ''} icon={<Mail size={20} />} label="Email" tone="email" />
      <ActionLink href={profile.actions.map} icon={<MapPin size={20} />} label="Map" tone="map" />
    </nav>
  )
}

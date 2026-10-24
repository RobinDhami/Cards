import type { ComponentType, SVGProps } from 'react'
import { FaFacebookF, FaGlobe, FaGoogle, FaInstagram, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa6'
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js'
import Mail from 'lucide-react/dist/esm/icons/mail.js'

const icons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  facebook: FaFacebookF,
  google: FaGoogle,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  whatsapp: FaWhatsapp,
  website: FaGlobe,
  youtube: FaYoutube,
  email: Mail,
}

export const socialLabels: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google review link',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  website: 'Website',
  youtube: 'YouTube',
}

export function SocialIcon({ type, ...props }: { type: string } & SVGProps<SVGSVGElement>) {
  const Icon = icons[type] || ExternalLink
  return <Icon aria-hidden={props['aria-hidden'] ?? true} />
}
